import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// import questionMark from '../assets/Question_Mark.png';
import backArrow from '../assets/Caret_Left.png';
import { api } from '../config/api';

import '../styles/quizStructure.css';
import '../styles/quizReview.css';

import NavBar from '../components/NavBar';

/** Strip HTML tags, returning plain text for display in inputs/textareas. */
function stripHtml(html: string): string {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

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

  const [pointsEdits, setPointsEdits] = useState<Record<string, number | string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [changedQuestionIds, setChangedQuestionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!quizId) {
      setError('No quiz ID provided.');
      setLoading(false);
      return;
    }
    async function loadQuiz() {
      try {
        const doc = await api.getQuiz(quizId!);
        const status = doc.status || '';

        if (status === 'saved_to_canvas' || status === 'published_on_canvas') {
          const syncResult = await api.syncFromCanvas(quizId!);
          setQuizTitle(syncResult.quiz.title || 'Quiz Review');
          setQuestions(syncResult.quiz.questions || []);
          setQuizStatus(status);
          setChangedQuestionIds(new Set(syncResult.changed_question_ids));
        } else {
          setQuizTitle(doc.title || 'Quiz Review');
          setQuestions(doc.questions || []);
          setQuizStatus(status);
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load quiz.');
      } finally {
        setLoading(false);
      }
    }
    loadQuiz();
  }, [quizId]);

  const activeQuestion = questions[activeQuestionIndex];

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
    if (Object.keys(pointsEdits).length === 0) return;
    setIsSaving(true);
    setSaveError(null);
    try {
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
    } catch (e: any) {
      setSaveError(e.message || 'Failed to save.');
    } finally {
      setIsSaving(false);
    }
  }

  if (loading) return (
    <div className="page">
      <div className="quiz-review-loading-screen">
        <div className="loader" />
        <p className="quiz-review-loading-text">Retrieving Quiz</p>
      </div>
    </div>
  );

  if (error) return <div className="page"><p style={{ padding: '2rem' }}>Error: {error}</p></div>;

  return (
    <div>
      <NavBar />
    <div className="page qr-page">
      {/* Top bar */}
      {/* <div className="top-bar">
        <h2 className="top-bar-text" onClick={() => navigate('/dashboard')}>ASSESSLY</h2>
        <img src={questionMark} alt="Help button" className="top-bar-help" />
      </div>
      <hr /> */}

      {/* Two-column layout */}
      <div className="qr-layout">

        {/* ── Left sidebar ── */}
        <aside className="qr-sidebar">
          <div className="qr-sidebar-header">
            <button
              type="button"
              className="qr-back-btn"
              onClick={() => navigate(-1)}
              aria-label="Go back"
            >
              <img src={backArrow} className="back-arrow" alt="" />
              <span>Back</span>
            </button>
            <p className="qr-sidebar-quiz-title">{quizTitle}</p>
            <p className="qr-sidebar-count">Questions &nbsp;<span>{questions.length}</span></p>
          </div>

          <div className="qr-sidebar-list">
            {questions.map((q, index) => (
              <button
                key={q.internal_question_id || index}
                type="button"
                className={`qr-sidebar-item${index === activeQuestionIndex ? ' active' : ''}`}
                onClick={() => setActiveQuestionIndex(index)}
              >
                <span className="qr-sidebar-num">{index + 1}</span>
                <span className="qr-sidebar-preview">
                  {stripHtml(q.question_stem_html).slice(0, 60) || 'Question'}
                </span>
              </button>
            ))}
          </div>

          <div className="qr-sidebar-footer">
            <button
              type="button"
              className="qr-finish-btn"
              onClick={() => setIsFinishModalOpen(true)}
            >
              Finish review
            </button>
          </div>
        </aside>

        {/* ── Main panel ── */}
        <main className="qr-main">
          {activeQuestion ? (
            <div className="qr-card">

              {/* Card top row */}
              <div className="qr-card-topbar">
                <div className="qr-card-topleft">
                  <div className="qr-question-label-row">
                    <span className="qr-question-label">Question {activeQuestionIndex + 1}</span>
                    {changedQuestionIds.has(activeQuestion.internal_question_id) && (
                      <span className="quiz-review-new-changes-badge">New Changes</span>
                    )}
                  </div>
                  <div className="qr-points-row">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      className="quiz-review-points-input"
                      value={pointsEdits[activeQuestion.internal_question_id] ?? activeQuestion.points_possible}
                      onChange={(e) => {
                        setPointsEdits((prev) => ({ ...prev, [activeQuestion.internal_question_id]: e.target.value }));
                      }}
                      onBlur={(e) => {
                        const id = activeQuestion.internal_question_id;
                        const raw = parseFloat(e.target.value);
                        const resolved = isNaN(raw) || raw < 1 ? 1 : raw;
                        setPointsEdits((prev) => {
                          const next = { ...prev };
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
                    {saveError && <p className="qr-save-error">{saveError}</p>}
                  </div>
                </div>

                <div className="qr-card-topright">
                  <div className="qr-card-topright-actions">
                    <button
                      type="button"
                      className="qr-save-text-btn"
                      aria-label="Save changes"
                      disabled={isSaving}
                      onClick={handleSave}
                    >
                      {isSaving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      className="qr-trash-btn"
                      aria-label="Delete question"
                      onClick={() => setIsDeleteModalOpen(true)}
                    >
                      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d93025" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  </div>
                  <span className="qr-question-type">Multiple Choice</span>
                </div>
              </div>

              {/* Divider */}
              <div className="qr-card-divider" />

              {/* Question stem */}
              <textarea
                className="qr-question-textarea"
                value={stripHtml(activeQuestion.question_stem_html)}
                readOnly
                rows={2}
              />

              {/* Answer choices */}
              <div className="qr-choices">
                {activeQuestion.choices?.map((choice: any) => (
                  <div key={choice.internal_choice_id} className={`qr-choice-row${choice.is_correct ? ' correct' : ''}`}>
                    <span className={`qr-radio-circle${choice.is_correct ? ' correct' : ''}`}>
                      {choice.is_correct && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                    <input
                      type="text"
                      className={`qr-choice-input${choice.is_correct ? ' correct' : ''}`}
                      value={stripHtml(choice.text_html)}
                      readOnly
                    />
                    <button
                      type="button"
                      className="qr-choice-trash-btn"
                      aria-label="Delete choice"
                      onClick={() => {}}
                    >
                      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d93025" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* Add question button */}
              <button type="button" className="qr-add-question-btn" onClick={() => {}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add question
              </button>

            </div>
          ) : (
            <div className="qr-card" style={{ justifyContent: 'center', alignItems: 'center' }}>
              <p style={{ color: '#666' }}>No questions available.</p>
            </div>
          )}

          {/* Navigation — outside card, full width */}
          <div className="qr-nav">
            {activeQuestionIndex > 0 ? (
              <button className="qr-nav-back" onClick={() => setActiveQuestionIndex((i) => i - 1)}>Back</button>
            ) : (
              <span />
            )}
            {activeQuestionIndex < questions.length - 1 ? (
              <button className="qr-nav-next" onClick={() => setActiveQuestionIndex((i) => i + 1)}>Next</button>
            ) : (
              <button className="qr-nav-next" onClick={() => setIsFinishModalOpen(true)}>Finish</button>
            )}
          </div>
        </main>
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

              {/* published_on_canvas: unpublish */}
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

              {/* saved_to_canvas or published_on_canvas: revert to draft */}
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
    </div>
  );
}

export default QuizReview;
