"""
Unit and integration tests for generate_quiz_from_files in gemini_retriever.py
"""
import pytest
import json
import os
from unittest.mock import patch, MagicMock
from gemini_retriever import generate_quiz_from_files


VALID_FILES = [
    {"url": "http://canvas/files/1/download", "display_name": "notes.pdf", "content_type": "application/pdf"}
]

VALID_QUIZ_RESPONSE = json.dumps({
    "questions": [
        {
            "question_stem": "What is X?",
            "choices": [
                {"text": "A", "is_correct": False},
                {"text": "B", "is_correct": True},
                {"text": "C", "is_correct": False},
                {"text": "D", "is_correct": False},
            ],
            "rationale": "B is correct because..."
        }
    ]
})


def make_mock_gemini_client(response_text=VALID_QUIZ_RESPONSE):
    mock_upload = MagicMock()
    mock_upload.name = "files/fake123"

    mock_gemini_response = MagicMock()
    mock_gemini_response.text = response_text

    mock_client = MagicMock()
    mock_client.files.upload.return_value = mock_upload
    mock_client.models.generate_content.return_value = mock_gemini_response
    mock_client.files.delete.return_value = None

    return mock_client


def make_mock_http_response(status_code=200, content=b"PDF file bytes"):
    mock_resp = MagicMock()
    mock_resp.status_code = status_code
    mock_resp.content = content
    return mock_resp


# --- Unit Tests ---

def test_empty_files_raises_value_error():
    with pytest.raises(ValueError, match="At least one file is required"):
        generate_quiz_from_files([], canvas_token="fake", gemini_token="fake_key")


def test_missing_gemini_key_raises_value_error():
    with patch.dict(os.environ, {}, clear=True):
        with pytest.raises(ValueError, match="No Gemini API key provided"):
            generate_quiz_from_files(VALID_FILES, canvas_token="fake", gemini_token=None)


def test_file_missing_url_raises_value_error():
    files = [{"display_name": "notes.pdf", "content_type": "application/pdf"}]
    mock_client = make_mock_gemini_client()
    mock_http = make_mock_http_response()

    with patch("gemini_retriever.genai.Client", return_value=mock_client):
        with patch("httpx.Client") as mock_httpx:
            mock_httpx.return_value.__enter__.return_value.get.return_value = mock_http
            with pytest.raises(ValueError, match="missing a 'url'"):
                generate_quiz_from_files(files, canvas_token="fake", gemini_token="fake_key")


def test_prompt_reflects_custom_question_count():
    mock_client = make_mock_gemini_client()
    mock_http = make_mock_http_response()

    with patch("gemini_retriever.genai.Client", return_value=mock_client):
        with patch("httpx.Client") as mock_httpx:
            mock_httpx.return_value.__enter__.return_value.get.return_value = mock_http
            generate_quiz_from_files(VALID_FILES, canvas_token="fake", gemini_token="fake_key", question_count=10)

    call_args = mock_client.models.generate_content.call_args
    contents = call_args[1]["contents"]
    prompt = contents[-1]
    assert "exactly 10" in prompt


# --- Integration Tests ---

def test_successful_quiz_generation_returns_questions():
    mock_client = make_mock_gemini_client()
    mock_http = make_mock_http_response()

    with patch("gemini_retriever.genai.Client", return_value=mock_client):
        with patch("httpx.Client") as mock_httpx:
            mock_httpx.return_value.__enter__.return_value.get.return_value = mock_http
            result = generate_quiz_from_files(VALID_FILES, canvas_token="fake", gemini_token="fake_key")

    assert "questions" in result
    assert isinstance(result["questions"], list)


def test_canvas_download_failure_raises_runtime_error():
    mock_client = make_mock_gemini_client()
    mock_http = make_mock_http_response(status_code=403)

    with patch("gemini_retriever.genai.Client", return_value=mock_client):
        with patch("httpx.Client") as mock_httpx:
            mock_httpx.return_value.__enter__.return_value.get.return_value = mock_http
            with pytest.raises(RuntimeError, match="Failed to download"):
                generate_quiz_from_files(VALID_FILES, canvas_token="fake", gemini_token="fake_key")


