import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import './styles/App.css';
import Dashboard from './pages/dashboard';
import Login from './pages/login';

function App() {
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