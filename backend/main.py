"""
MAIN API SERVER
- entry point that runs backend
- FastAPI creates the web server
- CORS allows frontend to talk to backend
- On startup, creates the database tables
- get_current_user() checks if someone is logged in before gettin protected routes
- Routes:
    / = basic check if server is running
    /api/me = returns logged-in user info (protected - needs login)
    /api/sync-courses = fetches user's Canvas courses and stores them (protected)
"""

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from database import get_db, User, init_db
from sqlalchemy.orm import Session
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

@app.on_event("startup")
def startup():
    init_db()


async def get_current_user(
    authorization: str = Header(...),
    db: Session = Depends(get_db)
) -> User:
    token = authorization.replace("Bearer ", "")
    clerk_user_id = await verify_clerk_token(token)
    user = db.query(User).filter(User.clerk_id == clerk_user_id).first()
    if not user:
        user = User(clerk_id=clerk_user_id)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


@app.get("/")
async def root():
    return {"status": "running"}


@app.get("/api/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "clerk_id": current_user.clerk_id}


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
async def sync_courses(current_user: User = Depends(get_current_user)):
    # TODO: retrieve canvas_token from user's record in MongoDB once set up
    canvas_token = "PLACEHOLDER"
    if not canvas_token:
        raise HTTPException(status_code=400, detail="No Canvas token found for user. Please add your Canvas API token.")

    canvas = CanvasContentRetriever(
        canvas_url="https://ufl.instructure.com",
        access_token=canvas_token)

    try:
        courses = canvas.get_courses()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch courses from Canvas: {str(e)}")

    # TODO: save courses list to user's document in MongoDB
    # something like: db.users.update_one({"clerk_id": current_user.clerk_id}, {"$set": {"courses": courses}})

    return {"courses_synced": len(courses), "courses": courses}