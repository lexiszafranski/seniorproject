// src/config/mockData.ts

// POST /api/sync-courses
export const mockSyncCoursesResponse = {
  "courses_synced": 13,
  "courses": [
    {
      "id": 555100,
      "name": "CAI6108 - ML Engineering",
      "course_code": "CAI6108",
      "enrollments": [
        {
          "role": "StudentEnrollment",
          "enrollment_state": "active"
        }
      ]
    },
    {
      "id": 555100,
      "name": "CAI6108 - ML Engineering",
      "course_code": "CAI6108",
      "enrollments": [
        {
          "role": "StudentEnrollment",
          "enrollment_state": "active"
        }
      ]
    },
    {
      "id": 555100,
      "name": "CAI6108 - ML Engineering",
      "course_code": "CAI6108",
      "enrollments": [
        {
          "role": "StudentEnrollment",
          "enrollment_state": "active"
        }
      ]
    },
    {
      "id": 555100,
      "name": "CAI6108 - ML Engineering",
      "course_code": "CAI6108",
      "enrollments": [
        {
          "role": "StudentEnrollment",
          "enrollment_state": "active"
        }
      ]
    }
  ]
};

// GET /api/courses/{course_id}/quizzes
export const mockQuizzesResponse = {
  "quiz_count": 1,
  "quizzes": [
    {
      "id": 1582529,
      "title": "API TEST Mock Quiz",
      "description": "Practice quiz created via the Canvas API (safe to ignore).",
      "html_url": "https://ufl.instructure.com/courses/389226/quizzes/1582529",
      "question_count": 0,
      "points_possible": 0,
      "due_at": null,
      "published": false
    }
  ]
};

// GET /api/courses/{course_id}/files
export const mockFilesResponse = {
  "file_count": 1,
  "files": [
    {
      "id": 63265314,
      "folder_id": 6794316,
      "display_name": "0_Introduction_and_CourseOverview.pdf",
      "filename": "0_Introduction_and_CourseOverview.pdf",
      "content-type": "application/pdf",
      "url": "https://ufl.instructure.com/files/63265314/download?download_frd=1&verifier=th6QWGRXtjNiourZyexyOM2FX2n8lDFRmqNXYCy9",
      "size": 1887556,
      "created_at": "2021-01-12T22:15:59Z",
      "updated_at": "2021-10-20T16:41:21Z",
      "modified_at": "2021-01-12T22:15:59Z",
      "mime_class": "pdf"
    },
    {
      "id": 63265315,
      "folder_id": 6794316,
      "display_name": "0_Introduction_and_CourseOverview.pdf",
      "filename": "0_Introduction_and_CourseOverview.pdf",
      "content-type": "application/pdf",
      "url": "https://ufl.instructure.com/files/63265314/download?download_frd=1&verifier=th6QWGRXtjNiourZyexyOM2FX2n8lDFRmqNXYCy9",
      "size": 1887556,
      "created_at": "2021-01-12T22:15:59Z",
      "updated_at": "2021-10-20T16:41:21Z",
      "modified_at": "2021-01-12T22:15:59Z",
      "mime_class": "pdf"
    }
  ]
};

// GET /api/courses/{course_id}/quizzes/{quiz_id}/questions
export const mockQuestionsResponse = {
  "question_count": 1,
  "questions": [
    {
      "id": 23919174,
      "question_name": "Question",
      "question_text": "<p>What is the computational complexity?</p>",
      "question_type": "multiple_choice_question",
      "points_possible": 1.0,
      "answers": [
        { "id": 8940, "text": "O(1)", "weight": 0 },
        { "id": 5589, "text": "O(n^2)", "weight": 100 }
      ]
    }
  ]
};