import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import sideImg from '../assets/Quiz_Structure_Graphic.png';
import questionMark from '../assets/Question_Mark.png';
import greenBackground from '../assets/Green_Box.png';
import backArrow from '../assets/Caret_Left.png';

import '../styles/quizStructure.css';

type AnswerOption = {
  id: string;
  text: string;
};

type ReviewQuestion = {
  id: number;
  group?: string;
  title: string;
  prompt?: string;
  answers: AnswerOption[];
  feedback?: {
    correctAnswerId?: string;
    crossedOutAnswerId?: string;
  };
};

const reviewQuestions: ReviewQuestion[] = [
  {
    id: 1,
    group: 'Group 1',
    title: 'Question 1',
    prompt: 'Which of the following best describes Big-O notation?',
    answers: [
      { id: 'q1-a1', text: 'It gives the exact running time of an algorithm on a specific machine' },
      { id: 'q1-a2', text: 'It represents the upper bound on an algorithm’s growth rate for large inputs' },
      { id: 'q1-a3', text: 'It measures the minimum possible running time in all cases' },
      { id: 'q1-a4', text: 'It only applies to constant-time algorithms' }
    ]
  },
  {
    id: 2,
    title: 'Question 2',
    answers: []
  },
  {
    id: 3,
    title: 'Question 3',
    answers: []
  },
  {
    id: 4,
    group: 'Group 2',
    title: 'Question 4',
    prompt: 'Which of the following best describes Big-O notation?',
    answers: [
      { id: 'q4-a1', text: 'It gives the exact running time of an algorithm on a specific machine' },
      { id: 'q4-a2', text: 'It represents the upper bound on an algorithm’s growth rate for large inputs' },
      { id: 'q4-a3', text: 'It measures the minimum possible running time in all cases' },
      { id: 'q4-a4', text: 'It only applies to constant-time algorithms' }
    ]
  },
  {
    id: 5,
    title: 'Question 5',
    answers: []
  },
  {
    id: 6,
    title: 'Question 6',
    answers: []
  },
  {
    id: 7,
    title: 'Question 7',
    answers: []
  },
  {
    id: 8,
    title: 'Question 8',
    answers: []
  },
  {
    id: 9,
    title: 'Question 9',
    answers: []
  },
  {
    id: 10,
    title: 'Question 10',
    answers: []
  }
];

function QuizReview() {
  const navigate = useNavigate();
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});

  const activeQuestion = reviewQuestions[activeQuestionIndex];

  function handleAnswerSelect(answerId: string) {
    setSelectedAnswers((currentAnswers) => ({
      ...currentAnswers,
      [activeQuestion.id]: answerId
    }));
  }

  function goToPreviousQuestion() {
    setActiveQuestionIndex((currentIndex) => Math.max(currentIndex - 1, 0));
  }

  function goToNextQuestion() {
    setActiveQuestionIndex((currentIndex) => Math.min(currentIndex + 1, reviewQuestions.length - 1));
  }

  return (
    <div className="page quiz-review-page">
      <div className="top-bar">
        <h2 className="top-bar-text" onClick={() => navigate('/dashboard')}>
          ASSESSLY
        </h2>
        <img src={questionMark} alt="Help button" className="top-bar-help" />
      </div>
      <hr />

      <div className="content quiz-review-content">
        <div className="left quiz-review-left">
          <button
            type="button"
            className="review-back-nav"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <img src={backArrow} className="back-arrow" alt="" />
          </button>

          <div className="image-container-white quiz-review-illustration">
            <img src={sideImg} className="quiz-img" alt="Quiz review illustration" />
          </div>
        </div>

        <div className="questions-container quiz-review-stage">
          <img src={greenBackground} className="green-background quiz-review-green-panel" alt="Green background" />

          <div className="quiz-review-stage-actions">
            <button type="button" className="quiz-review-icon-button quiz-review-menu-button" aria-label="Open menu">
              <span></span>
              <span></span>
              <span></span>
            </button>
            <button type="button" className="quiz-review-icon-button" aria-label="Confirm review">
              <span className="quiz-review-checkmark" aria-hidden="true"></span>
            </button>
          </div>

          <div className="questions quiz-review-card">
            <div className="quiz-review-layout">
              <div className="quiz-review-progress" aria-label="Question navigation">
                {reviewQuestions.map((question) => (
                  <button
                    key={question.id}
                    type="button"
                    className={`quiz-review-progress-item ${question.id === activeQuestion.id ? 'active' : ''}`}
                    onClick={() => setActiveQuestionIndex(question.id - 1)}
                    aria-label={`Open question ${question.id}`}
                  >
                    {question.id}
                  </button>
                ))}
              </div>

              <div className="quiz-review-main">
                <div className="quiz-review-header">
                  <div className="quiz-review-title-block">
                    {activeQuestion.group && <p className="quiz-review-group">{activeQuestion.group}</p>}
                    <h3 className="question-text quiz-review-question-label">{activeQuestion.title}</h3>
                  </div>

                  <div className="quiz-review-side-actions">
                    <button type="button" className="quiz-review-icon-button" aria-label="Add question">
                      <span className="quiz-review-plus-icon" aria-hidden="true">+</span>
                    </button>
                    <button type="button" className="quiz-review-icon-button" aria-label="Delete question">
                      <span className="quiz-review-trash-icon" aria-hidden="true"></span>
                    </button>
                  </div>
                </div>

                {activeQuestion.prompt ? (
                  <>
                    <h2 className="quiz-review-title">{activeQuestion.prompt}</h2>

                    <div className="quiz-review-options" role="list">
                      {activeQuestion.answers.map((answer) => {
                        const selectedAnswerId = selectedAnswers[activeQuestion.id];
                        const isSelected = selectedAnswerId === answer.id;
                        const isCorrect = activeQuestion.feedback?.correctAnswerId === answer.id;
                        const isCrossedOut = activeQuestion.feedback?.crossedOutAnswerId === answer.id;

                        return (
                          <button
                            key={answer.id}
                            type="button"
                            className={`quiz-review-option ${isSelected ? 'is-selected' : ''}`}
                            onClick={() => handleAnswerSelect(answer.id)}
                          >
                            <span
                              className={`quiz-review-box ${
                                isSelected ? 'is-selected' : ''
                              } ${isCorrect ? 'is-correct' : ''} ${isCrossedOut ? 'is-crossed-out' : ''}`}
                              aria-hidden="true"
                            ></span>
                            <span
                              className={`quiz-review-option-text ${
                                isCorrect ? 'is-correct' : ''
                              } ${isCrossedOut ? 'is-crossed-out' : ''}`}
                            >
                              {answer.text}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="quiz-review-empty-state" aria-label={`Question ${activeQuestion.id} placeholder`}>
                    <p className="quiz-review-empty-title">{activeQuestion.title}</p>
                    <p className="quiz-review-empty-text">This review slot is left blank for now.</p>
                  </div>
                )}

                <div className={`buttons quiz-review-buttons ${activeQuestionIndex === 0 ? 'no-back' : 'has-back'}`}>
                  {activeQuestionIndex > 0 && (
                    <button type="button" className="button-back quiz-review-back-button" onClick={goToPreviousQuestion}>
                      Back
                    </button>
                  )}
                  <button type="button" className="button-next quiz-review-next-button" onClick={goToNextQuestion}>
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuizReview;
