import { useUser, useAuth } from '@clerk/clerk-react';
import '../styles/dashboard.css';
import ufImg from '../assets/ufimg.png';
import cardImg from '../assets/cardimg.jpg';
import { useEffect, useState } from 'react';
import { api } from "../config/api";

function Dashboard() {
  const { user } = useUser();
  const { getToken, isSignedIn } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [coursesWithQuizzes, setCoursesWithQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  
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
          <button type="button" className="btn-new-quiz">New Quiz</button>
          <div className="header-avatar" />
        </div>
      </header>

      <hr className="separator" />

      <main className="main">
        {selectedCourse ? (
          <section className="section">
            <button 
              onClick={() => setSelectedCourse(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#000',
                cursor: 'pointer',
                fontSize: '1rem',
                marginBottom: '1rem',
                textDecoration: 'underline'
              }}
            >
              ← Back to Courses
            </button>
            <h2 className="section-heading">Your Practice Quizzes</h2>
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
          </section>
        ) : (
          <section className="section">
            <h2 className="section-heading">Dashboard</h2>
            <div className="cards">
              {loading ? (
                <p>Loading courses...</p>
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
