"""
DATABASE SETUP - MongoDB
- Uses MongoDB Atlas
- pymongo is the library that talks to MongoDB
- Users collection stores:
    - _id: auto-generated MongoDB ObjectId
    - clerk_id: the ID from Clerk (links to their auth system)
    - created_at: when user first logged in
    - canvas_token: user's Canvas API token (optional)
    - courses: list of synced Canvas courses (optional)
- get_db(): returns the database instance
"""

from pymongo import MongoClient
from datetime import datetime
import os
import certifi
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "quiz_generator")

client = MongoClient(
    MONGODB_URI,
    tls=True,
    tlsCAFile=certifi.where(),
    serverSelectionTimeoutMS=5000
)

db = client[DB_NAME]

# collections
users_collection = db["users"]


def init_db():
    """Create indexes - call this after server starts"""
    try:
        users_collection.create_index("clerk_id", unique=True)
    except Exception as e:
        print(f"Index creation error (may already exist): {e}")


def get_db():
    return db


def get_or_create_user(clerk_id: str, user_data: dict = None) -> dict:
    user = users_collection.find_one({"clerk_id": clerk_id})
    
    if not user:
        user = {
            "clerk_id": clerk_id,
            "email": user_data.get("email") if user_data else None,
            "first_name": user_data.get("first_name") if user_data else None,
            "last_name": user_data.get("last_name") if user_data else None,
            "created_at": datetime.utcnow(),
            "canvas_token": None,
            "courses": []
        }
        result = users_collection.insert_one(user)
        user["_id"] = result.inserted_id
    elif user_data:
        users_collection.update_one(
            {"clerk_id": clerk_id},
            {"$set": {
                "email": user_data.get("email"),
                "first_name": user_data.get("first_name"),
                "last_name": user_data.get("last_name")
            }}
        )
        user = users_collection.find_one({"clerk_id": clerk_id})
    
    return user


def update_user(clerk_id: str, update_data: dict):
    users_collection.update_one(
        {"clerk_id": clerk_id},
        {"$set": update_data}
    )