import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import questionMark from '../assets/Question_Mark.png';
import backArrow from '../assets/Caret_Left.png';
import { mockGeneratedQuizQuestions } from '../config/mockData';

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

const reviewQuestions: ReviewQuestion[] = mockGeneratedQuizQuestions.questions.map((question) => ({
  id: question.spot_number,
  group: question.group,
  title: question.question,
  prompt: question.prompt,
  answers: question.answer_choices.map((choice, index) => ({
    id: `q${question.spot_number}-a${index + 1}`,
    text: choice
  }))
}));

function QuizReview() {
  const navigate = useNavigate();
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);

  const activeQuestion = reviewQuestions[activeQuestionIndex];

  function handleAnswerSelect(answerId: string) {
    if (!activeQuestion) return;

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

  function closeDeleteModal() {
    setIsDeleteModalOpen(false);
  }

  function closeFinishModal() {
    setIsFinishModalOpen(false);
  }

  function handleDeleteQuestion() {
    closeDeleteModal();
  }

  return (
    <div className="page quiz-review-page">
      <div className="top-bar">
            <h2 className="top-bar-text" onClick={() => navigate('/dashboard')}>ASSESSLY</h2>
            <img src={questionMark} alt="Help button" className="top-bar-help"/>
        </div>
        <hr></hr>

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
        </div>

        <div className="right">
          <div className="quiz-review-stage-actions">
            <button type="button" className="quiz-review-icon-button quiz-review-menu-button" aria-label="Open menu">
              <span></span>
              <span></span>
              <span></span>
            </button>
            <button
              type="button"
              className="quiz-review-icon-button"
              aria-label="Confirm review"
              onClick={() => setIsFinishModalOpen(true)}
            >
              <span className="quiz-review-checkmark" aria-hidden="true"></span>
            </button>
          </div>
        <div className="questions-container quiz-review-stage">
          <div className="questions quiz-review-card">
            <div className="quiz-review-layout">
              <div className="quiz-review-progress" aria-label="Question navigation">
                <button
                    type="button"
                    className="quiz-review-progress-item-temp"
                    style = {{backgroundColor: "#468278"}}
                  >
                  </button>
                {reviewQuestions.map((question, index) => (
                  <button
                    key={question.id}
                    type="button"
                    className={`quiz-review-progress-item ${question.id === activeQuestion.id ? 'active' : ''}`}
                    onClick={() => setActiveQuestionIndex(index)}
                    aria-label={`Open question ${question.id}`}
                  >
                    {question.id}
                  </button>
                ))}
              </div>

              <div className="quiz-review-main">
                {activeQuestion ? (
                  <>
                    <div className="quiz-review-header">
                      <div className="quiz-review-title-block">
                        {activeQuestion.group && <p className="quiz-review-group">{activeQuestion.group}</p>}
                        <h3 className="question-text quiz-review-question-label">{activeQuestion.title}</h3>
                      </div>

                      <div className="quiz-review-side-actions">
                        <button type="button" className="quiz-review-icon-button" aria-label="Add question">
                          <span className="quiz-review-plus-icon" aria-hidden="true">+</span>
                        </button>
                        <button
                          type="button"
                          className="quiz-review-icon-button"
                          aria-label="Delete question"
                          onClick={() => setIsDeleteModalOpen(true)}
                        >
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
                  </>
                ) : (
                  <div className="quiz-review-empty-state" aria-label="No questions available">
                    <p className="quiz-review-empty-title">No questions available</p>
                    <p className="quiz-review-empty-text">There are no questions left to review.</p>
                  </div>
                )}

                <div className={`buttons quiz-review-buttons ${activeQuestionIndex === 0 ? 'no-back' : 'has-back'}`}>
                  {activeQuestionIndex > 0 && (
                    <button type="button" className="button-back quiz-review-back-button" onClick={goToPreviousQuestion}>
                      Back
                    </button>
                  )}
                  <button
                    type="button"
                    className="button-next quiz-review-next-button"
                    onClick={goToNextQuestion}
                    disabled={!activeQuestion || activeQuestionIndex >= reviewQuestions.length - 1}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      {isDeleteModalOpen && activeQuestion && (
        <div className="quiz-review-modal-overlay" role="presentation" onClick={closeDeleteModal}>
          <div
            className="quiz-review-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-question-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="delete-question-title" className="quiz-review-delete-title">
              Delete Question
            </h2>
            <p className="quiz-review-delete-text">
              Are you sure you want to permanently delete this question?
            </p>
            <div className="quiz-review-delete-actions">
              <button type="button" className="quiz-review-delete-cancel" onClick={closeDeleteModal}>
                Cancel
              </button>
              <button type="button" className="quiz-review-delete-confirm" onClick={handleDeleteQuestion}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {isFinishModalOpen && (
        <div className="quiz-review-modal-overlay" role="presentation" onClick={closeFinishModal}>
          <div
            className="quiz-review-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="finish-quiz-review-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="finish-quiz-review-title" className="quiz-review-delete-title">
              Finished Quiz Review
            </h2>
            <p className="quiz-review-delete-text">
              Do you want to upload the quiz to Canvas or save it as a draft?
            </p>
            <div className="quiz-review-delete-actions">
              <button type="button" className="quiz-review-delete-cancel" onClick={closeFinishModal}>
                Draft
              </button>
              <button type="button" className="quiz-review-delete-confirm" onClick={closeFinishModal}>
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuizReview;
