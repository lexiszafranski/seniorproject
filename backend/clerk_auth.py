"""
CLERK TOKEN VERIFICATION
- When user logs in on frontend, Clerk gives them a JWT token
- Frontend sends that token to backend with every request
- This file decodes that token to get the user's ID
- JWT tokens have 3 parts separated by dots: header.payload.signature
- Decode the payload  to get user info, can only be tested once frontend doneso
"""

import os
import base64
import json
from dotenv import load_dotenv

load_dotenv()

CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")


async def verify_clerk_token(token: str) -> str:
    if not CLERK_SECRET_KEY:
        raise ValueError("CLERK_SECRET_KEY not in .env")
    
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Invalid token")
    
    payload = parts[1]
    payload += "=" * (4 - len(payload) % 4)
    decoded = base64.urlsafe_b64decode(payload)
    data = json.loads(decoded)
    
    return data.get("sub")