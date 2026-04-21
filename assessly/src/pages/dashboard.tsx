import { useNavigate } from 'react-router-dom';
import '../styles/dashboard.css';
import '../styles/quizStructure.css';
import '../styles/DashboardCard.css'
import cardImg from '../assets/cardimg.jpg';
import { useEffect, useState } from 'react';
import { api } from "../config/api";
import backArrow from '../assets/Caret_Left.png';
import NavBar from '../components/NavBar';
import QuizLayout from '../components/QuizLayout';
import {PlusIcon} from '@phosphor-icons/react';


function Dashboard() {
  const navigate = useNavigate();
  const [coursesWithQuizzes, setCoursesWithQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [isCourseLoading, setIsCourseLoading] = useState(false);
  const [syncWarning, setSyncWarning] = useState(false);
  const [quizFilter, setQuizFilter] = useState<'drafts' | 'published' | 'all'>('all');
  const [quizSearch, setQuizSearch] = useState('');
  const cachedQuizzes = [
    {"id": 1000, "title": "Temp Quiz 1", question_count: 10, points_possible: 10},
    {"id": 2000, "title": "Temp Quiz 2", question_count: 15, points_possible: 15}
  ];
  
  useEffect(() => {
    async function loadCourses() {
      setLoading(true);
      try {
        const data = await api.syncCourses();
        const teacherCourses = data.courses.filter((course: any) => {
          const validRoles = ['TeacherEnrollment', 'TaEnrollment', 'DesignerEnrollment'];
          return course.enrollments?.some((enrollment: any) =>
            validRoles.includes(enrollment.role)
          );
        });
        setCoursesWithQuizzes(teacherCourses);
      } catch (error) {
        console.error("Error loading courses:", error);
      } finally {
        setLoading(false);
      }
    }
    loadCourses();
  }, []);

  async function handleCourseClick(course: any) {
    setSyncWarning(false);
    setQuizFilter('all');
    setQuizSearch('');
    setIsCourseLoading(true);
    try {
      const quizzesData = await api.getAssesslyQuizzes(course.id);
      if (quizzesData.sync_warning) setSyncWarning(true);
      setSelectedCourse({
        ...course,
        quiz_count: quizzesData.quizzes.length,
        quizzes: quizzesData.quizzes,
      });
    } catch (error) {
      console.error(`Error fetching quizzes for ${course.name}:`, error);
      setSelectedCourse({ ...course, quiz_count: 0, quizzes: [] });
    } finally {
      setIsCourseLoading(false);
    }
  }

  const selectedCourseQuizzes = selectedCourse?.quizzes ?? [];
  const filteredQuizzes = selectedCourseQuizzes.filter((quiz: any) => {
    const isPublished = quiz.status === 'published_on_canvas' || quiz.status === 'saved_to_canvas';
    const matchesFilter =
      quizFilter === 'all' ||
      (quizFilter === 'published' && isPublished) ||
      (quizFilter === 'drafts' && !isPublished);
    const matchesSearch = quiz.title?.toLowerCase().includes(quizSearch.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  if (isCourseLoading) return (
    <div className="page">
      <div className="quiz-review-loading-screen">
        <div className="loader" />
        <p className="quiz-review-loading-text">Retrieving Quiz</p>
      </div>
    </div>
  );
  
  return (
    <div>
      <NavBar />
    <div className="dashboard">
      <main className="main">
        {selectedCourse ? (
          <section className="section">
            <div className="quiz-header">
              <div className="sub-nav">
                <button
                  type="button"
                  className="review-back-nav"
                  onClick={() => {
                    setSelectedCourse(null);
                    setQuizFilter('all');
                    setQuizSearch('');
                  }}
                  aria-label="Go back"
                  style={{marginBottom: 0}}
                >
                  <img src={backArrow} className="back-arrow" alt="back" />
                </button>

                <h2 className="section-heading" style={{marginBottom: 0}}>{selectedCourse.name}</h2>  
              </div>

              <button 
              type="button" 
              className="btn-new-quiz"
              onClick={() => navigate('/quiz-structure', { state: { selectedCourseId: selectedCourse.id } })}
            >
              <PlusIcon size={20} weight="regular"/>Create new quiz
            </button>
            </div>
            {syncWarning && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.75rem 0', padding: '0.6rem 1rem', background: '#fff2f2', border: '1px solid #f5c6c6', borderRadius: '6px', color: '#c0392b', fontSize: '0.875rem' }}>
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>ⓘ</span>
                Unable to sync with Canvas at the moment.
              </div>
            )}
            <div className="quiz-filter-row">
              <div className="quiz-filter-pill" role="tablist" aria-label="Filter quizzes">
                <button
                  type="button"
                  className={`quiz-filter-btn ${quizFilter === 'drafts' ? 'is-active' : ''}`}
                  onClick={() => setQuizFilter('drafts')}
                >
                  Drafts
                </button>
                <button
                  type="button"
                  className={`quiz-filter-btn ${quizFilter === 'published' ? 'is-active' : ''}`}
                  onClick={() => setQuizFilter('published')}
                >
                  Published
                </button>
                <button
                  type="button"
                  className={`quiz-filter-btn ${quizFilter === 'all' ? 'is-active' : ''}`}
                  onClick={() => setQuizFilter('all')}
                >
                  All
                </button>
              </div>
            </div>

            <div className="quiz-search-wrap">
              <input
                type="text"
                className="quiz-search-input"
                placeholder="Search created quizzes"
                value={quizSearch}
                onChange={(event) => setQuizSearch(event.target.value)}
              />
            </div>

            <div className="course-quizzes">
              {filteredQuizzes.length > 0 ? (
                filteredQuizzes.map((quiz: any) => {
                  const isPublished = quiz.status === 'published_on_canvas' || quiz.status === 'saved_to_canvas';
                  const statusText = isPublished
                    ? quiz.status === 'published_on_canvas'
                      ? 'Published'
                      : 'Saved'
                    : 'Review';
                  const statusTone: 'Published' | 'Saved' | 'Review' = isPublished
                    ? quiz.status === 'published_on_canvas'
                      ? 'Published'
                      : 'Saved'
                    : 'Review';

                  return (
                    <QuizLayout
                      onClick={() => navigate(`/quiz-review?quiz_id=${quiz._id}`)}
                      key={quiz._id || quiz.id}
                      icon={isPublished ? 'published' : 'draft'}
                      title={quiz.title}
                      imageAlt={quiz.title}
                      count={quiz.question_count}
                      singularLabel="question"
                      pluralLabel="questions"
                      statusText={statusText}
                      statusTone={statusTone}
                    />
                  );
                })
              ) : (
                <p>No quizzes match the selected filter.</p>
              )}
            </div>
          </section>
        ) : (
          <section className="section">
            {/* Cached quizzes section */}
            <h2 className="section-heading">Continue working</h2>
            <div className="cards">
                {cachedQuizzes.map((quiz: any) => (
                  <QuizLayout
                    key={quiz.id}
                    icon="draft"
                    title={quiz.title}
                    count={quiz.question_count}
                    singularLabel="question"
                    pluralLabel="questions"
                    statusText='Editing'
                    statusTone='Editing'
                    date="April 14, 2026"
                  />
                ))}
            </div>
            <h2 className="section-heading">Your courses</h2>
            <div className="cards">
              {loading ? (
                <div className="loading-status" role="status" aria-live="polite">
                  <span className="loading-dots" aria-hidden="true">
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>
                </div>
              ) : coursesWithQuizzes.length > 0 ? (
                coursesWithQuizzes.map((course) => (
                  <article 
                    className="card" 
                    key={course.id}
                    onClick={() => handleCourseClick(course)}
                    style={{ cursor: 'pointer' }}
                  >
                    <img src={cardImg} alt={course.name} className="card-image" />
                    <h3 className="card-title">{course.name}</h3>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#666' }}>
                      {course.quiz_count} {course.quiz_count === 1 ? 'quiz' : 'quizzes'}
                    </p>
                  </article>
                ))
              ) : (
                <p>No courses found</p>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
    </div>
  );
}

export default Dashboard;