import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, useAuth } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';
import './styles/App.css';
import Dashboard from './pages/dashboard';
import Login from './pages/login';
import Landing from './pages/landing';
import AddCourses from './pages/addCourses';
import Tokens from './pages/tokens';
import QuizStructure from './pages/quizStructure';
import QuizReview from './pages/quizReview';
import { API_BASE } from './config/api';

function App() {
  const { getToken, isSignedIn } = useAuth();
  const [hasCanvasToken, setHasCanvasToken] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger] = useState(0);

  const loadingIndicator = (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <div className="loading-status">
        <span className="loading-dots" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </div>
    </div>
  );

  // Check for canvas token and sync user
  useEffect(() => {
    async function syncUserAndCheckToken() {
      if (!isSignedIn) {
        setHasCanvasToken(null);
        setLoading(false);
        return;
      }

      try {
        const token = await getToken();
        //const response = await fetch('http://localhost:8000/api/me', {
        const response = await fetch(`${API_BASE}/api/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
          if (hasCanvasToken !== true) setHasCanvasToken(false);
          return;
        }

        const userData = await response.json();
        console.log("User Data:", userData);

        const serverHasToken = userData.has_canvas_token && userData.has_gemini_token;

        if (hasCanvasToken === true && !serverHasToken) return;

        setHasCanvasToken(serverHasToken);

      } catch (error) {
        console.error('Failed to sync user:', error);
        if (hasCanvasToken !== true) setHasCanvasToken(false);
      } finally {
        setLoading(false);
      }
    }

    syncUserAndCheckToken();
  }, [isSignedIn, getToken, refreshTrigger, hasCanvasToken]);

  if (loading) return loadingIndicator;

  return (
    <BrowserRouter>
      <Routes>
        {/* Login Route */}
        <Route
          path="/landing"
          element={
            <SignedOut>
              <Landing />
            </SignedOut>
          }
        />
        <Route
          path="/login"
          element={
            <SignedOut>
              <Login />
            </SignedOut>
          }
        />
        {/* If already signed in, skip login */}
        <Route
          path="/tokens"
          element={
            <SignedIn>
              {hasCanvasToken ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Tokens
                  onTokensSaved={() => {
                    setHasCanvasToken(true); 
                  }}
                />
              )}
            </SignedIn>
          }
        />
         {/* Dashboard Route */}
        <Route
          path="/dashboard"
          element={
            <SignedIn>
              {hasCanvasToken === null ? (
                loadingIndicator
              ) : hasCanvasToken ? (
                <Dashboard />
              ) : (
                <Navigate to="/tokens" replace />
              )}
            </SignedIn>
          }
        />
        {/* Quiz Structure Route */}
        <Route
          path="/quiz-structure"
          element={
            <SignedIn>
              {hasCanvasToken === null ? (
                loadingIndicator
              ) : hasCanvasToken ? (
                <QuizStructure />
              ) : (
                <Navigate to="/tokens" replace />
              )}
            </SignedIn>
          }
        />
        {/* Add Courses Route */}
        <Route
          path="/add-courses"
          element={
            <SignedIn>
              {hasCanvasToken === null ? (
                loadingIndicator
              ) : hasCanvasToken ? (
                <AddCourses />
              ) : (
                <Navigate to="/tokens" replace />
              )}
            </SignedIn>
          }
        />
         {/* If not signed in, go to login */}
        <Route
          path="/"
          element={
            <>
              <SignedOut>
                <Landing />
              </SignedOut>

              <SignedIn>
                {hasCanvasToken === null ? (
                  loadingIndicator
                ) : (
                  <Navigate to={hasCanvasToken ? "/dashboard" : "/tokens"} replace />
                )}
              </SignedIn>
            </>
          }
        />

        {/* Quiz Review Route */}
        <Route
          path="/quiz-review"
          element={
            <SignedIn>
              {hasCanvasToken === null ? (
                <div>Loading...</div>
              ) : hasCanvasToken ? (
                <QuizReview />
              ) : (
                <Navigate to="/tokens" replace />
              )}
            </SignedIn>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
