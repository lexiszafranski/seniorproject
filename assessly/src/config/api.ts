import {
  mockSyncCoursesResponse,
  mockQuizzesResponse,
  mockFilesResponse,
  mockQuestionsResponse,
} from "../config/mockData";

const USE_MOCK = false; // Changed to false to use real backend

const API_BASE = "http://localhost:8000";

// Helper to get Clerk token
async function getAuthHeaders() {
  // @ts-ignore - Clerk is available globally
  const token = await window.Clerk?.session?.getToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

export const api = {
  syncCourses: async () => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/api/sync-courses`, {
      method: 'POST',
      headers
    });
    if (!response.ok) {
      throw new Error('Failed to sync courses');
    }
    return response.json();
  },

  getQuizzes: async (courseId: number) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/api/courses/${courseId}/quizzes`, {
      headers
    });
    if (!response.ok) {
      throw new Error('Failed to get quizzes');
    }
    return response.json();
  },

  getFiles: async (courseId: number) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/api/courses/${courseId}/files`, {
      headers
    });
    if (!response.ok) {
      throw new Error('Failed to get files');
    }
    return response.json();
  },

  getQuestions: async (courseId: number, quizId: number) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/api/courses/${courseId}/quizzes/${quizId}/questions`, {
      headers
    });
    if (!response.ok) {
      throw new Error('Failed to get questions');
    }
    return response.json();
  },

getAssesslyQuizzes: async (courseId: number) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/api/courses/${courseId}/assessly-quizzes`, { headers });
    if (!response.ok) throw new Error('Failed to get Assessly quizzes');
    return response.json();
  },

getQuiz: async (quizId: string) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/api/quizzes/${quizId}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch quiz');
    return response.json();
  },

saveQuizToCanvas: async (quizId: string) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/api/quizzes/${quizId}/save-to-canvas`, { method: 'POST', headers });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Failed to save quiz to Canvas');
    }
    return response.json();
  },

  publishQuiz: async (quizId: string) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/api/quizzes/${quizId}/publish`, {
      method: 'POST',
      headers,
    });
    if (!response.ok) {
      let detail = 'Failed to publish quiz';
      try {
        const error = await response.json();
        detail = error.detail || detail;
      } catch {}
      throw new Error(detail);
    }
    return response.json();
  },

unpublishQuiz: async (quizId: string) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/api/quizzes/${quizId}/unpublish`, { method: 'POST', headers });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Failed to unpublish quiz');
    }
    return response.json();
  },

revertToDraft: async (quizId: string) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/api/quizzes/${quizId}/revert-to-draft`, { method: 'POST', headers });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Failed to revert quiz to draft');
    }
    return response.json();
  },

deleteQuiz: async (quizId: string) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/api/quizzes/${quizId}`, { method: 'DELETE', headers });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Failed to delete quiz');
    }
    return response.json();
  },

generateQuiz: async (files: { url: string; display_name: string; content_type: string }[], course_id?: number, quiz_ids?: number[], question_count?: number, title?: string) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/api/generate-quiz`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ files, course_id, quiz_ids: quiz_ids ?? [], question_count: question_count ?? 5, title: title || "Generated Practice Quiz" })
    });
    if (!response.ok) {
      let detail = 'Failed to generate quiz';
      try {
        const error = await response.json();
        detail = error.detail || detail;
      } catch {}
      throw new Error(detail);
    }
    return response.json();
  },
};