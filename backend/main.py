"""
MAIN API SERVER - MongoDB Version
- entry point that runs backend
- FastAPI creates the web server
- CORS allows frontend to talk to backend
- get_current_user() checks if someone is logged in before getting protected routes
- Routes
    / = basic check if server is running
    /api/me = returns logged-in user info (protected - needs login)
    /api/sync-courses = fetches user's Canvas courses and stores them (protected)
"""

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from database import get_or_create_user, update_user, users_collection
from clerk_auth import verify_clerk_token
from canvas_retriever import CanvasContentRetriever

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def get_current_user(authorization: str = Header(...)) -> dict:
    token = authorization.replace("Bearer ", "")
    clerk_user_id = await verify_clerk_token(token)
    user = get_or_create_user(clerk_user_id)
    return user


@app.get("/")
async def root():
    return {"status": "running"}

@app.get("/api/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": str(current_user["_id"]),
        "clerk_id": current_user["clerk_id"]
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
    # Try to get canvas_token from user's record, fallback to env
    canvas_token = current_user.get("canvas_token") or os.getenv("CANVAS_TOKEN")
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
Each quiz has: id, title, description (HTML), html_url, question_count, points_possible, due_at, published.
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
    canvas_token = current_user.get("canvas_token") or os.getenv("CANVAS_TOKEN")
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
    canvas_token = current_user.get("canvas_token") or os.getenv("CANVAS_TOKEN")
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
async def retrieve_quiz_questions(course_id: int, quiz_id: int):
    # canvas_token = current_user.get("canvas_token") or os.getenv("CANVAS_TOKEN")
    canvas_token = os.getenv("CANVAS_TOKEN")
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