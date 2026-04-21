"""
Unit and integration tests for canvas_publisher.py
"""
import pytest
from unittest.mock import patch, MagicMock, call
from canvas_publisher import (
    publish_quiz_to_canvas,
    publish_existing_canvas_quiz,
    unpublish_canvas_quiz,
    update_item_points_on_canvas,
    fetch_canvas_quiz_items,
    fetch_canvas_quiz_title,
    delete_quiz_from_canvas,
    get_all_new_quizzes_for_course,
)


def mock_response(ok=True, json_data=None, status_code=200, text=""):
    m = MagicMock()
    m.ok = ok
    m.status_code = status_code
    m.text = text
    m.json.return_value = json_data if json_data is not None else {}
    return m


VALID_QUIZ_DOC = {
    "course_id": 123,
    "title": "Test Quiz",
    "description_html": "",
    "questions": [
        {
            "internal_question_id": "q1",
            "position": 1,
            "question_stem_html": "<p>What is 2+2?</p>",
            "points_possible": 1,
            "overall_rationale_html": "",
            "choices": [
                {"internal_choice_id": "c1", "text_html": "<p>3</p>", "is_correct": False},
                {"internal_choice_id": "c2", "text_html": "<p>4</p>", "is_correct": True},
            ]
        }
    ]
}


# --- Unit Tests: publish_quiz_to_canvas ---

def test_missing_correct_choice_raises_runtime_error():
    quiz_doc = {
        "course_id": 123,
        "title": "Bad Quiz",
        "description_html": "",
        "questions": [
            {
                "internal_question_id": "q1",
                "position": 1,
                "question_stem_html": "<p>What is 2+2?</p>",
                "points_possible": 1,
                "overall_rationale_html": "",
                "choices": [
                    {"internal_choice_id": "c1", "text_html": "<p>3</p>", "is_correct": False},
                    {"internal_choice_id": "c2", "text_html": "<p>4</p>", "is_correct": False},
                ]
            }
        ]
    }
    with patch("requests.post", return_value=mock_response(ok=True, json_data={"id": "quiz_abc"})):
        with pytest.raises(RuntimeError, match="has no correct choice"):
            publish_quiz_to_canvas(quiz_doc, canvas_token="fake_token")


def test_publish_true_sends_patch_with_published_true():
    shell_resp = mock_response(ok=True, json_data={"id": "quiz_abc"})
    item_resp = mock_response(ok=True, json_data={"id": "item_xyz"})
    get_resp = mock_response(ok=True, json_data={"id": "quiz_abc", "published": False})
    patch_resp = mock_response(ok=True)

    with patch("requests.post", side_effect=[shell_resp, item_resp]):
        with patch("requests.get", return_value=get_resp):
            with patch("requests.patch", return_value=patch_resp) as mock_patch:
                publish_quiz_to_canvas(VALID_QUIZ_DOC, canvas_token="fake_token", publish=True)

    assert mock_patch.call_args[1]["json"]["quiz"]["published"] is True


# --- Integration Tests: publish_quiz_to_canvas ---

def test_shell_creation_failure_raises_runtime_error():
    with patch("requests.post", return_value=mock_response(ok=False, status_code=401, text="Unauthorized")):
        with pytest.raises(RuntimeError, match="Failed to create quiz shell"):
            publish_quiz_to_canvas(VALID_QUIZ_DOC, canvas_token="fake_token")


def test_publish_false_skips_patch():
    shell_resp = mock_response(ok=True, json_data={"id": "quiz_abc"})
    item_resp = mock_response(ok=True, json_data={"id": "item_xyz"})

    with patch("requests.post", side_effect=[shell_resp, item_resp]):
        with patch("requests.patch") as mock_patch:
            publish_quiz_to_canvas(VALID_QUIZ_DOC, canvas_token="fake_token", publish=False)

    mock_patch.assert_not_called()


# --- Integration Tests: publish_existing_canvas_quiz ---

def test_publish_existing_quiz_sends_published_true():
    get_resp = mock_response(ok=True, json_data={"id": "quiz_abc", "published": False})
    patch_resp = mock_response(ok=True)

    with patch("requests.get", return_value=get_resp):
        with patch("requests.patch", return_value=patch_resp) as mock_patch:
            publish_existing_canvas_quiz(123, "quiz_abc", "fake_token")

    assert mock_patch.call_args[1]["json"]["quiz"]["published"] is True


def test_publish_existing_quiz_get_failure_raises():
    with patch("requests.get", return_value=mock_response(ok=False, status_code=404)):
        with pytest.raises(RuntimeError, match="Failed to fetch existing quiz"):
            publish_existing_canvas_quiz(123, "quiz_abc", "fake_token")


def test_publish_existing_quiz_patch_failure_raises():
    get_resp = mock_response(ok=True, json_data={"id": "quiz_abc", "published": False})
    with patch("requests.get", return_value=get_resp):
        with patch("requests.patch", return_value=mock_response(ok=False, status_code=500)):
            with pytest.raises(RuntimeError, match="Failed to publish existing quiz"):
                publish_existing_canvas_quiz(123, "quiz_abc", "fake_token")


# --- Integration Tests: unpublish_canvas_quiz ---

def test_unpublish_sends_published_false():
    get_resp = mock_response(ok=True, json_data={"id": "quiz_abc", "published": True})
    patch_resp = mock_response(ok=True)

    with patch("requests.get", return_value=get_resp):
        with patch("requests.patch", return_value=patch_resp) as mock_patch:
            unpublish_canvas_quiz(123, "quiz_abc", "fake_token")

    assert mock_patch.call_args[1]["json"]["quiz"]["published"] is False


