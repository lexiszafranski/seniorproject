import { SignIn } from '@clerk/clerk-react';
import '../styles/Login.css';
import '../styles/landing.css';
import Character from '../assets/login_character.png';
// import { Link } from 'react-router-dom';

function Login() {
  return (
    <div className="login">
      
        {/* <div className="landing-frame">
        <header className="landing-nav soft-panel">
            <Link to="/" className="brand" aria-label="Assessly home">
                Assessly
            </Link>
        </header>
        </div> */}

      <div className="login-page">`
        <div className="image-container">
          <img src={Character} className="login-img" alt="Login Image"/>
        </div>
        <div className="inputLogin">
          <div className="close-container">
            <h1 className="main-title">WELCOME TO ASSESSLY</h1>
            <p className="sub-title">Generate practice quizzes from course content</p>
          </div>
          <div className="clerk-signin-wrap">
            <SignIn routing="virtual" />
          </div>
          
        </div>
      </div>
    </div>
  );
}

export default Login;