import { SignedIn, SignedOut } from '@clerk/clerk-react';
import Dashboard from './pages/dashboard';
import Login from './pages/login';

function App() {
  return (
    <>
      <SignedIn>
        <Dashboard />
      </SignedIn>
      <SignedOut>
        <Login />
      </SignedOut>
    </>
  );
}

export default App;