def test_unpublish_get_failure_raises():
    with patch("requests.get", return_value=mock_response(ok=False, status_code=404)):
        with pytest.raises(RuntimeError, match="Failed to fetch quiz for unpublishing"):
            unpublish_canvas_quiz(123, "quiz_abc", "fake_token")


def test_unpublish_patch_failure_raises():
    get_resp = mock_response(ok=True, json_data={"id": "quiz_abc", "published": True})
    with patch("requests.get", return_value=get_resp):
        with patch("requests.patch", return_value=mock_response(ok=False, status_code=500)):
            with pytest.raises(RuntimeError, match="Failed to unpublish quiz"):
                unpublish_canvas_quiz(123, "quiz_abc", "fake_token")


# --- Integration Tests: update_item_points_on_canvas ---

def test_update_points_patches_both_levels():
    item_data = {"id": "item_xyz", "points_possible": 1, "entry": {"points_possible": 1}}
    get_resp = mock_response(ok=True, json_data=item_data)
    patch_resp = mock_response(ok=True)

    with patch("requests.get", return_value=get_resp):
        with patch("requests.patch", return_value=patch_resp) as mock_patch:
            update_item_points_on_canvas(123, "quiz_abc", "item_xyz", 5.0, "fake_token")

    patched = mock_patch.call_args[1]["json"]["item"]
    assert patched["points_possible"] == 5.0
    assert patched["entry"]["points_possible"] == 5.0


def test_update_points_get_failure_raises():
    with patch("requests.get", return_value=mock_response(ok=False, status_code=404)):
        with pytest.raises(RuntimeError, match="Failed to fetch item"):
            update_item_points_on_canvas(123, "quiz_abc", "item_xyz", 5.0, "fake_token")


def test_update_points_patch_failure_raises():
    item_data = {"id": "item_xyz", "points_possible": 1, "entry": {"points_possible": 1}}
    with patch("requests.get", return_value=mock_response(ok=True, json_data=item_data)):
        with patch("requests.patch", return_value=mock_response(ok=False, status_code=500)):
            with pytest.raises(RuntimeError, match="Failed to update points"):
                update_item_points_on_canvas(123, "quiz_abc", "item_xyz", 5.0, "fake_token")


# --- Integration Tests: fetch_canvas_quiz_items ---

def test_fetch_quiz_items_returns_list():
    items = [{"id": "item_1"}, {"id": "item_2"}]
    with patch("requests.get", return_value=mock_response(ok=True, json_data=items)):
        result = fetch_canvas_quiz_items(123, "quiz_abc", "fake_token")
    assert result == items


def test_fetch_quiz_items_failure_raises():
    with patch("requests.get", return_value=mock_response(ok=False, status_code=403)):
        with pytest.raises(RuntimeError, match="Failed to fetch quiz items"):
            fetch_canvas_quiz_items(123, "quiz_abc", "fake_token")


# --- Integration Tests: fetch_canvas_quiz_title ---

def test_fetch_quiz_title_returns_string():
    with patch("requests.get", return_value=mock_response(ok=True, json_data={"title": "My Quiz"})):
        result = fetch_canvas_quiz_title(123, "quiz_abc", "fake_token")
    assert result == "My Quiz"


def test_fetch_quiz_title_failure_raises():
    with patch("requests.get", return_value=mock_response(ok=False, status_code=404)):
        with pytest.raises(RuntimeError, match="Failed to fetch quiz"):
            fetch_canvas_quiz_title(123, "quiz_abc", "fake_token")


# --- Integration Tests: delete_quiz_from_canvas ---

def test_delete_quiz_succeeds_without_error():
    with patch("requests.delete", return_value=mock_response(ok=True)):
        delete_quiz_from_canvas(123, "quiz_abc", "fake_token")


def test_delete_quiz_failure_raises():
    with patch("requests.delete", return_value=mock_response(ok=False, status_code=404)):
        with pytest.raises(RuntimeError, match="Failed to delete quiz"):
            delete_quiz_from_canvas(123, "quiz_abc", "fake_token")


# --- Integration Tests: get_all_new_quizzes_for_course ---

def test_get_all_quizzes_returns_correct_structure():
    quizzes = [
        {"id": 1, "title": "Quiz A", "published": True},
        {"id": 2, "title": "Quiz B", "published": False},
    ]
    with patch("requests.get", return_value=mock_response(ok=True, json_data=quizzes)):
        result = get_all_new_quizzes_for_course(123, "fake_token")

    assert result == {
        "1": {"title": "Quiz A", "published": True},
        "2": {"title": "Quiz B", "published": False},
    }


def test_get_all_quizzes_filters_out_entries_with_no_id():
    quizzes = [
        {"id": 1, "title": "Quiz A", "published": True},
        {"title": "No ID Quiz", "published": False},
    ]
    with patch("requests.get", return_value=mock_response(ok=True, json_data=quizzes)):
        result = get_all_new_quizzes_for_course(123, "fake_token")

    assert "1" in result
    assert len(result) == 1


def test_get_all_quizzes_failure_raises():
    with patch("requests.get", return_value=mock_response(ok=False, status_code=500)):
        with pytest.raises(RuntimeError, match="Failed to fetch New Quizzes"):
            get_all_new_quizzes_for_course(123, "fake_token")
