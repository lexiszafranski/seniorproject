"""
MAIN API SERVER - MongoDB Version
- entry point that runs backend
- FastAPI creates the web server
- CORS allows frontend to talk to backend
- get_current_user() checks if someone is logged in before getting protected routes
- Routes
    / = basic check if server is running
    /api/me = returns logged-in user info (protected - needs login)
    /api/tokens = saves Canvas and Gemini tokens (protected)
    /api/onboarding-status = checks if user has completed onboarding (protected)
    /api/sync-courses = fetches user's Canvas courses and stores them (protected)
"""

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict
import os
import httpx
import uuid
import json
from datetime import datetime, timezone
from dotenv import load_dotenv
from bson import ObjectId
from database import get_or_create_user, update_user, users_collection, course_quizzes_collection, init_db, user_has_tokens
from clerk_auth import verify_clerk_token
from canvas_retriever import CanvasContentRetriever
from gemini_retriever import generate_quiz_from_files
from canvas_publisher import publish_quiz_to_canvas, publish_existing_canvas_quiz, unpublish_canvas_quiz, get_all_new_quizzes_for_course, delete_quiz_from_canvas
import markdown as md_lib
from encryption import encrypt, decrypt

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request models
class TokensRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    canvas_token: str = Field(alias="canvasToken")
    gemini_token: str = Field(alias="geminiToken")


async def verify_gemini_token(api_key: str) -> bool:
    """
    Verify Gemini API key by making a simple API call.
    Returns True if valid, raises exception if invalid.
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        
        if response.status_code == 200:
            return True
        elif response.status_code == 400:
            raise ValueError("Invalid Gemini API key format")
        elif response.status_code == 403:
            raise ValueError("Gemini API key is invalid or has been revoked")
        else:
            raise ValueError(f"Failed to verify Gemini API key: {response.status_code}")


class FileInfo(BaseModel):
    url: str
    display_name: str
    content_type: str = "application/pdf"

class GenerateQuizRequest(BaseModel):
    files: list[FileInfo]
    course_id: int | None = None
    quiz_ids: list[int] = []
    question_count: int = 5
    title: str = "Generated Practice Quiz"


async def get_current_user(authorization: str = Header(...)) -> dict:
    token = authorization.replace("Bearer ", "")
    clerk_data = await verify_clerk_token(token)
    
    user_data = {
        "email": clerk_data.get("email"),
        "first_name": clerk_data.get("first_name"),
        "last_name": clerk_data.get("last_name")
    }
    
    user = get_or_create_user(clerk_data.get("sub"), user_data)
    return user

@app.on_event("startup")
def startup():
    init_db()

@app.get("/")
async def root():
    return {"status": "running"}

@app.get("/api/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Returns logged-in user info including onboarding status"""
    return {
        "id": str(current_user["_id"]),
        "clerk_id": current_user["clerk_id"],
        "university_id": current_user.get("university_id"),
        "canvas_user_id": current_user.get("canvas_user_id"),
        "email": current_user.get("email"),
        "first_name": current_user.get("first_name"),
        "last_name": current_user.get("last_name"),
        "has_canvas_token": current_user.get("canvas_token") is not None,
        "has_gemini_token": current_user.get("gemini_token") is not None,
        "onboarding_complete": user_has_tokens(current_user)
    }


