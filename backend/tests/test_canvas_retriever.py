"""
Unit, integration, and system tests for canvas_retriever.py
"""
import pytest
import hashlib
from unittest.mock import patch, MagicMock
from canvas_retriever import CanvasContentRetriever


BASE_URL = "https://ufl.instructure.com"

def make_retriever():
    return CanvasContentRetriever(canvas_url=BASE_URL, access_token="fake_token")


def mock_response(ok=True, json_data=None, status_code=200, links=None):
    m = MagicMock()
    m.ok = ok
    m.status_code = status_code
    m.json.return_value = json_data if json_data is not None else []
    m.content = b"fake file content"
    m.links = links if links is not None else {}
    if not ok:
        m.raise_for_status.side_effect = Exception(f"HTTP {status_code}")
    else:
        m.raise_for_status.return_value = None
    return m


# --- Unit Tests ---

def test_get_file_hash_returns_correct_sha256():
    retriever = make_retriever()
    content = b"hello world"
    expected = hashlib.sha256(b"hello world").hexdigest()
    assert retriever.get_file_hash(content) == expected


def test_get_file_hash_different_content_returns_different_hash():
    retriever = make_retriever()
    assert retriever.get_file_hash(b"abc") != retriever.get_file_hash(b"xyz")


def test_get_courses_filters_out_student_enrollment():
    retriever = make_retriever()
    raw_courses = [
        {"id": 1, "name": "Course A", "course_code": "A", "enrollments": [{"role": "TeacherEnrollment", "enrollment_state": "active"}]},
        {"id": 2, "name": "Course B", "course_code": "B", "enrollments": [{"role": "StudentEnrollment", "enrollment_state": "active"}]},
    ]
    with patch("requests.get", return_value=mock_response(json_data=raw_courses)):
        result = retriever.get_courses()
    assert len(result) == 1
    assert result[0]["id"] == 1


def test_get_courses_includes_ta_and_designer_enrollment():
    retriever = make_retriever()
    raw_courses = [
        {"id": 1, "name": "Course A", "course_code": "A", "enrollments": [{"role": "TaEnrollment", "enrollment_state": "active"}]},
        {"id": 2, "name": "Course B", "course_code": "B", "enrollments": [{"role": "DesignerEnrollment", "enrollment_state": "active"}]},
        {"id": 3, "name": "Course C", "course_code": "C", "enrollments": [{"role": "StudentEnrollment", "enrollment_state": "active"}]},
    ]
    with patch("requests.get", return_value=mock_response(json_data=raw_courses)):
        result = retriever.get_courses()
    assert len(result) == 2
    assert {r["id"] for r in result} == {1, 2}


# --- Integration Tests: get_courses ---

def test_get_courses_returns_correct_fields():
    retriever = make_retriever()
    raw_courses = [
        {"id": 10, "name": "ML Engineering", "course_code": "CAI6108", "enrollments": [{"role": "TeacherEnrollment", "enrollment_state": "active"}]},
    ]
    with patch("requests.get", return_value=mock_response(json_data=raw_courses)):
        result = retriever.get_courses()
    assert result[0]["id"] == 10
    assert result[0]["name"] == "ML Engineering"
    assert result[0]["course_code"] == "CAI6108"


def test_get_courses_failure_raises():
    retriever = make_retriever()
    with patch("requests.get", return_value=mock_response(ok=False, status_code=401)):
        with pytest.raises(Exception):
            retriever.get_courses()


# --- Integration Tests: get_course_files ---

def test_get_course_files_returns_correct_fields():
    retriever = make_retriever()
    raw_files = [{"id": 1, "folder_id": 2, "display_name": "notes.pdf", "filename": "notes.pdf",
                  "content-type": "application/pdf", "url": "http://canvas/files/1", "size": 1024,
                  "created_at": "2024-01-01", "updated_at": "2024-01-02", "modified_at": "2024-01-02", "mime_class": "pdf"}]
    with patch("requests.get", return_value=mock_response(json_data=raw_files)):
        result = retriever.get_course_files(123)
    assert result[0]["display_name"] == "notes.pdf"
    assert result[0]["mime_class"] == "pdf"


def test_get_course_files_follows_pagination():
    retriever = make_retriever()
    page1 = mock_response(json_data=[{"id": 1, "display_name": "file1.pdf", "filename": "file1.pdf",
                                       "folder_id": None, "content-type": None, "url": None,
                                       "size": None, "created_at": None, "updated_at": None,
                                       "modified_at": None, "mime_class": None}],
                          links={"next": {"url": "http://canvas/files?page=2"}})
    page2 = mock_response(json_data=[{"id": 2, "display_name": "file2.pdf", "filename": "file2.pdf",
                                       "folder_id": None, "content-type": None, "url": None,
                                       "size": None, "created_at": None, "updated_at": None,
                                       "modified_at": None, "mime_class": None}],
                          links={})
    with patch("requests.get", side_effect=[page1, page2]):
        result = retriever.get_course_files(123)
    assert len(result) == 2
    assert result[0]["display_name"] == "file1.pdf"
    assert result[1]["display_name"] == "file2.pdf"


