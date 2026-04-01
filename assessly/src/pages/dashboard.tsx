import { useUser, useClerk } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import '../styles/dashboard.css';
import ufImg from '../assets/ufimg.png';
import cardImg from '../assets/cardimg.jpg';
import { useEffect, useState } from 'react';
import { api } from "../config/api";
import backArrow from '../assets/Caret_Left.png';


function Dashboard() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const [, setCourses] = useState<any[]>([]);
  const [coursesWithQuizzes, setCoursesWithQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const userInitial = (
    user?.firstName?.[0] ||
    user?.lastName?.[0] ||
    user?.fullName?.[0] ||
    user?.primaryEmailAddress?.emailAddress?.[0] ||
    'U'
  ).toUpperCase();

  async function handleLogout() {
    await signOut({ redirectUrl: '/login' });
  }
  
  useEffect(() => {
    async function loadCoursesAndQuizzes() {
      setLoading(true);
      try {
        // Fetch courses
        const data = await api.syncCourses();
        console.log("All Courses:", data.courses);
        
        // Filter to only Teacher/TA courses
        const teacherCourses = data.courses.filter((course: any) => {
          const validRoles = ['TeacherEnrollment', 'TaEnrollment', 'DesignerEnrollment'];
          return course.enrollments?.some((enrollment: any) => 
            validRoles.includes(enrollment.role)
          );
        });
        
        console.log("Teacher/TA Courses:", teacherCourses);
        setCourses(teacherCourses);
        
        // Only fetch quizzes for Teacher/TA courses
        if (teacherCourses.length > 0) {
          const coursesData = await Promise.all(
            teacherCourses.map(async (course: any) => {
              try {
                const quizzesData = await api.getQuizzes(course.id);
                return {
                  ...course,
                  quiz_count: quizzesData.quiz_count,
                  quizzes: quizzesData.quizzes
                };
              } catch (error) {
                console.error(`Error fetching quizzes for ${course.name}:`, error);
                return {
                  ...course,
                  quiz_count: 0,
                  quizzes: []
                };
              }
            })
          );
          setCoursesWithQuizzes(coursesData);
        } else {
          setCoursesWithQuizzes([]);
        }
      } catch (error) {
        console.error("Error loading courses:", error);
      } finally {
        setLoading(false);
      }
    }
    loadCoursesAndQuizzes();
  }, []);
  
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
        {selectedCourse ? (
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
              onClick={() => navigate('/quiz-structure')}
            >
              New Quiz
            </button>
            </div>
            <h2 className="section-heading" style={{fontWeight: "400"}}>Published</h2>
            <div className="cards">
              {selectedCourse.quizzes && selectedCourse.quizzes.length > 0 ? (
                selectedCourse.quizzes.map((quiz: any) => (
                  <article className="card" key={quiz.id}>
                    <img src={cardImg} alt={quiz.title} className="card-image" />
                    <h3 className="card-title">{quiz.title}</h3>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#666' }}>
                      {quiz.question_count} {quiz.question_count === 1 ? 'question' : 'questions'} • {quiz.points_possible} points
                    </p>
                  </article>
                ))
              ) : (
                <p>No quizzes found for this course</p>
              )}
            </div>
            {/* need to store drafts or unplublished quizzes here  */}
             <h2 className="section-heading" style={{fontWeight: "400"}}>Drafts</h2>
             <div>

             </div>
          </section>
        ) : (
          <section className="section">
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
                    onClick={() => setSelectedCourse(course)}
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