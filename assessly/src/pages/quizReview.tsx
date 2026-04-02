import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import questionMark from '../assets/Question_Mark.png';
import backArrow from '../assets/Caret_Left.png';
import { api } from '../config/api';

import '../styles/quizStructure.css';

function QuizReview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const quizId = searchParams.get('quiz_id');

  const [questions, setQuestions] = useState<any[]>([]);
  const [quizTitle, setQuizTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  useEffect(() => {
    if (!quizId) {
      setError('No quiz ID provided.');
      setLoading(false);
      return;
    }
    async function loadQuiz() {
      try {
        const doc = await api.getQuiz(quizId!);
        setQuizTitle(doc.title || 'Quiz Review');
        setQuestions(doc.questions || []);
      } catch (e: any) {
        setError(e.message || 'Failed to load quiz.');
      } finally {
        setLoading(false);
      }
    }
    loadQuiz();
  }, [quizId]);

  const activeQuestion = questions[activeQuestionIndex];

if (loading) return <div className="page"><p style={{ padding: '2rem' }}>Loading quiz...</p></div>;
  if (error) return <div className="page"><p style={{ padding: '2rem' }}>Error: {error}</p></div>;

  return (
    <div className="page">
      <div className="top-bar">
        <h2 className="top-bar-text" onClick={() => navigate('/dashboard')}>ASSESSLY</h2>
        <img src={questionMark} alt="Help button" className="top-bar-help" />
      </div>
      <hr />

      <div className="content">
        <div className="left">
          <img
            src={backArrow}
            className="back-arrow"
            alt="Back button"
            onClick={() => navigate(-1)}
            style={{ cursor: 'pointer' }}
          />
        </div>

        <div className="questions-container">
          <div className="questions" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', width: '100%', height: '100%', minHeight: 0 }}>

              {/* Question number sidebar */}
              <div className="quiz-review-progress">
                {questions.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`quiz-review-progress-item ${index === activeQuestionIndex ? 'active' : ''}`}
                    onClick={() => setActiveQuestionIndex(index)}
                    aria-label={`Go to question ${index + 1}`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              {/* Main panel */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.9rem 2.1rem 1.35rem', minHeight: 0 }}>
                {activeQuestion ? (
                  <>
                    {/* Header */}
                    <div className="quiz-review-header">
                      <div className="quiz-review-title-block">
                        <p className="quiz-review-group">{quizTitle}</p>
                        <p className="quiz-review-question-label">Question {activeQuestionIndex + 1}</p>
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

                    {/* Question stem */}
                    <h3 className="question-text" style={{ marginTop: '1.15rem', fontWeight: 400, fontSize: 'clamp(1.1rem, 1.7vw, 1.55rem)' }}
                      dangerouslySetInnerHTML={{ __html: activeQuestion.question_stem_html }}
                    />

                    {/* Answer choices */}
                    <div className="quizStepMaterialsList" style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {activeQuestion.choices?.map((choice: any) => {
                        return (
                          <div
                            key={choice.internal_choice_id}
                            className="quizInputText"
                            style={{
                              textAlign: 'left',
                              background: choice.is_correct ? 'rgba(70, 130, 120, 0.15)' : '#ffffff',
                              color: '#1f2f2c',
                              border: choice.is_correct ? '1px solid rgba(70, 130, 120, 0.4)' : '1px solid #C0C0C0',
                              fontFamily: '"Red Hat Display", sans-serif',
                              fontSize: '1rem',
                            }}
                            dangerouslySetInnerHTML={{ __html: choice.text_html }}
                          />
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p>No questions available.</p>
                )}

                {/* Navigation buttons */}
                <div className="buttons" style={{ marginTop: 'auto' }}>
                  {activeQuestionIndex > 0 ? (
                    <button className="button-back" onClick={() => setActiveQuestionIndex((i) => i - 1)}>Back</button>
                  ) : (
                    <span />
                  )}
                  {activeQuestionIndex < questions.length - 1 ? (
                    <button className="button-next" onClick={() => setActiveQuestionIndex((i) => i + 1)}>Next</button>
                  ) : (
                    <button className="button-next" onClick={() => setIsFinishModalOpen(true)}>Finish</button>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Delete modal */}
      {isDeleteModalOpen && (
        <div className="quiz-review-modal-overlay" role="presentation" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="quiz-review-delete-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2 className="quiz-review-delete-title">Delete Question</h2>
            <p className="quiz-review-delete-text">Are you sure you want to permanently delete this question?</p>
            <div className="quiz-review-delete-actions">
              <button type="button" className="quiz-review-delete-cancel" onClick={() => setIsDeleteModalOpen(false)}>Cancel</button>
              <button type="button" className="quiz-review-delete-confirm" onClick={() => setIsDeleteModalOpen(false)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Finish modal */}
      {isFinishModalOpen && (
        <div className="quiz-review-modal-overlay" role="presentation" onClick={() => { if (!isPublishing) setIsFinishModalOpen(false); }}>
          <div className="quiz-review-delete-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2 className="quiz-review-delete-title">Finished Quiz Review</h2>
            <p className="quiz-review-delete-text">Do you want to upload the quiz to Canvas or save it as a draft?</p>
            {publishError && <p style={{ color: 'red', fontSize: '0.9rem', margin: '0.5rem 0 0' }}>{publishError}</p>}
            <div className="quiz-review-delete-actions">
              <button type="button" className="quiz-review-delete-cancel" disabled={isPublishing} onClick={() => { setIsFinishModalOpen(false); navigate('/dashboard'); }}>Draft</button>
              <button
                type="button"
                className="quiz-review-delete-confirm"
                disabled={isPublishing}
                onClick={async () => {
                  if (!quizId) return;
                  setIsPublishing(true);
                  setPublishError(null);
                  try {
                    await api.publishQuiz(quizId);
                    setIsFinishModalOpen(false);
                    navigate('/dashboard');
                  } catch (e: any) {
                    setPublishError(e.message || 'Failed to publish quiz.');
                    setIsPublishing(false);
                  }
                }}
              >
                {isPublishing ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuizReview;
