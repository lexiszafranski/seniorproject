import loginImg from '../assets/Login/Login_Image.png';
import '../styles/Login.css';
import {useState} from 'react';
function AddCourses() {
    // Placeholder for courses, replace with actual data fetching logic
    const [courses, setCourses] = useState([
        {id: 1, name: "COP3530 - Data Structures and Algorithms", isChecked: false}, 
        {id: 2, name: "COP3502 - Programming Fundamentals 1", isChecked: false}, 
        {id: 3, name: "COP3503 - Programming Fundamentals 2", isChecked: false}
    ]); 
    const handleCheckboxChange = (index: number) => {
        const updatedCourses = [...courses];
        updatedCourses[index].isChecked = !updatedCourses[index].isChecked;
        setCourses(updatedCourses);
    }
    const handleAddToDashboard = () => {
        const selectedCourses = courses.filter(course => course.isChecked);
        console.log("Selected Courses:", selectedCourses);
        // Add logic to add selected courses to the dashboard
    }
    
    return (
    <div className="login">
    <div className="login-page">
        <div className="image-container">
            <img src={loginImg} className="login-img" alt="Login Image"/>
        </div>
        <div className="input">
            {
                courses.map((course, index) => (
                <div key={course.id}>
                <div className={`checkmark ${course.isChecked ? 'checked-style' : ''}`}>
                    <label className="course-label">
                        <input type="checkbox" 
                        checked={course.isChecked} 
                        onChange={() => handleCheckboxChange(index)}/>
                    {course.name}
                    </label>
                {course.isChecked && <span className="checkmark-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <g clipPath="url(#clip0_208_19)">
                    <path d="M5 18L12 25L28 9" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </g>
                    <defs>
                    <clipPath id="clip0_208_19">
                    <rect width="32" height="32" fill="white"/>
                    </clipPath>
                    </defs>
                    </svg>
            </span>}
        </div>
        <hr/>
    </div>
))
            }
            <button className="login-button" onClick={handleAddToDashboard}>Add to dashboard</button>
        </div>
    </div>
    </div>
  );
}
export default AddCourses;