def test_get_course_files_failure_raises():
    retriever = make_retriever()
    with patch("requests.get", return_value=mock_response(ok=False, status_code=403)):
        with pytest.raises(Exception):
            retriever.get_course_files(123)


# --- Integration Tests: get_course_quizzes ---

def test_get_course_quizzes_returns_correct_fields():
    retriever = make_retriever()
    raw_quizzes = [{"id": 5, "title": "Quiz 1", "description": "desc", "html_url": "http://canvas/quiz/5",
                    "question_count": 10, "points_possible": 10.0, "due_at": None, "published": True}]
    with patch("requests.get", return_value=mock_response(json_data=raw_quizzes)):
        result = retriever.get_course_quizzes(123)
    assert result[0]["id"] == 5
    assert result[0]["title"] == "Quiz 1"
    assert result[0]["published"] is True


def test_get_course_quizzes_follows_pagination():
    retriever = make_retriever()
    page1 = mock_response(json_data=[{"id": 1, "title": "Quiz A", "description": None, "html_url": None,
                                       "question_count": 5, "points_possible": 5.0, "due_at": None, "published": True}],
                          links={"next": {"url": "http://canvas/quizzes?page=2"}})
    page2 = mock_response(json_data=[{"id": 2, "title": "Quiz B", "description": None, "html_url": None,
                                       "question_count": 3, "points_possible": 3.0, "due_at": None, "published": False}],
                          links={})
    with patch("requests.get", side_effect=[page1, page2]):
        result = retriever.get_course_quizzes(123)
    assert len(result) == 2


def test_get_course_quizzes_failure_raises():
    retriever = make_retriever()
    with patch("requests.get", return_value=mock_response(ok=False, status_code=404)):
        with pytest.raises(Exception):
            retriever.get_course_quizzes(123)


# --- Integration Tests: get_quiz_questions ---

def test_get_quiz_questions_returns_all_questions():
    retriever = make_retriever()
    raw_questions = [{"id": 1, "question_name": "Q1", "question_text": "What is X?"}]
    with patch("requests.get", return_value=mock_response(json_data=raw_questions)):
        result = retriever.get_quiz_questions(123, 456)
    assert len(result) == 1
    assert result[0]["question_name"] == "Q1"


def test_get_quiz_questions_failure_raises():
    retriever = make_retriever()
    with patch("requests.get", return_value=mock_response(ok=False, status_code=403)):
        with pytest.raises(Exception):
            retriever.get_quiz_questions(123, 456)


# --- Integration Tests: download_file ---

def test_download_file_returns_bytes():
    retriever = make_retriever()
    with patch("requests.get", return_value=mock_response(ok=True)):
        result = retriever.download_file("http://canvas/files/1/download")
    assert result == b"fake file content"


def test_download_file_failure_raises():
    retriever = make_retriever()
    with patch("requests.get", return_value=mock_response(ok=False, status_code=403)):
        with pytest.raises(Exception):
            retriever.download_file("http://canvas/files/1/download")


# --- Integration Tests: get_assignment_groups ---

def test_get_assignment_groups_returns_id_and_name():
    retriever = make_retriever()
    raw_groups = [{"id": 1, "name": "Homework"}, {"id": 2, "name": "Quizzes"}]
    with patch("requests.get", return_value=mock_response(json_data=raw_groups)):
        result = retriever.get_assignment_groups(123)
    assert result == [{"id": 1, "name": "Homework"}, {"id": 2, "name": "Quizzes"}]


def test_get_assignment_groups_failure_raises():
    retriever = make_retriever()
    with patch("requests.get", return_value=mock_response(ok=False, status_code=500)):
        with pytest.raises(Exception):
            retriever.get_assignment_groups(123)


# --- Integration Tests: get_all_course_content ---

def test_get_all_course_content_returns_files_and_quizzes():
    retriever = make_retriever()
    file_data = [{"id": 1, "display_name": "notes.pdf", "filename": "notes.pdf", "folder_id": None,
                  "content-type": None, "url": None, "size": None, "created_at": None,
                  "updated_at": None, "modified_at": None, "mime_class": None}]
    quiz_data = [{"id": 10, "title": "Quiz 1", "description": None, "html_url": None,
                  "question_count": 5, "points_possible": 5.0, "due_at": None, "published": True}]
    question_data = [{"id": 99, "question_name": "Q1"}]

    responses = [
        mock_response(json_data=file_data),
        mock_response(json_data=quiz_data),
        mock_response(json_data=question_data),
    ]
    with patch("requests.get", side_effect=responses):
        result = retriever.get_all_course_content(123)

    assert len(result["files"]) == 1
    assert len(result["quizzes"]) == 1
    assert result["quizzes"][0]["questions"][0]["question_name"] == "Q1"