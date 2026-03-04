import {
  mockSyncCoursesResponse,
  mockQuizzesResponse,
  mockFilesResponse,
  mockQuestionsResponse,
} from "../config/mockData";

const USE_MOCK = true;

// When USE_MOCK is false, return the actual apis.


export const api = {
  syncCourses: () =>
    USE_MOCK ? Promise.resolve(mockSyncCoursesResponse) : Promise.resolve(null),

  getQuizzes: (courseId: number) =>
    USE_MOCK ? Promise.resolve(mockQuizzesResponse) : Promise.resolve(null),

  getFiles: (courseId: number) =>
    USE_MOCK ? Promise.resolve(mockFilesResponse) : Promise.resolve(null),

  getQuestions: (courseId: number, quizId: number) =>
    USE_MOCK ? Promise.resolve(mockQuestionsResponse) : Promise.resolve(null),
};