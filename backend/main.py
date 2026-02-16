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