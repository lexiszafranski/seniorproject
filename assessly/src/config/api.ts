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

generateQuiz: async (files: { url: string; display_name: string; content_type: string }[]) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/api/generate-quiz`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ files })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to generate quiz');
    }
    return response.json();
  },
};