"""
Unit tests for encrypt and decrypt functions in encryption.py
"""
import pytest
import os
from cryptography.fernet import Fernet
from unittest.mock import patch
from encryption import encrypt, decrypt


VALID_KEY = Fernet.generate_key().decode()


def test_encrypt_decrypt_roundtrip():
    with patch.dict(os.environ, {"ENCRYPTION_KEY": VALID_KEY}):
        original = "my_secret_token"
        assert decrypt(encrypt(original)) == original


def test_decrypt_tampered_ciphertext_raises():
    with patch.dict(os.environ, {"ENCRYPTION_KEY": VALID_KEY}):
        with pytest.raises(Exception):
            decrypt("this-is-not-a-valid-ciphertext")


def test_missing_encryption_key_raises():
    with patch.dict(os.environ, {}, clear=True):
        with pytest.raises(RuntimeError, match="ENCRYPTION_KEY not set in environment"):
            encrypt("anything")
