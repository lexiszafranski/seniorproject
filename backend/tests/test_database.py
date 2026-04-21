import pytest
from database import user_has_tokens

"""
Unit tests for the user_has_tokens function in database.py
"""
def test_user_has_tokens_both_present():
    user = {"canvas_token": "enc_canvas_abc", "gemini_token": "enc_gemini_xyz"}
    assert user_has_tokens(user) is True


def test_user_has_tokens_missing_gemini():
    user = {"canvas_token": "enc_canvas_abc", "gemini_token": None}
    assert user_has_tokens(user) is False


def test_user_has_tokens_both_missing():
    user = {"canvas_token": None, "gemini_token": None}
    assert user_has_tokens(user) is False
