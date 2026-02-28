import os
import json
import re
from google import genai
from dotenv import load_dotenv
import httpx
import io

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_KEY"))

QUIZ_PROMPT = """You are an expert educator and quiz creator. For each of the provided course materials, create exactly 2 challenging multiple-choice practice quiz questions that test deep understanding of the content.

Return ONLY a valid JSON object with no extra text, markdown code fences, or explanation. Use this exact format:

{
  "questions": [
    {
      "question": "The full question text here?",
      "options": {
        "A": "First option",
        "B": "Second option",
        "C": "Third option",
        "D": "Fourth option"
      },
      "answer": "A",
      "rationale": "Brief explanation of why this answer is correct."
    }
  ]
}

Rules:
- Exactly 2 questions per course material
- Each question must have exactly 4 options (A, B, C, D)
- The answer field must be a single letter matching one of the option keys
- Questions should be substantive and require understanding, not just recall
- No markdown, no code fences, no text outside the JSON object"""

"""
    Generate a multiple-choice quiz from a list of Canvas file URLs.

    Args:
        files: List of dicts with keys: 'url', 'display_name', 'content_type'
        canvas_token: Canvas API token used to authenticate file downloads

    Returns:
        Dict with 'questions' list, each containing: question, options, answer, rationale

    Raises:
        ValueError: If files list is empty or a file entry is missing a URL
        RuntimeError: If any download, Gemini upload, or generation step fails
    """
def generate_quiz_from_files(files: list, canvas_token: str) -> dict:
    if not files:
        raise ValueError("At least one file is required to generate a quiz.")

    headers = {"Authorization": f"Bearer {canvas_token}"}
    uploaded_files = []

    try:
        # Download each file from Canvas and upload to Gemini
        for i, file_info in enumerate(files):
            url = file_info.get("url")
            display_name = file_info.get("display_name", f"file_{i}")
            content_type = file_info.get("content_type", "application/pdf")

            if not url:
                raise ValueError(f"File at index {i} is missing a 'url'.")

            print(f"Downloading file {i + 1}/{len(files)}: {display_name}")
            try:
                with httpx.Client(follow_redirects=True, timeout=30.0) as h_client:
                    dl_response = h_client.get(url, headers=headers)
            except httpx.TimeoutException:
                raise RuntimeError(f"Timed out downloading '{display_name}' from Canvas.")
            except httpx.RequestError as e:
                raise RuntimeError(f"Network error downloading '{display_name}': {str(e)}")

            if dl_response.status_code != 200:
                raise RuntimeError(
                    f"Failed to download '{display_name}' from Canvas "
                    f"(HTTP {dl_response.status_code})."
                )

            print(f"Uploading '{display_name}' to Gemini...")
            file_io = io.BytesIO(dl_response.content)
            file_io.seek(0)

            try:
                file_upload = client.files.upload(
                    file=file_io,
                    config={"mime_type": content_type, "display_name": display_name}
                )
                uploaded_files.append(file_upload)
            except Exception as e:
                raise RuntimeError(f"Failed to upload '{display_name}' to Gemini: {str(e)}")

        # Generate quiz: pass all uploaded files + the structured prompt
        print(f"Generating quiz from {len(uploaded_files)} file(s)...")
        contents = uploaded_files + [QUIZ_PROMPT]

        try:
            gemini_response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=contents
            )
        except Exception as e:
            raise RuntimeError(f"Gemini content generation failed: {str(e)}")

        # Step 3: Parse the JSON response
        raw_text = gemini_response.text.strip()

        # Strip markdown code fences in case Gemini wraps the output anyway
        raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
        raw_text = re.sub(r"\s*```$", "", raw_text)
        raw_text = raw_text.strip()

        try:
            quiz_data = json.loads(raw_text)
        except json.JSONDecodeError as e:
            raise RuntimeError(
                f"Gemini returned invalid JSON: {str(e)}. "
                f"Raw response preview: {raw_text[:300]}"
            )

        if "questions" not in quiz_data or not isinstance(quiz_data["questions"], list):
            raise RuntimeError(
                "Gemini response is missing the 'questions' field or it is not a list."
            )

        return quiz_data

    finally:
        # Best-effort cleanup: delete uploaded files from Gemini's servers
        for uploaded in uploaded_files:
            try:
                client.files.delete(name=uploaded.name)
            except Exception:
                pass


# if __name__ == "__main__":
#     import os
#     test_files = [
#         {
#             "url": "https://ufl.instructure.com/files/63265314/download?download_frd=1&verifier=th6QWGRXtjNiourZyexyOM2FX2n8lDFRmqNXYCy9",
#             "display_name": "0_Introduction_and_CourseOverview.pdf",
#             "content_type": "application/pdf"
#         }
#         # {
#         #     "url": "https://ufl.instructure.com/files/103763467/download?download_frd=1&verifier=OnPPgAaoTvQDyr0GUP7Vhm0CsxuCFK34koEHkg1w",
#         #     "display_name": "c_review.pdf",
#         #     "content_type": "application/pdf"
#         # }
#     ]
#     result = generate_quiz_from_files(test_files, os.getenv("CANVAS_TOKEN"))
#     print("\n--- GENERATED QUIZ ---")
#     print(json.dumps(result, indent=2))
