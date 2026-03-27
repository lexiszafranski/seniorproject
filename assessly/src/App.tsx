import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, useAuth } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';
import './styles/App.css';
import Dashboard from './pages/dashboard';
import Login from './pages/login';
import AddCourses from './pages/addCourses';
import Tokens from './pages/tokens';
import QuizStructure from './pages/quizStructure';

function App() {
  const { getToken, isSignedIn } = useAuth();
  const [hasCanvasToken, setHasCanvasToken] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
        const response = await fetch('http://localhost:8000/api/me', {
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

  if (loading) return <div>Loading...</div>;

  return (
    <BrowserRouter>
      <Routes>

        {/* Login Route */}
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
                <div>Loading...</div>
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
                <div>Loading...</div>
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
                <div>Loading...</div>
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
                <Navigate to="/login" replace />
              </SignedOut>

              <SignedIn>
                {hasCanvasToken === null ? (
                  <div>Loading...</div>
                ) : (
                  <Navigate to={hasCanvasToken ? "/dashboard" : "/tokens"} replace />
                )}
              </SignedIn>
            </>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;