@app.post("/api/tokens")
async def save_tokens(
    tokens: TokensRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Save Canvas and Gemini tokens for user.
    Validates both tokens before saving.
    """
    
    # Verify Canvas token works by fetching courses
    try:
        canvas = CanvasContentRetriever(
            canvas_url="https://ufl.instructure.com",
            access_token=tokens.canvas_token
        )
        courses = canvas.get_courses()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid Canvas token: {str(e)}")
    
    # Verify Gemini API key
    try:
        await verify_gemini_token(tokens.gemini_token)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Encrypt and save tokens
    try:
        update_user(current_user["clerk_id"], {
            "canvas_token": encrypt(tokens.canvas_token),
            "gemini_token": encrypt(tokens.gemini_token)
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save tokens: {str(e)}")
    
    return {
        "message": "Tokens saved successfully",
        "onboarding_complete": True
    }


@app.get("/api/onboarding-status")
async def get_onboarding_status(current_user: dict = Depends(get_current_user)):
    """Check if user has completed onboarding (has both tokens)"""
    return {
        "has_canvas_token": current_user.get("canvas_token") is not None,
        "has_gemini_token": current_user.get("gemini_token") is not None,
        "onboarding_complete": user_has_tokens(current_user)
    }


"""
Fetches user's Canvas courses and returns: courses_synced (count) and courses list.
Each course has: id, name, course_code, enrollments (role + enrollment_state).
Note: frontend should only show courses where role is "TeacherEnrollment" on the dashboard, since "StudentEnrollment" users can't create or publish quizzes.

Example return:
{
  "courses_synced": 13,
  "courses":
  [
    {
      "id": 555100,
      "name": "CAI6108 - ML Engineering",
      "course_code": "CAI6108",
      "enrollments":
      [
        {
          "role": "StudentEnrollment",
          "enrollment_state": "active"
        }
      ]
    }
]
}
"""
@app.post("/api/sync-courses")
async def sync_courses(current_user: dict = Depends(get_current_user)):
    encrypted_canvas = current_user.get("canvas_token")
    canvas_token = decrypt(encrypted_canvas) if encrypted_canvas else os.getenv("CANVAS_TOKEN")
    if not canvas_token:
         raise HTTPException(status_code=400, detail="No Canvas token found. Please add your Canvas API token.")
    canvas = CanvasContentRetriever(
        canvas_url="https://ufl.instructure.com",
        access_token=canvas_token
    )

    try:
        courses = canvas.get_courses()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch courses from Canvas: {str(e)}")

    # Save courses to user's document in MongoDB
    update_user(current_user["clerk_id"], {"courses": courses})

    return {"courses_synced": len(courses), "courses": courses}


"""
Retrieves all quizzes for a given course from Canvas.
This function should be called every time an instructor tries to make a new quiz. If a quiz's metadata is not in MongoDB, a new Mongo document will be made for it at this point.
Example return:
{
  "quiz_count": 1,
  "quizzes":
  [
    {
      "id": 1582529,
      "title": "API TEST Mock Quiz",
      "description": "Practice quiz created via the Canvas API (safe to ignore).",
      "html_url": "https://ufl.instructure.com/courses/389226/quizzes/1582529",
      "question_count": 0,
      "points_possible": 0,
      "due_at": null,
      "published": false
    }
  ]
}
"""
@app.get("/api/courses/{course_id}/quizzes")
async def retrieve_quizzes(course_id: int, current_user: dict = Depends(get_current_user)):
    encrypted_canvas = current_user.get("canvas_token")
    canvas_token = decrypt(encrypted_canvas) if encrypted_canvas else os.getenv("CANVAS_TOKEN")
    if not canvas_token:
          raise HTTPException(status_code=400, detail="No Canvas token found. Please add your Canvas API token.")

    canvas = CanvasContentRetriever(
        canvas_url="https://ufl.instructure.com",
        access_token=canvas_token
    )

    try:
        quizzes = canvas.get_course_quizzes(course_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch quizzes from Canvas: {str(e)}")
    return {"quiz_count": len(quizzes), "quizzes": quizzes}


"""
Retrieves all files for a given course from Canvas.
Each file has: id, display_name, url (direct download), updated_at, size (bytes), mime_class, content-type.
Example return:
{
  "file_count": 1,
  "files": [
    {
      "id": 63265314,
      "folder_id": 6794316,
      "display_name": "0_Introduction_and_CourseOverview.pdf",
      "filename": "0_Introduction_and_CourseOverview.pdf",
      "content-type": "application/pdf",
      "url": "https://ufl.instructure.com/files/63265314/download?download_frd=1&verifier=th6QWGRXtjNiourZyexyOM2FX2n8lDFRmqNXYCy9",
      "size": 1887556,
      "created_at": "2021-01-12T22:15:59Z",
      "updated_at": "2021-10-20T16:41:21Z",
      "modified_at": "2021-01-12T22:15:59Z",
      "mime_class": "pdf"
    }
  ]
}
"""
@app.get("/api/courses/{course_id}/files")
async def retrieve_files(course_id: int, current_user: dict = Depends(get_current_user)):
    encrypted_canvas = current_user.get("canvas_token")
    canvas_token = decrypt(encrypted_canvas) if encrypted_canvas else os.getenv("CANVAS_TOKEN")
    if not canvas_token:
         raise HTTPException(status_code=400, detail="No Canvas token found. Please add your Canvas API token.")

    canvas = CanvasContentRetriever(
        canvas_url="https://ufl.instructure.com",
        access_token=canvas_token
    )

    try:
        files = canvas.get_course_files(course_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch files from Canvas: {str(e)}")

    return {"file_count": len(files), "files": files}


"""
Retrieves all questions for a given quiz from Canvas.
Each question has: id, question_name, question_text (HTML), question_type, points_possible, answers (with weight indicating correctness: 100 = correct, 0 = incorrect).
Example return:
{
  "question_count": 1,
  "questions": [
    {
      "id": 23919174,
      "question_name": "Question",
      "question_text": "<p>What is the computational complexity?</p>",
      "question_type": "multiple_choice_question",
      "points_possible": 1.0,
      "answers": [
        {"id": 8940, "text": "O(1)", "weight": 0},
        {"id": 5589, "text": "O(n^2)", "weight": 100}
      ]
    }
  ]
}
"""
@app.get("/api/courses/{course_id}/quizzes/{quiz_id}/questions")
async def retrieve_quiz_questions(course_id: int, quiz_id: int, current_user: dict = Depends(get_current_user)):
    encrypted_canvas = current_user.get("canvas_token")
    canvas_token = decrypt(encrypted_canvas) if encrypted_canvas else os.getenv("CANVAS_TOKEN")
    if not canvas_token:
         raise HTTPException(status_code=400, detail="No Canvas token found. Please add your Canvas API token.")

    canvas = CanvasContentRetriever(
        canvas_url="https://ufl.instructure.com",
        access_token=canvas_token
    )

    try:
        questions = canvas.get_quiz_questions(course_id, quiz_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch quiz questions from Canvas: {str(e)}")

    return {"question_count": len(questions), "questions": questions}


"""
Generates a practice quiz from a list of Canvas file URLs using Gemini.
Pass in files retrieved from /api/courses/{course_id}/files.
Returns 5 multiple-choice questions with options, answer, and rationale.
Example request body:
{
  "files": [
    {
      "url": "https://ufl.instructure.com/files/123/download?...",
      "display_name": "lecture1.pdf",
      "content_type": "application/pdf"
    }
  ]
}
"""
@app.post("/api/generate-quiz")
async def generate_quiz(body: GenerateQuizRequest, current_user: dict = Depends(get_current_user)):
    encrypted_canvas = current_user.get("canvas_token")
    canvas_token = decrypt(encrypted_canvas) if encrypted_canvas else os.getenv("CANVAS_TOKEN")
    if not canvas_token:
        raise HTTPException(status_code=400, detail="No Canvas token found. Please add your Canvas API token.")

    encrypted_gemini = current_user.get("gemini_token")
    gemini_token = decrypt(encrypted_gemini) if encrypted_gemini else os.getenv("GEMINI_KEY")
    if not gemini_token:
        raise HTTPException(status_code=400, detail="No Gemini API key found. Please add your Gemini API key.")
    files = [f.model_dump() for f in body.files]

    # Fetch questions from any previously selected quizzes
    previous_questions = []
    if body.course_id and body.quiz_ids:
        canvas = CanvasContentRetriever(
            canvas_url="https://ufl.instructure.com",
            access_token=canvas_token
        )
        for quiz_id in body.quiz_ids:
            try:
                questions = canvas.get_quiz_questions(body.course_id, quiz_id)
                previous_questions.extend(questions)
            except Exception as e:
                print(f"Warning: could not fetch questions for quiz {quiz_id}: {e}")

    try:
        quiz = generate_quiz_from_files(files, canvas_token, gemini_token, previous_questions, body.question_count)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    print("\n--- GENERATED QUIZ ---")
    print(json.dumps(quiz, indent=2))
    print("----------------------\n")

    # Build internal MongoDB document from Gemini output
    now = datetime.now(timezone.utc)
    questions = []
    for i, q in enumerate(quiz.get("questions", []), start=1):
        question_id = str(uuid.uuid4())
        choices = []
        for j, c in enumerate(q.get("choices", []), start=1):
            choices.append({
                "internal_choice_id": str(uuid.uuid4()),
                "position": j,
                "text_html": md_lib.markdown(c['text']),
                "is_correct": c.get("is_correct", False)
            })
        questions.append({
            "internal_question_id": question_id,
            "canvas_item_id": None,
            "type": "multiple_choice",
            "position": i,
            "points_possible": 1,
            "question_stem_html": md_lib.markdown(q['question_stem']),
            "overall_rationale_html": md_lib.markdown(q.get('rationale', '')),
            "choices": choices,
            "publish_error": None
        })

    quiz_doc = {
        "clerk_id": current_user["clerk_id"],
        "course_id": body.course_id,
        "assignment_id": None,
        "new_quiz_id": None,
        "title": body.title,
        "description_html": "",
        "question_count": len(questions),
        "questions": questions,
        "status": "generated_pending_review",
        "created_at": now,
        "updated_at": now,
        "generation_metadata": {
            "source_file_display_names": [f["display_name"] for f in files],
            "source_prev_quiz_ids": body.quiz_ids,
            "gemini_model_used": "gemini-2.5-flash"
        },
        "publish_metadata": {
            "published_at": None,
            "last_error": None
        }
    }

    result = course_quizzes_collection.insert_one(quiz_doc)
    print(f"Saved quiz to MongoDB with id: {result.inserted_id}")

    return {"quiz_id": str(result.inserted_id), "questions": questions}


@app.get("/api/courses/{course_id}/assessly-quizzes")
async def get_assessly_quizzes(course_id: int, current_user: dict = Depends(get_current_user)):
    encrypted_canvas = current_user.get("canvas_token")
    canvas_token = decrypt(encrypted_canvas) if encrypted_canvas else os.getenv("CANVAS_TOKEN")

    docs = list(course_quizzes_collection.find(
        {"clerk_id": current_user["clerk_id"], "course_id": course_id},
        {"_id": 1, "title": 1, "status": 1, "question_count": 1, "created_at": 1, "new_quiz_id": 1}
    ))

    sync_warning = False
    if canvas_token:
        published_docs = [d for d in docs if d.get("status") in ("published_on_canvas", "saved_to_canvas") and d.get("new_quiz_id")]
        if published_docs:
            try:
                canvas_quizzes = get_all_new_quizzes_for_course(course_id, canvas_token)
                for doc in published_docs:
                    quiz_id_str = str(doc["new_quiz_id"])
                    if quiz_id_str not in canvas_quizzes:
                        # Quiz was deleted from Canvas — revert to draft
                        course_quizzes_collection.update_one(
                            {"_id": doc["_id"]},
                            {"$set": {
                                "status": "generated_pending_review",
                                "new_quiz_id": None,
                                "assignment_id": None,
                                "updated_at": datetime.now(timezone.utc)
                            }}
                        )
                        doc["status"] = "generated_pending_review"
                        doc["new_quiz_id"] = None
                    else:
                        canvas_info = canvas_quizzes[quiz_id_str]
                        updates = {}

                        # Sync title if changed on Canvas
                        canvas_title = canvas_info["title"]
                        if canvas_title and canvas_title != doc.get("title"):
                            updates["title"] = canvas_title
                            doc["title"] = canvas_title

                        # Sync published state if changed on Canvas
                        canvas_published = canvas_info["published"]
                        if canvas_published and doc.get("status") == "saved_to_canvas":
                            updates["status"] = "published_on_canvas"
                            doc["status"] = "published_on_canvas"
                        elif not canvas_published and doc.get("status") == "published_on_canvas":
                            updates["status"] = "saved_to_canvas"
                            doc["status"] = "saved_to_canvas"

                        if updates:
                            updates["updated_at"] = datetime.now(timezone.utc)
                            course_quizzes_collection.update_one({"_id": doc["_id"]}, {"$set": updates})
            except RuntimeError:
                sync_warning = True

    for doc in docs:
        doc["_id"] = str(doc["_id"])
        doc.pop("new_quiz_id", None)
    return {"quizzes": docs, "sync_warning": sync_warning}


@app.get("/api/quizzes/{quiz_id}")
async def get_quiz(quiz_id: str, current_user: dict = Depends(get_current_user)):
    try:
        quiz_doc = course_quizzes_collection.find_one({
            "_id": ObjectId(quiz_id),
            "clerk_id": current_user["clerk_id"]
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid quiz id.")

    if not quiz_doc:
        raise HTTPException(status_code=404, detail="Quiz not found.")

    quiz_doc["_id"] = str(quiz_doc["_id"])
    return quiz_doc


@app.post("/api/quizzes/{quiz_id}/save-to-canvas")
async def save_to_canvas(quiz_id: str, current_user: dict = Depends(get_current_user)):
    """Save quiz to Canvas as an unpublished draft. Status → saved_to_canvas."""
    encrypted_canvas = current_user.get("canvas_token")
    canvas_token = decrypt(encrypted_canvas) if encrypted_canvas else os.getenv("CANVAS_TOKEN")
    if not canvas_token:
        raise HTTPException(status_code=400, detail="No Canvas token found.")

    try:
        quiz_doc = course_quizzes_collection.find_one({"_id": ObjectId(quiz_id), "clerk_id": current_user["clerk_id"]})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid quiz id.")
    if not quiz_doc:
        raise HTTPException(status_code=404, detail="Quiz not found.")
    if quiz_doc["status"] in ("saved_to_canvas", "published_on_canvas"):
        raise HTTPException(status_code=400, detail="Quiz is already on Canvas.")

    try:
        result = publish_quiz_to_canvas(quiz_doc, canvas_token, publish=False)
    except RuntimeError as e:
        course_quizzes_collection.update_one(
            {"_id": ObjectId(quiz_id)},
            {"$set": {"status": "publish_failed", "publish_metadata.last_error": str(e), "updated_at": datetime.now(timezone.utc)}}
        )
        raise HTTPException(status_code=502, detail=str(e))

    now = datetime.now(timezone.utc)
    question_updates = {f"questions.{i}.canvas_item_id": q["canvas_item_id"] for i, q in enumerate(result["questions"])}
    course_quizzes_collection.update_one(
        {"_id": ObjectId(quiz_id)},
        {"$set": {
            "status": "saved_to_canvas",
            "new_quiz_id": result["new_quiz_id"],
            "assignment_id": result["assignment_id"],
            "publish_metadata.last_error": None,
            "updated_at": now,
            **question_updates
        }}
    )
    return {"quiz_id": quiz_id, "new_quiz_id": result["new_quiz_id"]}


@app.post("/api/quizzes/{quiz_id}/publish")
async def publish_quiz(quiz_id: str, current_user: dict = Depends(get_current_user)):
    encrypted_canvas = current_user.get("canvas_token")
    canvas_token = decrypt(encrypted_canvas) if encrypted_canvas else os.getenv("CANVAS_TOKEN")
    if not canvas_token:
        raise HTTPException(status_code=400, detail="No Canvas token found.")

    try:
        quiz_doc = course_quizzes_collection.find_one({"_id": ObjectId(quiz_id), "clerk_id": current_user["clerk_id"]})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid quiz id.")
    if not quiz_doc:
        raise HTTPException(status_code=404, detail="Quiz not found.")
    if quiz_doc["status"] == "published_on_canvas":
        raise HTTPException(status_code=400, detail="Quiz is already published.")

    existing_canvas_id = quiz_doc.get("new_quiz_id")

    try:
        if existing_canvas_id:
            # Quiz was already saved to Canvas as a draft — just publish it in place, don't recreate it
            publish_existing_canvas_quiz(quiz_doc["course_id"], str(existing_canvas_id), canvas_token)
            new_quiz_id = existing_canvas_id
            assignment_id = quiz_doc.get("assignment_id", existing_canvas_id)
            question_updates = {}
        else:
            # Quiz has never been sent to Canvas — create it and publish in one shot
            publish_result = publish_quiz_to_canvas(quiz_doc, canvas_token, publish=True)
            new_quiz_id = publish_result["new_quiz_id"]
            assignment_id = publish_result["assignment_id"]
            question_updates = {f"questions.{i}.canvas_item_id": q["canvas_item_id"] for i, q in enumerate(publish_result["questions"])}
    except RuntimeError as e:
        course_quizzes_collection.update_one(
            {"_id": ObjectId(quiz_id)},
            {"$set": {"status": "publish_failed", "publish_metadata.last_error": str(e), "updated_at": datetime.now(timezone.utc)}}
        )
        raise HTTPException(status_code=502, detail=str(e))

    now = datetime.now(timezone.utc)
    course_quizzes_collection.update_one(
        {"_id": ObjectId(quiz_id)},
        {"$set": {
            "status": "published_on_canvas",
            "new_quiz_id": new_quiz_id,
            "assignment_id": assignment_id,
            "publish_metadata.published_at": now,
            "publish_metadata.last_error": None,
            "updated_at": now,
            **question_updates
        }}
    )
    return {"quiz_id": quiz_id, "new_quiz_id": new_quiz_id, "assignment_id": assignment_id}


@app.delete("/api/quizzes/{quiz_id}")
async def delete_quiz(quiz_id: str, current_user: dict = Depends(get_current_user)):
    """
    Delete a quiz from MongoDB and, if it exists on Canvas, from Canvas too.
    """
    try:
        quiz = course_quizzes_collection.find_one({"_id": ObjectId(quiz_id), "clerk_id": current_user["clerk_id"]})
    except Exception:
        # ObjectId() throws if quiz_id is malformed (wrong format) — that's a bad request, not a missing resource
        raise HTTPException(status_code=400, detail="Invalid quiz ID.")

    # ObjectId was valid but no document matched — the quiz genuinely doesn't exist
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found.")

    # Delete from Canvas if it was published/saved there
    new_quiz_id = quiz.get("new_quiz_id")
    course_id = quiz.get("course_id")
    if new_quiz_id and course_id:
        canvas_token = current_user.get("canvas_token")
        if canvas_token:
            canvas_token = decrypt(canvas_token)
        if not canvas_token:
            raise HTTPException(status_code=400, detail="No Canvas token found.")
        try:
            delete_quiz_from_canvas(course_id, str(new_quiz_id), canvas_token)
        except RuntimeError as e:
            raise HTTPException(status_code=502, detail=str(e))

    course_quizzes_collection.delete_one({"_id": ObjectId(quiz_id)})
    return {"deleted": True}


@app.post("/api/quizzes/{quiz_id}/revert-to-draft")
async def revert_to_draft(quiz_id: str, current_user: dict = Depends(get_current_user)):
    """
    Remove a quiz from Canvas (delete it there) but keep it in MongoDB as a draft.
    Only valid for quizzes with status saved_to_canvas.
    """
    try:
        quiz = course_quizzes_collection.find_one({"_id": ObjectId(quiz_id), "clerk_id": current_user["clerk_id"]})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid quiz ID.")
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found.")
    if quiz["status"] not in ("saved_to_canvas", "published_on_canvas"):
        raise HTTPException(status_code=400, detail="Only quizzes on Canvas can be reverted to draft.")

    new_quiz_id = quiz.get("new_quiz_id")
    course_id = quiz.get("course_id")
    if new_quiz_id and course_id:
        canvas_token = current_user.get("canvas_token")
        if canvas_token:
            canvas_token = decrypt(canvas_token)
        if not canvas_token:
            raise HTTPException(status_code=400, detail="No Canvas token found.")
        try:
            delete_quiz_from_canvas(course_id, str(new_quiz_id), canvas_token)
        except RuntimeError as e:
            raise HTTPException(status_code=502, detail=str(e))

    # Clear all Canvas IDs and reset status to draft
    question_clear = {f"questions.{i}.canvas_item_id": None for i in range(len(quiz.get("questions", [])))}
    course_quizzes_collection.update_one(
        {"_id": ObjectId(quiz_id)},
        {"$set": {
            "status": "generated_pending_review",
            "new_quiz_id": None,
            "assignment_id": None,
            "updated_at": datetime.now(timezone.utc),
            **question_clear
        }}
    )
    return {"reverted": True}


@app.post("/api/quizzes/{quiz_id}/unpublish")
async def unpublish_quiz(quiz_id: str, current_user: dict = Depends(get_current_user)):
    """
    Unpublish a quiz on Canvas (sets published=False), keeping it there as a saved draft.
    Status → saved_to_canvas.
    """
    try:
        quiz = course_quizzes_collection.find_one({"_id": ObjectId(quiz_id), "clerk_id": current_user["clerk_id"]})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid quiz ID.")
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found.")
    if quiz["status"] != "published_on_canvas":
        raise HTTPException(status_code=400, detail="Only published quizzes can be unpublished.")

    new_quiz_id = quiz.get("new_quiz_id")
    course_id = quiz.get("course_id")
    if not new_quiz_id or not course_id:
        raise HTTPException(status_code=400, detail="Quiz is missing Canvas IDs.")

    canvas_token = current_user.get("canvas_token")
    if canvas_token:
        canvas_token = decrypt(canvas_token)
    if not canvas_token:
        raise HTTPException(status_code=400, detail="No Canvas token found.")

    try:
        unpublish_canvas_quiz(course_id, str(new_quiz_id), canvas_token)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    course_quizzes_collection.update_one(
        {"_id": ObjectId(quiz_id)},
        {"$set": {"status": "saved_to_canvas", "updated_at": datetime.now(timezone.utc)}}
    )
    return {"unpublished": True}