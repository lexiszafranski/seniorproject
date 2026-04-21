import os
import requests
from typing import List, Dict, Optional
import hashlib
from dotenv import load_dotenv

load_dotenv()
 
class CanvasContentRetriever:

    # Initializes Canvas API client with UF's Canvas URL and user's access token
    def __init__(self, canvas_url: str, access_token: str):
        self.base_url = canvas_url.rstrip('/')
        self.headers = {"Authorization": f"Bearer {access_token}"}
    
    # Get all courses accessible for the user
    # Returns only: id, name, course_code, and enrollment role/state
    def get_courses(self) -> List[Dict]:
        url = f"{self.base_url}/api/v1/courses"
        params = {
            "enrollment_state": "active",
            "per_page": 100
        }

        response = requests.get(url, headers=self.headers, params=params)
        response.raise_for_status()
        raw_courses = response.json()

        valid_roles = {'TeacherEnrollment', 'TaEnrollment', 'DesignerEnrollment'}

        filtered_courses = []
        for course in raw_courses:
            enrollments = course.get("enrollments", [])
            roles = {e.get("role") for e in enrollments}

            if roles & valid_roles:  # course has at least one valid role
                filtered_courses.append({
                    "id": course["id"],
                    "name": course.get("name"),
                    "course_code": course.get("course_code"),
                    "enrollments": [
                        {"role": e.get("role"), "enrollment_state": e.get("enrollment_state")}
                        for e in enrollments
                    ]
                })

        return filtered_courses
    
    """
    Get all files for a course
        Returns list of dicts with:
            - id: File ID needed to download files
            - folder_id: ID of the folder containing the file
            - display_name: File's display name
            - filename: Actual filename
            - content-type: MIME type
            - url: Direct download URL
            - size: File size in bytes
            - created_at: When the file was first uploaded
            - updated_at: Last time Canvas metadata was touched
            - modified_at: Last time the actual file content was changed
            - mime_class: File type (pdf, doc, etc.)
    """
    def get_course_files(self, course_id: int) -> List[Dict]:
        url = f"{self.base_url}/api/v1/courses/{course_id}/files"
        params = {"per_page": 100}

        all_files = []

        while url:
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            all_files.extend(response.json())

            # Handle pagination
            url = response.links.get('next', {}).get('url')
            params = {}  # Params already in next URL

        filtered_files = []
        for file in all_files:
            filtered_files.append({
                "id": file["id"],
                "folder_id": file.get("folder_id"),
                "display_name": file.get("display_name"),
                "filename": file.get("filename"),
                "content-type": file.get("content-type"),
                "url": file.get("url"),
                "size": file.get("size"),
                "created_at": file.get("created_at"),
                "updated_at": file.get("updated_at"),
                "modified_at": file.get("modified_at"),
                "mime_class": file.get("mime_class"),
            })

        return filtered_files
    
    """
    Get all quizzes for a course (metadata - not content)

    Returns only: id, title, description, html_url, question_count, points_possible, due_at, published
    """
    def get_course_quizzes(self, course_id: int) -> List[Dict]:
        url = f"{self.base_url}/api/v1/courses/{course_id}/quizzes"
        params = {"per_page": 100}

        all_quizzes = []

        while url:
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            all_quizzes.extend(response.json())

            url = response.links.get('next', {}).get('url')
            params = {}

        filtered_quizzes = []
        for quiz in all_quizzes:
            filtered_quizzes.append({
                "id": quiz["id"],
                "title": quiz.get("title"),
                "description": quiz.get("description"),
                "html_url": quiz.get("html_url"),
                "question_count": quiz.get("question_count"),
                "points_possible": quiz.get("points_possible"),
                "due_at": quiz.get("due_at"),
                "published": quiz.get("published")
            })

        return filtered_quizzes
    
    """
    Get all questions for a specific quiz
    
    Returns list of dicts with:
        - id: Question ID
        - question_name: Question title
        - question_text: Question content (HTML)
        - question_type: Type (multiple_choice, true_false, etc.)
        - answers: List of possible answers
        - correct_comments: Feedback for correct answer
        - incorrect_comments: Feedback for incorrect answer
    """
    def get_quiz_questions(self, course_id: int, quiz_id: int) -> List[Dict]:
        url = f"{self.base_url}/api/v1/courses/{course_id}/quizzes/{quiz_id}/questions"
        params = {"per_page": 100}
        
        all_questions = []
        
        while url:
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            all_questions.extend(response.json())
            
            url = response.links.get('next', {}).get('url')
            params = {}
        
        return all_questions
    
    """
    Downloads a file from Canvas using the direct URL provided in the file metadata.
    Returns the file content as bytes and optionally saves it to disk if a save_path is provided.
    
    Arguments:
        - file_url should be the 'url' field from get_course_files() response, which is a direct download link
        - save_path is to save file to disk and is optional
    """
    def download_file(self, file_url: str, save_path: Optional[str] = None) -> bytes:
        response = requests.get(file_url, headers=self.headers)
        response.raise_for_status()
        
        content = response.content
        
        if save_path:
            with open(save_path, 'wb') as f:
                f.write(content)
        
        return content
    
    # Generate SHA256 hash of file content for change detection
    def get_file_hash(self, file_content: bytes) -> str:
        return hashlib.sha256(file_content).hexdigest()
    
    """
    Get all files and quizzes for a course in one call
        
    Returns dict with:
        - files: List of all files
        - quizzes: List of all quizzes with their questions
    """
    def get_assignment_groups(self, course_id: int) -> List[Dict]:
        url = f"{self.base_url}/api/v1/courses/{course_id}/assignment_groups"
        params = {"per_page": 100}
        response = requests.get(url, headers=self.headers, params=params)
        response.raise_for_status()
        return [{"id": g["id"], "name": g["name"]} for g in response.json()]

    def get_all_course_content(self, course_id: int) -> Dict:
        files = self.get_course_files(course_id)
        quizzes = self.get_course_quizzes(course_id)
        
        # Optionally fetch questions for each quiz
        for quiz in quizzes:
            quiz['questions'] = self.get_quiz_questions(course_id, quiz['id'])
        
        return {
            'files': files,
            'quizzes': quizzes
        }