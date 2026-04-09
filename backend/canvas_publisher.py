"""
CANVAS PUBLISHER: Reads a quiz document from MongoDB and publishes it to Canvas New Quizzes.

Flow:
  1. POST /api/v1/courses/{course_id}/quizzes          → creates quiz shell, returns new_quiz_id + assignment_id
  2. POST /api/quiz/v1/courses/{course_id}/quizzes/{new_quiz_id}/items  → one request per question
  3. PATCH /api/v1/courses/{course_id}/quizzes/{new_quiz_id}            → publishes the quiz

On any failure the exception bubbles up to the caller, which writes publish_failed + error to MongoDB.
"""

import requests


CANVAS_BASE_URL = "https://ufl.instructure.com"


def publish_quiz_to_canvas(quiz_doc: dict, canvas_token: str, publish: bool = True) -> dict:
    """
    Save (and optionally publish) a quiz document to Canvas New Quizzes.

    publish=True  → creates shell, posts questions, sets published=True  (status: published_on_canvas)
    publish=False → creates shell, posts questions only, leaves unpublished (status: saved_to_canvas)

    Returns a dict with:
        new_quiz_id, assignment_id, questions (list with canvas_item_id filled in)

    Raises RuntimeError on any Canvas API failure.
    """
    headers = {
        "Authorization": f"Bearer {canvas_token}",
        "Content-Type": "application/json"
    }
    course_id = quiz_doc["course_id"]

    # Step 1: Create quiz shell via New Quizzes API
    shell_payload = {
        "quiz": {
            "title": quiz_doc.get("title", "Practice Quiz"),
            "instructions": quiz_doc.get("description_html", ""),
        }
    }
    shell_resp = requests.post(
        f"{CANVAS_BASE_URL}/api/quiz/v1/courses/{course_id}/quizzes",
        headers=headers,
        json=shell_payload
    )
    if not shell_resp.ok:
        raise RuntimeError(
            f"Failed to create quiz shell: {shell_resp.status_code} {shell_resp.text}"
        )

    shell_data = shell_resp.json()
    print(f"Quiz shell response: {shell_data}")
    new_quiz_id = shell_data.get("id")
    assignment_id = None

    if not new_quiz_id:
        raise RuntimeError(f"Canvas did not return a quiz id. Response: {shell_data}")

    print(f"Created quiz shell: new_quiz_id={new_quiz_id}, assignment_id={assignment_id}")

    # Step 2: Post each question as an item
    updated_questions = []
    for question in quiz_doc["questions"]:
        correct_choice = next(
            (c for c in question["choices"] if c["is_correct"]), None
        )
        if not correct_choice:
            raise RuntimeError(
                f"Question {question['internal_question_id']} has no correct choice."
            )

        item_payload = {
            "item": {
                "entry_type": "Item",
                "entry": {
                    "title": f"Question {question['position']}",
                    "points_possible": question.get("points_possible", 1),
                    "item_body": question["question_stem_html"],
                    "interaction_type_slug": "choice",
                    "interaction_data": {
                        "choices": [
                            {
                                "id": c["internal_choice_id"],
                                "item_body": c["text_html"]
                            }
                            for c in question["choices"]
                        ]
                    },
                    "scoring_data": {
                        "value": correct_choice["internal_choice_id"]
                    },
                    "scoring_algorithm": "Equivalence",
                    "feedback": {
                        "neutral": question.get("overall_rationale_html", "")
                    }
                }
            }
        }

        item_resp = requests.post(
            f"{CANVAS_BASE_URL}/api/quiz/v1/courses/{course_id}/quizzes/{new_quiz_id}/items",
            headers=headers,
            json=item_payload
        )
        if not item_resp.ok:
            raise RuntimeError(
                f"Failed to create item for question {question['internal_question_id']}: "
                f"{item_resp.status_code} {item_resp.text}"
            )

        canvas_item_id = item_resp.json().get("id")
        print(f"  Created item {canvas_item_id} for question position {question['position']}")

        updated_questions.append({
            **question,
            "canvas_item_id": canvas_item_id
        })

    # Step 3: Publish if requested
    if publish:
        get_resp = requests.get(
            f"{CANVAS_BASE_URL}/api/quiz/v1/courses/{course_id}/quizzes/{new_quiz_id}",
            headers=headers
        )
        if not get_resp.ok:
            raise RuntimeError(f"Failed to fetch quiz for publishing: {get_resp.status_code} {get_resp.text}")
        quiz_state = get_resp.json()
        quiz_state["published"] = True
        publish_resp = requests.patch(
            f"{CANVAS_BASE_URL}/api/quiz/v1/courses/{course_id}/quizzes/{new_quiz_id}",
            headers=headers,
            json={"quiz": quiz_state}
        )
        if not publish_resp.ok:
            raise RuntimeError(f"Failed to publish quiz: {publish_resp.status_code} {publish_resp.text}")
        print(f"Quiz {new_quiz_id} published successfully.")
    else:
        print(f"Quiz {new_quiz_id} saved to Canvas as unpublished draft.")

    # For Canvas New Quizzes, assignment_id == new_quiz_id
    assignment_id = new_quiz_id

    return {
        "new_quiz_id": new_quiz_id,
        "assignment_id": assignment_id,
        "questions": updated_questions
    }


def get_all_new_quizzes_for_course(course_id: int, canvas_token: str) -> dict:
    """
    Fetches all New Quizzes for a course in one call.
    Returns a dict of {quiz_id (str): {"title": str, "published": bool}}.
    """
    headers = {"Authorization": f"Bearer {canvas_token}"}
    resp = requests.get(
        f"{CANVAS_BASE_URL}/api/quiz/v1/courses/{course_id}/quizzes",
        headers=headers,
        params={"per_page": 100}
    )
    if not resp.ok:
        raise RuntimeError(f"Failed to fetch New Quizzes for course: {resp.status_code} {resp.text}")

    return {
        str(q["id"]): {"title": q.get("title", ""), "published": bool(q.get("published", False))}
        for q in resp.json() if q.get("id")
    }
