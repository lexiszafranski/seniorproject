"""
CLERK TOKEN VERIFICATION
- Decodes JWT token to get user ID
- Fetches full user info from Clerk API
"""

import os
import base64
import json
import httpx
from dotenv import load_dotenv

load_dotenv()

CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")


async def verify_clerk_token(token: str) -> dict:
    if not CLERK_SECRET_KEY:
        raise ValueError("CLERK_SECRET_KEY not in .env")
    
    # Decode token to get user ID
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Invalid token")
    
    payload = parts[1]
    payload += "=" * (4 - len(payload) % 4)
    decoded = base64.urlsafe_b64decode(payload)
    data = json.loads(decoded)
    
    user_id = data.get("sub")
    
    # Fetch full user info from Clerk API
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.clerk.com/v1/users/{user_id}",
            headers={
                "Authorization": f"Bearer {CLERK_SECRET_KEY}",
                "Content-Type": "application/json"
            }
        )
        
        if response.status_code == 200:
            clerk_user = response.json()
            return {
                "sub": user_id,
                "email": clerk_user.get("email_addresses", [{}])[0].get("email_address"),
                "first_name": clerk_user.get("first_name"),
                "last_name": clerk_user.get("last_name")
            }
        else:
            # Fallback to just the user ID
            return {"sub": user_id, "email": None, "first_name": None, "last_name": None}