import questionMark from '../assets/Question_Mark.png';
import backArrow from '../assets/Caret_Left.png';

import '../styles/quizStructure.css';

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../config/api';

function QuizStructure() {
    // const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
    // Course selection
    // const [courses, setCourses] = useState<any[]>([]);
    //Selected course ID (from dashboard)
    const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
    // const [isLoadingCourses, setIsLoadingCourses] = useState(false);

    const [files, setFiles] = useState<any[]>([]);
    const [selectedFileIds, setSelectedFileIds] = useState<number[]>([]);
    const [materialSearchQuery, setMaterialSearchQuery] = useState("");
    const [isLoadingFiles, setIsLoadingFiles] = useState(false);
    const [filesError, setFilesError] = useState<string | null>(null);
    const [prevQuizzes, setPrevQuizzes] = useState<any[]>([]);
    const [selectedQuizIds, setSelectedQuizIds] = useState<number[]>([]);
    const [quizSearchQuery, setQuizSearchQuery] = useState("");

    // Quiz generation state
    const [isGenerating, setIsGenerating] = useState(false);
    // const [generatedQuiz, setGeneratedQuiz] = useState<any>(null);
    // const [generateError, setGenerateError] = useState<string | null>(null);

    //Canvas Quiz Attributes 
    const [title, setTitle] = useState("");
    const [assignment_group_id, setAssignmentGroupId] = useState<number[]>([]);
    const [points_possible, setPointsPossible] = useState("");
    const [instructions, setInstructions] = useState("");
    const [multiple_attempts_enabled, setMultipleAttemptsEnabled] = useState(false);
    const [has_time_limit, setHasTimeLimit] = useState(false);
    const [session_time_limit_in_seconds, setSessionTimeLimitInSeconds] = useState<number | null>(null);
    // const [result_view_restricted, setResultViewRestricted] = useState(false);
    const [displayResultsWithItems, setDisplayResultsWithItems] = useState(false);
    const [isAssignmentGroupOpen, setIsAssignmentGroupOpen] = useState(false);

    //AI Prompt attributes
    const [questionNum, setQuestionNum] = useState("");
    const [enableImageGeneration, setEnableImageGeneration] = useState(false);
    const [additionalNotes, setAdditionalNotes] = useState("");

    const [userAssignmentGroupIds] = useState([{id: 1, name: "Quizzes"}, {id: 2, name: "Ungraded"}]);
    const location = useLocation();

    const structureQuestions = [
        {id: 1, title: "Which course quizzes would you like the quiz to be based on?"},
        {id: 2, title: "Which content would like to be included in the quiz?"},
        {id: 3, title: "Canvas Quiz Structure"},
        {id: 4, title: "AI Prompting"}
    ]
    const [index, setIndex] = useState(0);
    const navigate = useNavigate();

    // Load courses on mount
    useEffect(() => {
        async function loadCourses() {
            // setIsLoadingCourses(true);
            try {
                // const data = await api.syncCourses();
                
                // const teacherCourses = data.courses.filter((course: any) => {
                //     const validRoles = ['TeacherEnrollment', 'TaEnrollment', 'DesignerEnrollment'];
                //     return course.enrollments?.some((enrollment: any) => 
                //         validRoles.includes(enrollment.role)
                //     );
                // });
                
                // setCourses(teacherCourses);
            } catch (error) {
                console.error('Failed to load courses:', error);
            } finally {
                // setIsLoadingCourses(false);
            }
        }
        loadCourses();
    }, []);

    useEffect(() => {
        const state = location.state as { selectedCourseId?: number } | null;
        if (state?.selectedCourseId != null) {
            setSelectedCourseId(state.selectedCourseId);
            console.log("course ID:" + selectedCourseId);
        }
    }, [location.state]);

    // Load files and quizzes when course is selected
    useEffect(() => {
        if (!selectedCourseId) return;
        const courseId = selectedCourseId;

        async function loadFiles() {
            setIsLoadingFiles(true);
            setFilesError(null);
            setMaterialSearchQuery("");

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
            setQuizSearchQuery("");
            try {
                const response = await api.getQuizzes(courseId);
                setPrevQuizzes(response?.quizzes || []);
            } catch (error) {
                console.error('Failed to load quizzes:', error);
            }
        }

        loadFiles();
        loadQuizzes();
    }, [selectedCourseId]);

    function handleFileToggle(fileId: number) {
        setSelectedFileIds((prev) => {
            if (prev.includes(fileId)) {
                return prev.filter((id) => id !== fileId);
            }
            return [...prev, fileId];
        });
    }

    function handleQuizToggle(quizId: number) {
        setSelectedQuizIds((prev) => {
            if (prev.includes(quizId)) {
                return prev.filter((id) => id !== quizId);
            }
            return [...prev, quizId];
        });
    }

    function handleAssignmentGroup(groupId: number) {
        setAssignmentGroupId((prev) => {
            if (prev.includes(groupId)) {
                return prev.filter((id) => id !== groupId);
            }
            return [...prev, groupId];
        });
    }

    function incrementIndex() {
        if (index === 0 && !selectedCourseId) {
            alert('Please select a course first');
            return;
        }
        
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

    async function handleSubmit() {
        // Get selected files with their full info
        const selectedFiles = files
            .filter(file => selectedFileIds.includes(file.id))
            .map(file => ({
                url: file.url,
                display_name: file.display_name,
                content_type: file['content-type'] || 'application/pdf'
            }));

        if (selectedFiles.length === 0) {
            alert('Please select at least one file to generate a quiz from');
            return;
        }

        setIsGenerating(true);
        // setGenerateError(null);

        try {
            console.log("Generating quiz from files:", selectedFiles);
            const result = await api.generateQuiz(selectedFiles, selectedCourseId ?? undefined, selectedQuizIds, parseInt(questionNum) || 5, title);
            console.log("Generated quiz:", result);
            // setGeneratedQuiz(result);
            navigate(`/quiz-review?quiz_id=${result.quiz_id}`);
        } catch (error: any) {
            console.error('Failed to generate quiz:', error);
            // setGenerateError(error.message || 'Failed to generate quiz');
            alert(`Error: ${error.message || 'Failed to generate quiz'}`);
        } finally {
            setIsGenerating(false);
        }
    }

    function getQuizQuestionContent() {
        // Step 0: Choose Course
        // if (index === 0) {
        //     return (
        //         <div className="quizStepPanel">
        //             {isLoadingCourses && 
        //             <div className="loading-status" role="status" aria-live="polite">
        //             <span className="loading-dots" aria-hidden="true">
        //                 <span></span>
        //                 <span></span>
        //                 <span></span>
        //             </span>
        //             </div>
        //             }
                    
        //             {!isLoadingCourses && courses.length === 0 && (
        //                 <p>No courses found where you are a Teacher or TA</p>
        //             )}

        //             {!isLoadingCourses && courses.length > 0 && (
        //                 <div className="quizStepChecklist">
        //                     {courses.map((course) => (
        //                         <label key={course.id} className="quizFileOption">
        //                             <input
        //                                 type="radio"
        //                                 name="courseSelection"
        //                                 checked={selectedCourseId === course.id}
        //                                 onChange={() => setSelectedCourseId(course.id)}
        //                                 className="quizCheckbox"
        //                             />
        //                             {course.name}
        //                         </label>
        //                     ))}
        //                 </div>
        //             )}
        //         </div>
        //     );
        // }
        // Step 1: Choose Canvas Quizzes 
        if (index === 0) {
            const filteredQuizzes = prevQuizzes.filter((quiz) => {
                const quizTitle = (quiz.title || "").toLowerCase();
                return quizTitle.includes(quizSearchQuery.trim().toLowerCase());
            });

            return (
                <div className="quizQuestionContainer quizStepPanel">
                    <input
                        type="text"
                        value={quizSearchQuery}
                        onChange={(e) => setQuizSearchQuery(e.target.value)}
                        placeholder="Search previous quizzes"
                        className="quizMaterialSearch"
                        aria-label="Search previous quizzes"
                    />

                    {prevQuizzes.length === 0 && (
                        <p>No previous quizzes found for this course to reference</p>
                    )}

                    {prevQuizzes.length > 0 && filteredQuizzes.length === 0 && (
                        <p>No matching quizzes found</p>
                    )}

                    {filteredQuizzes.length > 0 && (
                        <div className="quizStepChecklist">
                            {filteredQuizzes.map((quiz) => (
                                <label key={quiz.id} className="quizFileOption">
                                    <input
                                        type="checkbox"
                                        checked={selectedQuizIds.includes(quiz.id)}
                                        onChange={() => handleQuizToggle(quiz.id)}
                                        className="quizCheckbox"
                                    />
                                    {quiz.title}
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            );
        }
        // Step 2: Choose Canvas materials 
        else if (index === 1) {
            const filteredFiles = files.filter((file) => {
                const fileName = (file.display_name || "").toLowerCase();
                return fileName.includes(materialSearchQuery.trim().toLowerCase());
            });

            return (
                <div className="quizQuestionContainer quizStepPanel">
                <input
                        type="text"
                        value={materialSearchQuery}
                        onChange={(e) => setMaterialSearchQuery(e.target.value)}
                        placeholder="Search Canvas materials"
                        className="quizMaterialSearch"
                        aria-label="Search materials"
                    />
                <div className="quizQuestionContainer quizStepMaterialsList">
                    {/* <input
                        type="text"
                        value={materialSearchQuery}
                        onChange={(e) => setMaterialSearchQuery(e.target.value)}
                        placeholder="Search Canvas materials"
                        className="quizMaterialSearch"
                        aria-label="Search materials"
                    /> */}

                    {isLoadingFiles && 
                        <div className="loading-status" role="status" aria-live="polite">
                        <span className="loading-dots" aria-hidden="true">
                            <span></span>
                            <span></span>
                            <span></span>
                        </span>
                        </div>
                    }
                    {filesError && <p>{filesError}</p>}

                    {!isLoadingFiles && !filesError && files.length === 0 && (
                        <p>No files found for this course</p>
                    )}

                    {!isLoadingFiles && !filesError && files.length > 0 && filteredFiles.length === 0 && (
                        <p>No matching materials found</p>
                    )}

                    {!isLoadingFiles && !filesError && filteredFiles.length > 0 && (
                        filteredFiles.map((file) => (
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
                </div>
            );
        }
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
        // Step 3: Quiz Qualities 
        else if (index === 2) {
            return (
                <div className="quizQuestionContainer quizStepPanel quizStepMaterialsList"  style={{overflowY:"auto"}}>
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
                    {/* Display results toggle 
                    <div className="quizQuestionContainerToggle">
                        <p>Display Results</p>
                        <label className="toggleSwitch">
                            <input type="checkbox"
                            checked={result_view_restricted}
                            onChange={(e) => setResultViewRestricted(e.target.checked)}
                            />
                            <span className="slider"></span>
                        </label>
                    </div> */}
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
        // Step 4: AI Prompt 
        else {
               /*
            API needs 

            - number of questions
            - question types: Categorization, Essay, Fill in the Blank, Formula, Hot Spot, Matching, Multiple Choice, 
            Multiple Answer, Numeric, Ordering, True or False, Stimulus 
            - enable image generation
            */
            return (
                <div className="quizQuestionContainer quizStepPanel quizStepPromptPanel">
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
                    <div className="quizQuestionContainer quizPromptNotesContainer">
                        <p>Additional prompting notes</p>
                        <textarea
                        id = "quiz_additional_notes"
                        value={additionalNotes}
                        onChange={(e) => setAdditionalNotes(e.target.value)}
                        className="quizNotesInput"
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
                <img 
                    src={backArrow} 
                    className="back-arrow" 
                    alt="Back button"
                    onClick={() => navigate('/dashboard')}
                    style={{ cursor: 'pointer' }}
                />
            </div>
        
            <div className="questions-container">
                <div className="questions" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', width: '100%', height: '100%', minHeight: 0 }}>

                    {/* Question number sidebar */}
                    <div className="quiz-review-progress">
                        {structureQuestions.map((_, question) => (
                        <button
                            key={question}
                            type="button"
                            className={`quiz-review-progress-item ${question === index ? 'active' : ''}`}
                            onClick={() => setIndex(question)}
                            aria-label={`Go to question ${question + 1}`}
                        >
                            {question + 1}
                        </button>
                        ))}
                    </div>
                {/* Main section */}
                <div className='questionMain'>
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
                                <button 
                                    className="button-next" 
                                    onClick={() => handleSubmit()}
                                    disabled={isGenerating}
                                >
                                    {isGenerating ? 'Generating...' : 'Submit'}
                                </button>
                            }
                        </div>
                    }
                </div>
                </div>
                </div>
            </div>
        </div>

        {isGenerating && (
            <div className="quiz-generating-overlay" role="status" aria-live="polite" aria-label="Quiz is generating">
                <div className="quiz-generating-stack">
                    <div className="cube-loader" aria-hidden="true" />
                    <p className="quiz-generating-label">Crafting your quiz</p>
                </div>
            </div>
        )}
    </div>
    );
}
export default QuizStructure;
