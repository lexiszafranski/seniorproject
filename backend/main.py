"""
MAIN API SERVER
- entry point that runs  backend
- FastAPI creates the web server
- CORS allows frontend to talk to backend
- On startup, creates the database tables
- get_current_user() checks if someone is logged in before gettin protected routes
- Routes:
    / = basic check if server is running
    /api/me = returns logged-in user info (protected - needs login)
"""

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from database import get_db, User, init_db
from sqlalchemy.orm import Session
from clerk_auth import verify_clerk_token

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