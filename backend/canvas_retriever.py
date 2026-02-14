import requests
from typing import List, Dict, Optional
import hashlib
 
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

        filtered_courses = []
        for course in raw_courses:
            enrollments = []
            for enrollment in course.get("enrollments", []):
                enrollments.append({
                    "role": enrollment.get("role"),
                    "enrollment_state": enrollment.get("enrollment_state")
                })

            filtered_courses.append({
                "id": course["id"],
                "name": course.get("name"),
                "course_code": course.get("course_code"),
                "enrollments": enrollments
            })

        return filtered_courses
    
    """
    Get all files for a course
        Returns list of dicts with:
            - id: File ID needed to download files
            - display_name: File's name
            - url: Direct download URL
            - updated_at: Last modified timestamp
            - size: File size in bytes
            - mime_class: File type (pdf, doc, etc.)
            - content-type: MIME type
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
        
        return all_files
    
    """
    Get all quizzes for a course
        
    Returns list of dicts with:
        - id: Quiz ID
        - title: Quiz name
        - description: Quiz description (HTML)
        - quiz_type: Type of quiz
        - published: Whether it's published
        - question_count: Number of questions
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
        
        return all_quizzes
    
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

if __name__ == "__main__":
    # Initialize
    canvas = CanvasContentRetriever(
        canvas_url="https://ufl.instructure.com",
        access_token="PLACEHOLDER")
    
    # Get all courses
    courses = canvas.get_courses()
    print(f"Found {len(courses)} courses")
    
    if courses:
    #     Pick a course (example: first course)
    #     course_id = courses[0]['id']
    #     course_name = courses[0]['name']
    #     print(f"\nProcessing course: {course_name} (ID: {course_id})")

        # Print out the first course:
        print(courses[0])

        # course_id = 389226
        # # Get all files from Aman's sandbox coursex
        # files = canvas.get_course_files(course_id)
        # print(f"\nFiles ({len(files)}):")
        # for file in files:
        #     print(f"  - {file['display_name']} (ID: {file['id']}, Type: {file.get('mime_class', 'unknown')})")
        #     # print(f"    URL: {file['url']}")
        #     print(f"    Updated: {file['updated_at']}")
        
        # # Get all quizzes
        # quizzes = canvas.get_course_quizzes(course_id)
        # print(f"\nQuizzes ({len(quizzes)}):")
        # for quiz in quizzes:
        #     print(f"  - {quiz['title']} (ID: {quiz['id']}, Questions: {quiz.get('question_count', 0)})")

        # # Print questions and answers from Conceptual Quiz 2
        # quiz_id = 1580714
        # print(f"\n{'='*60}")
        # print("Questions from Conceptual Quiz 2")
        # print(f"{'='*60}")

        # questions = canvas.get_quiz_questions(course_id, quiz_id)
        # for i, question in enumerate(questions, 1):
        #     print(f"\nQuestion {i}: {question.get('question_name', 'Untitled')}")
        #     print(f"  {question.get('question_text', 'No question text')}")
        #     print(f"  Type: {question.get('question_type', 'unknown')}")

        #     answers = question.get('answers', [])
        #     if answers:
        #         print("  Answer options:")
        #         for j, answer in enumerate(answers, 1):
        #             answer_text = answer.get('text') or answer.get('html') or 'No text'
        #             print(f"    {j}. {answer_text}")
        
        # # Download a PDF example
        # pdf_files = [f for f in files if f.get('mime_class') == 'pdf']
        # if pdf_files:
        #     pdf = pdf_files[0]
        #     print(f"\nDownloading example PDF: {pdf['display_name']}")
        #     content = canvas.download_file(pdf['url'], save_path=f"./downloaded_{pdf['display_name']}")
        #     file_hash = canvas.get_file_hash(content)
        #     print(f"  Hash: {file_hash}")
        #     print(f"  Size: {len(content)} bytes")