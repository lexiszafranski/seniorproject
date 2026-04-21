import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuizReview from '../pages/quizReview';
import {api} from '../config/api';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams('quiz_id=test-quiz-id')],
}));
jest.mock('../components/NavBar', () => ({
  __esModule: true,
  default: () => <div data-testid="navbar-mock" />,
}));
jest.mock('../config/api', () => ({
  api: {
    getQuiz: jest.fn(),
    syncFromCanvas: jest.fn(),
    saveQuizEdits: jest.fn(),
    saveQuizToCanvas: jest.fn(),
    publishQuiz: jest.fn(),
    revertToDraft: jest.fn(),
    unpublishQuiz: jest.fn(),
    deleteQuiz: jest.fn(),
  },
}));
const mockGetQuiz = api.getQuiz as jest.Mock;
const mockSyncFromCanvas = api.syncFromCanvas as jest.Mock;
const mockSaveQuizEdits = api.saveQuizEdits as jest.Mock;

function buildQuestion(id: string, stem: string, points = 5) {
  return {
    internal_question_id: id,
    question_stem_html: `<p>${stem}</p>`,
    points_possible: points,
    choices: [
      { internal_choice_id: `${id}-a`, text_html: '<p>Choice A</p>', is_correct: true },
      { internal_choice_id: `${id}-b`, text_html: '<p>Choice B</p>', is_correct: false },
    ],
  };
}

describe('QuizReview page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockGetQuiz.mockResolvedValue({
      title: 'Sample Quiz',
      status: 'generated_pending_review',
      questions: [
        buildQuestion('q1', 'First question stem', 5),
        buildQuestion('q2', 'Second question stem', 6),
        buildQuestion('q3', 'Third question stem', 7),
      ],
    });
    mockSyncFromCanvas.mockResolvedValue({
      quiz: { title: 'Synced Quiz', questions: [] },
      changed_question_ids: [],
    });
    mockSaveQuizEdits.mockResolvedValue({ success: true });
  });
  //Test1: navigation within quiz review 
  it('lets the user move between questions using next/back and sidebar selection', async () => {
    const user = userEvent.setup();
    render(<QuizReview />);
    expect(await screen.findByText('Question 1')).toBeTruthy();
    expect(screen.getByDisplayValue('First question stem')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Question 2')).toBeTruthy();
    expect(screen.getByDisplayValue('Second question stem')).toBeTruthy();

    await user.click(screen.getByText(/Third question stem/i));
    expect(await screen.findByText('Question 3')).toBeTruthy();
    expect(screen.getByDisplayValue('Third question stem')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByText('Question 2')).toBeTruthy();
  });
  //Test2: point change
  it('validates points input and saves normalized values', async () => {
    const user = userEvent.setup();
    render(<QuizReview />);

    expect(await screen.findByText('Question 1')).toBeTruthy();

    const pointsInput = screen.getByRole('spinbutton');
    await user.clear(pointsInput);
    await user.type(pointsInput, '0');
    await user.tab();

    await user.click(screen.getByRole('button', { name: /Save changes/i }));
    await waitFor(() => {
      expect(mockSaveQuizEdits).toHaveBeenCalledWith('test-quiz-id', [
        { internal_question_id: 'q1', points_possible: 1 },
      ]);
    });
  });
  //Test 3: finish options 
  it('filters finish actions by quiz status in the finish modal', async () => {
    const user = userEvent.setup();
    render(<QuizReview />);

    expect(await screen.findByText('Question 1')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /Finish review/i }));

    expect(screen.getByRole('button', { name: /Delete Quiz/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Save to Canvas/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Publish to Canvas/i })).toBeTruthy();

    expect(screen.queryByRole('button', { name: /Save as Draft/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Unpublish from Canvas/i })).toBeNull();
  });
  //Test4: delete modal popup 
  it('opens and closes delete question modal', async () => {
    const user = userEvent.setup();
    render(<QuizReview />);

    expect(await screen.findByText('Question 1')).toBeTruthy();
    await user.click(screen.getByLabelText('Delete question'));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Delete Question')).toBeTruthy();
    expect(screen.getByText('Are you sure you want to permanently delete this question?')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  //Test 5: quiz saved from Canvas  
  it('saves as draft from finish modal and returns to dashboard', async () => {
    const user = userEvent.setup();
    const mockRevertToDraft = api.revertToDraft as jest.Mock;
    mockRevertToDraft.mockResolvedValue({ success: true });
    mockGetQuiz.mockResolvedValue({
      title: 'Sample Quiz',
      status: 'saved_to_canvas',
      questions: [
        buildQuestion('q1', 'First question stem', 5),
        buildQuestion('q2', 'Second question stem', 6),
      ],
    });
    mockSyncFromCanvas.mockResolvedValue({
      quiz: {
        title: 'Sample Quiz',
        questions: [
          buildQuestion('q1', 'First question stem', 5),
          buildQuestion('q2', 'Second question stem', 6),
        ],
      },
      changed_question_ids: [],
    });
    render(<QuizReview />);
    expect(await screen.findByText('Question 1')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Finish review/i }));
    await user.click(screen.getByRole('button', { name: /Save as Draft/i }));
    await waitFor(() => {
      expect(mockRevertToDraft).toHaveBeenCalledWith('test-quiz-id');
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });
});
