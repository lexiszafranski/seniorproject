import { useUser, useClerk } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import '../styles/dashboard.css';
import '../styles/quizStructure.css';
import ufImg from '../assets/ufimg.png';
import cardImg from '../assets/cardimg.jpg';
import { useEffect, useState } from 'react';
import { api } from "../config/api";
import backArrow from '../assets/Caret_Left.png';


function Dashboard() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const [coursesWithQuizzes, setCoursesWithQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [isCourseLoading, setIsCourseLoading] = useState(false);
  const [syncWarning, setSyncWarning] = useState(false);
  // TODO: retrieve recently drafted quizzes 
  //const [cachedQuizzes, setCachedQuizzes] = useState<any[]>([]);
  // Dummy data 
  const cachedQuizzes = [
    {"id": 1000, "title": "Temp Quiz 1", question_count: 10, points_possible: 10},
    {"id": 2000, "title": "Temp Quiz 2", question_count: 15, points_possible: 15}
  ];
  const userInitial = (
    user?.firstName?.[0] ||
    user?.lastName?.[0] ||
    user?.fullName?.[0] ||
    user?.primaryEmailAddress?.emailAddress?.[0] ||
    'U'
  ).toUpperCase();

  async function handleLogout() {
    await signOut({ redirectUrl: '/landing' });
  }
  
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
  
  return (
    <div className="dashboard">
      <header className="header">
        <div className="header-logo">
        <img src={ufImg} alt="description" style={{ width: '100px', height: 'auto'}} />
        </div>
        <h1 className="header-welcome">WELCOME BACK, {user?.firstName?.toUpperCase() || 'User'}!</h1>
        <div className="header-actions">
          {/* <button 
            type="button" 
            className="btn-new-quiz"
            onClick={() => navigate('/quiz-structure')}
          >
            New Quiz
          </button> */}
          <div className="header-avatar" aria-label="User profile initial">
            {userInitial}
          </div>
          <button type="button" className="btn-logout" onClick={handleLogout}>
            <span className="btn-logout-icon" aria-hidden="true"></span>
          </button>
        </div>
      </header>

      <hr className="separator" />

      <main className="main">
        {isCourseLoading ? (
          <div className="quiz-review-loading-screen">
            <div className="loader" />
            <p className="quiz-review-loading-text">Retrieving Course Practice Material</p>
          </div>
        ) : selectedCourse ? (
          <section className="section">
            <div className="quiz-header">
              <div className="sub-nav">
                <button
                  type="button"
                  className="review-back-nav"
                  onClick={() => setSelectedCourse(null)}
                  aria-label="Go back"
                  style={{marginBottom: 0}}
                >
                  <img src={backArrow} className="back-arrow" alt="" />
                </button>

                <h2 className="section-heading" style={{marginBottom: 0}}>Your Practice Quizzes</h2>  
              </div>

              <button 
              type="button" 
              className="btn-new-quiz"
              onClick={() => navigate('/quiz-structure', { state: { selectedCourseId: selectedCourse.id } })}
            >
              New Quiz
            </button>
            </div>
            {syncWarning && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.75rem 0', padding: '0.6rem 1rem', background: '#fff2f2', border: '1px solid #f5c6c6', borderRadius: '6px', color: '#c0392b', fontSize: '0.875rem' }}>
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>ⓘ</span>
                Unable to sync with Canvas at the moment.
              </div>
            )}
            <h2 className="section-heading" style={{fontWeight: "400"}}>Synced with Canvas</h2>
            <div className="cards">
              {selectedCourse.quizzes?.filter((q: any) => q.status === 'published_on_canvas' || q.status === 'saved_to_canvas').length > 0 ? (
                selectedCourse.quizzes.filter((q: any) => q.status === 'published_on_canvas' || q.status === 'saved_to_canvas').map((quiz: any) => (
                  <article className="card" key={quiz._id} onClick={() => navigate(`/quiz-review?quiz_id=${quiz._id}`)} style={{ cursor: 'pointer' }}>
                    <img src={cardImg} alt={quiz.title} className="card-image" />
                    <h3 className="card-title">{quiz.title}</h3>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#666' }}>
                      {quiz.question_count} {quiz.question_count === 1 ? 'Question' : 'Questions'}
                    </p>
                    {quiz.status === 'published_on_canvas' ? (
                      <span style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#2e7d5e', background: 'rgba(46,125,94,0.1)', border: '1px solid rgba(46,125,94,0.3)', borderRadius: '4px', padding: '2px 8px' }}>
                        Published
                      </span>
                    ) : (
                      <span style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#b07d00', background: 'rgba(176,125,0,0.1)', border: '1px solid rgba(176,125,0,0.3)', borderRadius: '4px', padding: '2px 8px' }}>
                        Saved to Canvas
                      </span>
                    )}
                  </article>
                ))
              ) : (
                <p>No quizzes synced with Canvas</p>
              )}
            </div>
            <h2 className="section-heading" style={{fontWeight: "400"}}>Drafts</h2>
            <div className="cards">
              {selectedCourse.quizzes?.filter((q: any) => q.status !== 'published_on_canvas' && q.status !== 'saved_to_canvas').length > 0 ? (
                selectedCourse.quizzes.filter((q: any) => q.status !== 'published_on_canvas' && q.status !== 'saved_to_canvas').map((quiz: any) => (
                  <article className="card" key={quiz._id} onClick={() => navigate(`/quiz-review?quiz_id=${quiz._id}`)} style={{ cursor: 'pointer' }}>
                    <img src={cardImg} alt={quiz.title} className="card-image" />
                    <h3 className="card-title">{quiz.title}</h3>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#666' }}>
                      {quiz.question_count} {quiz.question_count === 1 ? 'Question' : 'Questions'}
                    </p>
                    <span style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#888', background: 'rgba(136,136,136,0.1)', border: '1px solid rgba(136,136,136,0.3)', borderRadius: '4px', padding: '2px 8px' }}>
                      Pending Review
                    </span>
                  </article>
                ))
              ) : (
                <p>No drafts</p>
              )}
            </div>
          </section>
        ) : (
          <section className="section">
            {/* Cached quizzes section */}
            <h2 className="section-heading">Continue working</h2>
            <div className="cards">
                {cachedQuizzes.map((quiz: any) => (
                  <article className="card" key={quiz.id}>
                    <img src={cardImg} alt={quiz.title} className="card-image" />
                    <h3 className="card-title">{quiz.title}</h3>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#666' }}>
                      {quiz.question_count} {quiz.question_count === 1 ? 'question' : 'questions'} • {quiz.points_possible} points
                    </p>
                  </article>
                ))}
            </div>
            <h2 className="section-heading">Dashboard</h2>
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
  );
}

export default Dashboard;