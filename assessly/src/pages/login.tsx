import loginImg from '../assets/Login/Login_Image.png';
import '../styles/Login.css';
function Login() {
  return (
    <div className="login">
    <div className="login-page">
        <div className="image-container">
            <img src={loginImg} className="login-img" alt="Login Image"/>
        </div>
        <div className="input">
            <div className="close-container">
                <h1 className="main-title">WELCOME TO ASSESSLY</h1>
                <p className="sub-title">Generate practice quizzes from course content</p>
            </div>
            <input type="text" placeholder="Username" className="input-field"/>
            <input type="password" placeholder="Password" className="input-field"/>
            <button className="login-button">Login</button>
            <div className="registration-container">
                <p>Not a member?</p>
                <p className="register-button"><b>Register Now!</b></p>
            </div>
            
        </div>
    </div>
    </div>
  );
}
export default Login;