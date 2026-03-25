import sideImg from '../assets/Quiz_Structure_Graphic.png';
import questionMark from '../assets/Question_Mark.png';
import greenBackground from '../assets/Green_Box.png';
import backArrow from '../assets/Caret_Left.png';

import '../styles/quizStructure.css';

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../config/api';

// import {ToggleButton} from './ToggleButton';


function QuizStructure() {
    const [courseId] = useState<number>(63265314);
    const [files, setFiles] = useState<any[]>([]);
    const [selectedFileIds, setSelectedFileIds] = useState<number[]>([]);
    const [isLoadingFiles, setIsLoadingFiles] = useState(false);
    const [filesError, setFilesError] = useState<string | null>(null);
    const [prevQuizzes, setPrevQuizzes] = useState<any[]>([]);

    //Canvas Quiz Attributes 
    const [title, setTitle] = useState("");
    const [assignment_group_id, setAssignmentGroupId] = useState<number[]>([]);
    const [points_possible, setPointsPossible] = useState("");  //TODO: change to number when form submitted 
    const [instructions, setInstructions] = useState("");
    const [multiple_attempts_enabled, setMultipleAttemptsEnabled] = useState(false);
    const [has_time_limit, setHasTimeLimit] = useState(false);
    const [session_time_limit_in_seconds, setSessionTimeLimitInSeconds] = useState<number | null>(null);
    const [result_view_restricted, setResultViewRestricted] = useState(false);
    const [displayResultsWithItems, setDisplayResultsWithItems] = useState(false);
    const [isAssignmentGroupOpen, setIsAssignmentGroupOpen] = useState(false);

    //AI Prompt attributes
    const [questionNum, setQuestionNum] = useState("");
    const [enableImageGeneration, setEnableImageGeneration] = useState(false);
    const [additionalNotes, setAdditionalNotes] = useState("");

    //TODO: Retrieve assignment group ids, DUMMY DATA
    const [userAssignmentGroupIds] = useState([{id: 1, name: "Quizzes"}, {id: 2, name: "Ungraded"}]);

    const structureQuestions = [
    {id: 1, title: "Which course quizzes would you like the quiz to be based on?", },
    {id: 2, title: "Which content would like to be included in the quiz?"},
    {id: 3, title: "Canvas Quiz Structure"},
    {id: 4, title: "AI Prompting"}
    ]
    const [index, setIndex] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        async function loadFiles() {
            setIsLoadingFiles(true);
            setFilesError(null);

            try {
                const response = await api.getFiles(courseId);
                setFiles(response?.files || []);
            } catch (error) {
                console.error('Failed to load files:', error);
                setFilesError('Failed to load Canvas files.');
            } finally {
                setIsLoadingFiles(false);
            }
        }
        async function loadQuizzes() {
            try {
                const response = await api.getQuizzes(courseId);
                setPrevQuizzes(response?.quizzes || []);
            } catch (error) {
                console.error('Failed to load quizzes:', error);
            }
        }

        loadFiles();
        loadQuizzes();
    }, [courseId]);

    function handleFileToggle(fileId: number) {
        setSelectedFileIds((prevSelectedFileIds) => {
            if (prevSelectedFileIds.includes(fileId)) {
                return prevSelectedFileIds.filter((id) => id !== fileId);
            }

            return [...prevSelectedFileIds, fileId];
        });
    }

    function handleAssignmentGroup(fileId: number) {
        setAssignmentGroupId((prevSelectedFileIds) => {
            if (prevSelectedFileIds.includes(fileId)) {
                return prevSelectedFileIds.filter((id) => id !== fileId);
            }
            return [...prevSelectedFileIds, fileId];
        });
    }

    function incrementIndex() {
        setIndex((prevIndex) => {
            if (prevIndex >= structureQuestions.length - 1) {
                return prevIndex;
            }
            return prevIndex + 1;
        });
    }

    function decrementIndex() {
        setIndex((prevIndex) => {
            if (prevIndex <= 0) {
                return prevIndex;
            }
            return prevIndex - 1;
        });
    }

    function getFormResults() {
        console.log("Selected Files: ", files);
        console.log("Quiz Title: ", title);
        console.log("Assignment Group ID: ", assignment_group_id);
        console.log("Points Possible: ", points_possible);
        console.log("Instructions: ", instructions);
        console.log("Multiple Attempts Enabled: ", multiple_attempts_enabled);
        console.log("Has Time Limit: ", has_time_limit);
        console.log("Session Time Limit in Seconds: ", session_time_limit_in_seconds); 
        console.log("Result View Restricted: ", result_view_restricted);
        console.log("Display Results with Items: ", displayResultsWithItems);
        console.log("Number of Questions to Generate: ", questionNum);
        console.log("Enable Image Generation: ", enableImageGeneration);
        console.log("Additional Prompting Notes: ", additionalNotes);
    }   

    function getQuizQuestionContent() {
        //Choose Canvas Quizzes 
        if (index === 0) {
            
            return (
                <div>
                    {prevQuizzes.length === 0 && (
                        <p>No previous quizzes found for this course to reference</p>
                    )}

                    {prevQuizzes.length > 0 && (
                        prevQuizzes.map((quiz) => (
                            <label key={quiz.id} className="quizFileOption">
                                <input
                                    type="checkbox"
                                    checked={selectedFileIds.includes(quiz.id)}
                                    onChange={() => handleFileToggle(quiz.id)}
                                    className="quizCheckbox"
                                />
                                {quiz.title}
                            </label>
                        ))
                    )}
                </div>
            );
        }
        //Choose Canvas materials 
        else if (index === 1) {
            return (
                <div>
                    {isLoadingFiles && <p>Loading Canvas files...</p>}
                    {filesError && <p>{filesError}</p>}

                    {!isLoadingFiles && !filesError && files.length === 0 && (
                        <p>No files found for this course</p>
                    )}

                    {!isLoadingFiles && !filesError && files.length > 0 && (
                        files.map((file) => (
                            <label key={file.id} className="quizFileOption">
                                <input
                                    type="checkbox"
                                    checked={selectedFileIds.includes(file.id)}
                                    onChange={() => handleFileToggle(file.id)}
                                    className="quizCheckbox"
                                />
                                {file.display_name}
                            </label>
                        ))
                    )}
                </div>
            );
        }
        //Quiz Qualities 
        else if (index === 2) {
            /*
            Canvas needs

            Course ID:                             course_id                                                         (int)
            Quiz title:                            quiz[title]                                                       (string)
            //Quiz assigment group id:               quiz[assignment_group_id]                                         (int)
            Quiz points:                           quiz[points_possible]                                             (number)
            Quiz instructions:                     quiz[instructions]                                                (string)
            Enable multiple attempts:              quiz[quiz_settings][multiple_attempts][multiple_attempts_enabled] (boolean)
            Enable quiz time limit:                quiz[quiz_settings][has_time_limit]                               (boolean)
            Set quiz time limit:                   quiz[quiz_settings][session_time_limit_in_seconds]                (Positive int)
            Enable display results:                quiz[quiz_settings][result_view_settings][result_view_restricted] (boolean)
            Enable display items in results view:  quiz[quiz_settings][result_view_settings][display_items]          (boolean)   
            */
            return (
                <div className="quizQuestionContainer" style={{ maxHeight: '25vh', overflowY: 'auto', overflowX: 'hidden' }}>
                    {/* Quiz Title */}
                    <div className="quizQuestionContainer">
                        <p>Quiz Title</p>
                        <input type="text" 
                        id = "quiz_title"
                        value={title} 
                        onChange={(e) => setTitle(e.target.value)}
                        className="quizInputText"
                        />
                    </div>
                    {/* TODO: Assignment group id */}
                    <div className="quizQuestionContainer">
                        <p>Assignment Group</p>
                        <div className="dropdown">
                            <button
                                type="button"
                                className={`dropdown-main ${isAssignmentGroupOpen ? 'open' : ''}`}
                                onClick={() => setIsAssignmentGroupOpen((prev) => !prev)}
                                aria-expanded={isAssignmentGroupOpen}
                                aria-label="Toggle assignment group options"
                            >
                                <span className="dropdown-title"></span>
                                <span className="dropdown-chevron" aria-hidden="true"></span>
                            </button>
                            {isAssignmentGroupOpen && (
                                <div className="dropdown-options">
                                    {userAssignmentGroupIds.map((group) => (
                                        <label key={group.id} className="quizFileOption">
                                            <input
                                                type="checkbox"
                                                checked={assignment_group_id.includes(group.id)}
                                                onChange={() => handleAssignmentGroup(group.id)}
                                                className="quizCheckbox"
                                            />
                                            {group.name}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Quiz Points */}
                    <div className="quizQuestionContainer">
                        <p>Quiz Points</p>
                        <input type="text" 
                        id = "quiz_points"
                        value={points_possible} 
                        onChange={(e) => setPointsPossible(e.target.value)}
                        className="quizInputText"
                        />
                    </div>
                    {/* Quiz Instructions */}
                    <div className="quizQuestionContainer">
                        <p>Quiz Instructions</p>
                        <input type="text" 
                        id = "quiz_instructions"
                        value={instructions} 
                        onChange={(e) => setInstructions(e.target.value)}
                        className="quizInputText"
                        />
                    </div>
                    {/* Multiple attempt toggle */}
                    <div className="quizQuestionContainerToggle">
                        <p>Enable Multiple Attempts</p>
                        <label className="toggleSwitch">
                            <input type="checkbox"
                            checked={multiple_attempts_enabled}
                            onChange={(e) => setMultipleAttemptsEnabled(e.target.checked)}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                    {/* Time limit toggle */}
                    <div className="quizQuestionContainerToggle">
                        <p>Enable Time Limit</p>
                        <label className="toggleSwitch">
                            <input type="checkbox"
                            checked={has_time_limit}
                            onChange={(e) => setHasTimeLimit(e.target.checked)}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                    {/* Time Limit  */}
                    {has_time_limit && (
                        <div className="quizQuestionContainer">
                            <p>Time Limit (in seconds)</p>
                            <input type="number" 
                            id = "quiz_time_limit"
                            value={session_time_limit_in_seconds || ''} 
                            onChange={(e) => setSessionTimeLimitInSeconds(Number(e.target.value))}
                            className="quizInputText"
                            />
                        </div>
                    )}
                    {/* Display results toggle  */}
                    <div className="quizQuestionContainerToggle">
                        <p>Display Results</p>
                        <label className="toggleSwitch">
                            <input type="checkbox"
                            checked={result_view_restricted}
                            onChange={(e) => setResultViewRestricted(e.target.checked)}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                    {/* Display results with items  */}
                    <div className="quizQuestionContainerToggle">
                        <p>Display Results with Items</p>
                        <label className="toggleSwitch">
                            <input type="checkbox"
                            checked={displayResultsWithItems}
                            onChange={(e) => setDisplayResultsWithItems(e.target.checked)}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                </div>

            );
        }
        //AI Prompt 
        else {
            /*
            API needs 

            - number of questions
            - question types: Categorization, Essay, Fill in the Blank, Formula, Hot Spot, Matching, Multiple Choice, 
            Multiple Answer, Numeric, Ordering, True or False, Stimulus 
            - enable image generation
            */
            return (
                <div className="quizQuestionContainer" style={{ maxHeight: '25vh', overflowY: 'auto', overflowX: 'hidden' }}>
                    {/* Quiz questions */}
                    <div className="quizQuestionContainer">
                        <p>Number of Questions to Generate</p>
                        <input type="text" 
                        id = "quiz_questions"
                        value={questionNum} 
                        onChange={(e) => setQuestionNum(e.target.value)}
                        className="quizInputText"
                        />
                    </div>
                    {/* Image generation toggle  */}
                    <div className="quizQuestionContainerToggle">
                        <p>Enable Image Generation</p>
                        <label className="toggleSwitch">
                            <input type="checkbox"
                            checked={enableImageGeneration}
                            onChange={(e) => setEnableImageGeneration(e.target.checked)}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                    {/* Additional prompting notes */}
                    <div className="quizQuestionContainer">
                        <p>Additional prompting notes</p>
                        <input type="text" 
                        id = "quiz_additional_notes"
                        value={additionalNotes} 
                        onChange={(e) => setAdditionalNotes(e.target.value)}
                        className="quizInputText"
                        />
                    </div>
                </div>
            );
        }

        return null;
    }

    return (
    <div className='page'>
        <div className="top-bar">
            <h2 className="top-bar-text" onClick={() => navigate('/dashboard')}>ASSESSLY</h2>
            <img src={questionMark} alt="Help button" className="top-bar-help"/>
        </div>
        <hr></hr>
        <div className="content">
            <div className="left">
                <img src={backArrow} className="back-arrow" alt="Back button"/>
                <div className="image-container-white">
                    <img src={sideImg} className="quiz-img" alt="Quiz Structure Image"/>
                </div>
            </div>
        
            <div className="questions-container">
                <img src={greenBackground} className="green-background" alt="Green Background"/>
                <div className="questions">
                    <p className="question-num">{structureQuestions[index].id}/{structureQuestions.length}</p>
                    <h3 className="question-text">{structureQuestions[index].title}</h3>
                    {getQuizQuestionContent()}
                    
                    {/* For button displays: back and next */}
                    {index === 0 ?
                        <div className="buttons" style={{display: "flex", justifyContent: "flex-end"}}>
                            <button className="button-next" onClick={() => incrementIndex()}>Next</button>
                        </div>     
                        :
                        <div className="buttons">
                            <button className="button-back" onClick={() => decrementIndex()}>Back</button>
                            {index !== structureQuestions.length - 1 ?
                                <button className="button-next" onClick={() => incrementIndex()}>Next</button>
                                :
                                <button className="button-next" onClick={() => getFormResults()}>Submit</button>
                            }
                        </div>
                    }
                </div>
            </div>
        </div>
    </div>
    );
}
export default QuizStructure;