def test_gemini_upload_failure_raises_runtime_error():
    mock_client = make_mock_gemini_client()
    mock_client.files.upload.side_effect = Exception("Upload failed")
    mock_http = make_mock_http_response()

    with patch("gemini_retriever.genai.Client", return_value=mock_client):
        with patch("httpx.Client") as mock_httpx:
            mock_httpx.return_value.__enter__.return_value.get.return_value = mock_http
            with pytest.raises(RuntimeError, match="Failed to upload"):
                generate_quiz_from_files(VALID_FILES, canvas_token="fake", gemini_token="fake_key")


def test_gemini_invalid_json_response_raises_runtime_error():
    mock_client = make_mock_gemini_client(response_text="this is not json")
    mock_http = make_mock_http_response()

    with patch("gemini_retriever.genai.Client", return_value=mock_client):
        with patch("httpx.Client") as mock_httpx:
            mock_httpx.return_value.__enter__.return_value.get.return_value = mock_http
            with pytest.raises(RuntimeError, match="Gemini returned invalid JSON"):
                generate_quiz_from_files(VALID_FILES, canvas_token="fake", gemini_token="fake_key")


def test_gemini_missing_questions_field_raises_runtime_error():
    mock_client = make_mock_gemini_client(response_text=json.dumps({"wrong_key": []}))
    mock_http = make_mock_http_response()

    with patch("gemini_retriever.genai.Client", return_value=mock_client):
        with patch("httpx.Client") as mock_httpx:
            mock_httpx.return_value.__enter__.return_value.get.return_value = mock_http
            with pytest.raises(RuntimeError, match="missing the 'questions' field"):
                generate_quiz_from_files(VALID_FILES, canvas_token="fake", gemini_token="fake_key")


def test_gemini_markdown_fences_stripped_and_parsed():
    fenced = "```json\n" + VALID_QUIZ_RESPONSE + "\n```"
    mock_client = make_mock_gemini_client(response_text=fenced)
    mock_http = make_mock_http_response()

    with patch("gemini_retriever.genai.Client", return_value=mock_client):
        with patch("httpx.Client") as mock_httpx:
            mock_httpx.return_value.__enter__.return_value.get.return_value = mock_http
            result = generate_quiz_from_files(VALID_FILES, canvas_token="fake", gemini_token="fake_key")

    assert "questions" in result


def test_uploaded_files_deleted_after_generation():
    mock_client = make_mock_gemini_client()
    mock_http = make_mock_http_response()

    with patch("gemini_retriever.genai.Client", return_value=mock_client):
        with patch("httpx.Client") as mock_httpx:
            mock_httpx.return_value.__enter__.return_value.get.return_value = mock_http
            generate_quiz_from_files(VALID_FILES, canvas_token="fake", gemini_token="fake_key")

    mock_client.files.delete.assert_called_once_with(name="files/fake123")


def test_uploaded_files_deleted_even_on_failure():
    mock_client = make_mock_gemini_client(response_text="bad json")
    mock_http = make_mock_http_response()

    with patch("gemini_retriever.genai.Client", return_value=mock_client):
        with patch("httpx.Client") as mock_httpx:
            mock_httpx.return_value.__enter__.return_value.get.return_value = mock_http
            with pytest.raises(RuntimeError):
                generate_quiz_from_files(VALID_FILES, canvas_token="fake", gemini_token="fake_key")

    mock_client.files.delete.assert_called_once_with(name="files/fake123")


def test_previous_questions_appended_to_prompt():
    mock_client = make_mock_gemini_client()
    mock_http = make_mock_http_response()
    prev_questions = [{"question_stem": "Old Q?", "choices": []}]

    with patch("gemini_retriever.genai.Client", return_value=mock_client):
        with patch("httpx.Client") as mock_httpx:
            mock_httpx.return_value.__enter__.return_value.get.return_value = mock_http
            generate_quiz_from_files(VALID_FILES, canvas_token="fake", gemini_token="fake_key", previous_questions=prev_questions)

    call_args = mock_client.models.generate_content.call_args
    prompt = call_args[1]["contents"][-1]
    assert "Old Q?" in prompt