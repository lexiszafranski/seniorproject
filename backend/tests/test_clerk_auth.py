"""
Unit tests for JWT decoding logic in clerk_auth.py
"""
import pytest
import base64
import json
import os
from unittest.mock import AsyncMock, MagicMock, patch


def make_fake_jwt(payload: dict) -> str:
    encoded = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    return f"fakeheader.{encoded}.fakesignature"


@pytest.mark.asyncio
async def test_valid_token_extracts_correct_user_id():
    fake_token = make_fake_jwt({"sub": "user_test_123"})
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "email_addresses": [{"email_address": "test@example.com"}],
        "first_name": "Test",
        "last_name": "User"
    }
    mock_client = AsyncMock()
    mock_client.get.return_value = mock_response

    with patch.dict(os.environ, {"CLERK_SECRET_KEY": "test_key"}):
        with patch("clerk_auth.CLERK_SECRET_KEY", "test_key"):
            with patch("httpx.AsyncClient") as mock_async_client:
                mock_async_client.return_value.__aenter__.return_value = mock_client
                from clerk_auth import verify_clerk_token
                result = await verify_clerk_token(fake_token)

    assert result["sub"] == "user_test_123"
    assert result["email"] == "test@example.com"


@pytest.mark.asyncio
async def test_malformed_token_raises_value_error():
    with patch.dict(os.environ, {"CLERK_SECRET_KEY": "test_key"}):
        with patch("clerk_auth.CLERK_SECRET_KEY", "test_key"):
            from clerk_auth import verify_clerk_token
            with pytest.raises(ValueError, match="Invalid token"):
                await verify_clerk_token("onlytwoparts.here")
