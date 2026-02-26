import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, useAuth } from '@clerk/clerk-react';
import { useEffect } from 'react';
import './styles/App.css';
import Dashboard from './pages/dashboard';
import Login from './pages/login';

function App() {
   const { getToken, isSignedIn } = useAuth();
  // Automatically sync user to backend when logged in
  useEffect(() => {
    async function syncUser() {
      if (isSignedIn) {
        try {
          const token = await getToken();
          await fetch('http://localhost:8000/api/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          console.log('User synced to backend');
        } catch (error) {
          console.error('Failed to sync user:', error);
        }
      }
    }
    syncUser();
  }, [isSignedIn, getToken]);

  return (
    <BrowserRouter>
      <Routes>

        {/* Login Route */}
        <Route
          path="/login"
          element={
            <>
              <SignedOut>
                <Login />
              </SignedOut>

              {/* If already signed in, skip login */}
              <SignedIn>
                <Navigate to="/dashboard" replace />
              </SignedIn>
            </>
          }
        />

        {/* Dashboard Route */}
        <Route
          path="/dashboard"
          element={
            <>
              <SignedIn>
                <Dashboard />
              </SignedIn>

              {/* If not signed in, go to login */}
              <SignedOut>
                <Navigate to="/login" replace />
              </SignedOut>
            </>
          }
        />

        {/* Root login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Anything else = login */}
        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;