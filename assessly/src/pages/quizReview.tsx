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
  const [quizStatus, setQuizStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<'delete' | 'revert' | 'save' | 'publish' | 'unpublish' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Tracks edited points per question: { [internal_question_id]: points }
  // Allows empty string mid-edit so the user can fully backspace before typing a new value
  const [pointsEdits, setPointsEdits] = useState<Record<string, number | string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
        setQuizStatus(doc.status || '');
      } catch (e: any) {
        setError(e.message || 'Failed to load quiz.');
      } finally {
        setLoading(false);
      }
    }
    loadQuiz();
  }, [quizId]);

  const activeQuestion = questions[activeQuestionIndex];

  // Flushes any pending pointsEdits to the backend. Called implicitly before Canvas actions.
  async function flushEdits() {
    if (!quizId || Object.keys(pointsEdits).length === 0) return;
    const questionUpdates = Object.entries(pointsEdits).map(([id, val]) => ({
      internal_question_id: id,
      points_possible: Number(val),
    }));
    await api.saveQuizEdits(quizId, questionUpdates);
    setQuestions((prev) =>
      prev.map((q) =>
        q.internal_question_id in pointsEdits
          ? { ...q, points_possible: Number(pointsEdits[q.internal_question_id]) }
          : q
      )
    );
    setPointsEdits({});
  }

  async function handleSave() {
    if (!quizId) return;
    // Only send questions that actually have changes in pointsEdits
    if (Object.keys(pointsEdits).length === 0) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const questionUpdates = Object.entries(pointsEdits).map(([id, val]) => ({
        internal_question_id: id,
        points_possible: Number(val),
      }));
      await api.saveQuizEdits(quizId, questionUpdates);
      // Commit only the changed questions into state
      setQuestions((prev) =>
        prev.map((q) =>
          q.internal_question_id in pointsEdits
            ? { ...q, points_possible: Number(pointsEdits[q.internal_question_id]) }
            : q
        )
      );
      setPointsEdits({});
    } catch (e: any) {
      setSaveError(e.message || 'Failed to save.');
    } finally {
      setIsSaving(false);
    }
  }

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
                        <div className="quiz-review-points-row">
                          <input
                            type="number"
                            min={1}
                            step={1}
                            className="quiz-review-points-input"
                            value={pointsEdits[activeQuestion.internal_question_id] ?? activeQuestion.points_possible}
                            onChange={(e) => {
                              // Allow empty string so the user can fully backspace before typing
                              setPointsEdits((prev) => ({ ...prev, [activeQuestion.internal_question_id]: e.target.value }));
                            }}
                            onBlur={(e) => {
                              const id = activeQuestion.internal_question_id;
                              const raw = parseFloat(e.target.value);
                              const resolved = isNaN(raw) || raw < 1 ? 1 : raw;
                              setPointsEdits((prev) => {
                                const next = { ...prev };
                                // If resolved value matches the original, remove from edits (no change)
                                if (resolved === activeQuestion.points_possible) {
                                  delete next[id];
                                } else {
                                  next[id] = resolved;
                                }
                                return next;
                              });
                            }}
                          />
                          <span className="quiz-review-points-label">pts</span>
                        </div>
                        {saveError && <p style={{ color: 'red', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>{saveError}</p>}
                      </div>
                      <div className="quiz-review-side-actions">
                        <button
                          type="button"
                          className="quiz-review-icon-button"
                          aria-label="Save changes"
                          disabled={isSaving}
                          onClick={handleSave}
                        >
                          {isSaving
                            ? <span className="quiz-review-save-spinner" aria-hidden="true" />
                            : <span className="quiz-review-save-icon" aria-hidden="true" />
                          }
                        </button>
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
        <div className="quiz-review-modal-overlay" role="presentation" onClick={() => { if (!activeAction) setIsFinishModalOpen(false); }}>
          <div className="quiz-review-delete-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2 className="quiz-review-delete-title">Finished Quiz Review</h2>
            <p className="quiz-review-delete-text">What would you like to do with this quiz?</p>
            {actionError && <p style={{ color: 'red', fontSize: '0.9rem', margin: '0.5rem 0 0' }}>{actionError}</p>}
            <div className="quiz-review-delete-actions">
              {/* Delete — always shown */}
              <button
                type="button"
                className="quiz-review-delete-cancel"
                disabled={!!activeAction}
                onClick={async () => {
                  if (!quizId) return;
                  setActiveAction('delete');
                  setActionError(null);
                  try {
                    await api.deleteQuiz(quizId);
                    setIsFinishModalOpen(false);
                    navigate('/dashboard');
                  } catch (e: any) {
                    setActionError(e.message || 'Failed to delete quiz.');
                    setActiveAction(null);
                  }
                }}
              >
                {activeAction === 'delete' ? 'Deleting...' : 'Delete Quiz'}
              </button>

              {/* published_on_canvas: unpublish (keeps on Canvas as draft) */}
              {quizStatus === 'published_on_canvas' && (
                <button
                  type="button"
                  className="quiz-review-delete-cancel"
                  disabled={!!activeAction}
                  onClick={async () => {
                    if (!quizId) return;
                    setActiveAction('unpublish');
                    setActionError(null);
                    try {
                      await api.unpublishQuiz(quizId);
                      setIsFinishModalOpen(false);
                      navigate('/dashboard');
                    } catch (e: any) {
                      setActionError(e.message || 'Failed to unpublish quiz.');
                      setActiveAction(null);
                    }
                  }}
                >
                  {activeAction === 'unpublish' ? 'Unpublishing...' : 'Unpublish from Canvas'}
                </button>
              )}

              {/* saved_to_canvas or published_on_canvas: revert to draft (removes from Canvas, keeps in MongoDB) */}
              {(quizStatus === 'saved_to_canvas' || quizStatus === 'published_on_canvas') && (
                <button
                  type="button"
                  className="quiz-review-delete-cancel"
                  disabled={!!activeAction}
                  onClick={async () => {
                    if (!quizId) return;
                    setActiveAction('revert');
                    setActionError(null);
                    try {
                      await api.revertToDraft(quizId);
                      setIsFinishModalOpen(false);
                      navigate('/dashboard');
                    } catch (e: any) {
                      setActionError(e.message || 'Failed to revert quiz to draft.');
                      setActiveAction(null);
                    }
                  }}
                >
                  {activeAction === 'revert' ? 'Reverting...' : 'Save as Draft'}
                </button>
              )}

              {/* generated_pending_review: save to Canvas (unpublished) */}
              {quizStatus === 'generated_pending_review' && (
                <button
                  type="button"
                  className="quiz-review-delete-cancel"
                  disabled={!!activeAction}
                  onClick={async () => {
                    if (!quizId) return;
                    setActiveAction('save');
                    setActionError(null);
                    try {
                      await flushEdits();
                      await api.saveQuizToCanvas(quizId);
                      setIsFinishModalOpen(false);
                      navigate('/dashboard');
                    } catch (e: any) {
                      setActionError(e.message || 'Failed to save quiz to Canvas.');
                      setActiveAction(null);
                    }
                  }}
                >
                  {activeAction === 'save' ? 'Saving...' : 'Save to Canvas'}
                </button>
              )}

              {/* Publish — shown for draft and saved_to_canvas */}
              {(quizStatus === 'generated_pending_review' || quizStatus === 'saved_to_canvas') && (
                <button
                  type="button"
                  className="quiz-review-delete-confirm"
                  disabled={!!activeAction}
                  onClick={async () => {
                    if (!quizId) return;
                    setActiveAction('publish');
                    setActionError(null);
                    try {
                      await flushEdits();
                      await api.publishQuiz(quizId);
                      setIsFinishModalOpen(false);
                      navigate('/dashboard');
                    } catch (e: any) {
                      setActionError(e.message || 'Failed to publish quiz.');
                      setActiveAction(null);
                    }
                  }}
                >
                  {activeAction === 'publish' ? 'Uploading...' : 'Publish to Canvas'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuizReview;
