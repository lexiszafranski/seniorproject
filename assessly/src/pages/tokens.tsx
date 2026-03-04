import loginImg from '../assets/Login/Login_Image.png';
import '../styles/Login.css';
import React, {useState} from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

function Tokens({ onTokensSaved }: { onTokensSaved: () => void }) {
  const [canvasToken, setCanvasToken] = useState('');
  const [navigatorToken, setNavigatorToken] = useState('');
  const [loading, setLoading] = useState(false);
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!canvasToken || !navigatorToken) {
      alert('Please fill in both tokens');
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const response = await fetch('http://localhost:8000/api/tokens', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          canvas_token: canvasToken,
          navigator_token: navigatorToken
        })
      });

      if (response.ok) {
        onTokensSaved(); // Update the token status in App.tsx
        navigate('/dashboard'); // Directly go to dashboard
      } else {
        alert('Failed to save tokens');
      }
    } catch (error) {
      console.error('Error saving tokens:', error);
      alert('Error saving tokens');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
    <div className="login-page">
        <div className="image-container">
            <img src={loginImg} className="login-img" alt="Login Image"/>
        </div>
        <div className="input">
            <input type="text" placeholder="Canvas Token" className="input-field" value={canvasToken} onChange={(e) => setCanvasToken(e.target.value)}/>
            <input type="text" placeholder="Navigator Token" className="input-field" value={navigatorToken} onChange={(e) => setNavigatorToken(e.target.value)}/>
            <button className="login-button" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Saving...' : 'Continue'}
            </button>
        </div>
    </div>
    </div>
  );
}
export default Tokens;