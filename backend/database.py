"""
DATABASE SETUP
- Uses SQLite (creates a simple file called app.db - no setup needed for now)
- SQLAlchemy is the library that talks to the database
- User table stores:
    - id: auto-incrementing number (1, 2, 3...)
    - clerk_id: the ID from Clerk (links to their auth system)
    - created_at: when user first logged in
- get_db(): creates a connection for each request, closes when done
- init_db(): creates the tables when server starts
"""

from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    clerk_id = Column(String(255), unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)