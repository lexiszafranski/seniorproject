import loginImg from '../assets/Login/Login_Image.png';
import '../styles/Login.css';
import {useState} from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config/api';

function Tokens({ onTokensSaved }: { onTokensSaved: () => void }) {
  const [canvasToken, setCanvasToken] = useState('');
  const [geminiToken, setGeminiToken] = useState('');
  const [loading, setLoading] = useState(false);
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!canvasToken || !geminiToken) {
      alert('Please fill in both tokens');
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE}/api/tokens`, {  
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          canvasToken: canvasToken,
          geminiToken: geminiToken
        })
      });

      if (response.ok) {
        onTokensSaved();
        navigate('/dashboard');
      } else {
        const data = await response.json();
        alert(data.detail || 'Failed to save tokens');
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
            <input type="text" placeholder="Gemini API Key" className="input-field" value={geminiToken} onChange={(e) => setGeminiToken(e.target.value)}/>
            <button className="login-button" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Saving...' : 'Continue'}
            </button>
        </div>
    </div>
    </div>
  );
}
export default Tokens;