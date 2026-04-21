import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuizStructure from '../pages/quizStructure';
import { api } from '../config/api';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useNavigate: () => mockNavigate,
	useLocation: () => ({ state: { selectedCourseId: 101 } }),
}));

jest.mock('../config/api', () => ({
	api: {
		getFiles: jest.fn(),
		getQuizzes: jest.fn(),
		getAssignmentGroups: jest.fn(),
		generateQuiz: jest.fn(),
	},
}));

const mockGetFiles = api.getFiles as jest.Mock;
const mockGetQuizzes = api.getQuizzes as jest.Mock;
const mockGetAssignmentGroups = api.getAssignmentGroups as jest.Mock;
const mockGenerateQuiz = api.generateQuiz as jest.Mock;

describe('QuizStructure page', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockNavigate.mockClear();

		mockGetQuizzes.mockResolvedValue({
			quizzes: [
				{ id: 11, title: 'Sorting Review' },
				{ id: 12, title: 'Binary Search Practice' },
			],
		});

		mockGetFiles.mockResolvedValue({
			files: [
				{
					id: 21,
					display_name: 'Lecture 1 Notes.pdf',
					url: 'https://canvas.test/lecture-1.pdf',
					'content-type': 'application/pdf',
				},
				{
					id: 22,
					display_name: 'Binary Trees Slides.pptx',
					url: 'https://canvas.test/trees.pptx',
					'content-type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
				},
			],
		});

		mockGetAssignmentGroups.mockResolvedValue({
			assignment_groups: [
				{ id: 91, name: 'Quizzes' },
				{ id: 92, name: 'Exams' },
			],
		});

		mockGenerateQuiz.mockResolvedValue({ quiz_id: 'quiz-created-123' });
	});

	it('lets user click question numbers to navigate steps', async () => {
		render(<QuizStructure />);

		expect(await screen.findByRole('heading', { name: 'Which course quizzes would you like the quiz to be based on?' })).toBeTruthy();

		await userEvent.click(screen.getByRole('button', { name: 'Go to question 3' }));
		expect(screen.getByRole('heading', { name: 'Canvas Quiz Structure' })).toBeTruthy();

		await userEvent.click(screen.getByRole('button', { name: 'Go to question 4' }));
		expect(screen.getByRole('heading', { name: 'AI Prompting' })).toBeTruthy();

		await userEvent.click(screen.getByRole('button', { name: 'Go to question 1' }));
		expect(screen.getByRole('heading', { name: 'Which course quizzes would you like the quiz to be based on?' })).toBeTruthy();
	});

	it('filters quizzes and materials through search inputs', async () => {
		const user = userEvent.setup();
		render(<QuizStructure />);

		expect(await screen.findByText('Sorting Review')).toBeTruthy();
		expect(screen.getByText('Binary Search Practice')).toBeTruthy();

		const quizSearch = screen.getByRole('textbox', { name: 'Search previous quizzes' });
		await user.type(quizSearch, 'binary');

		expect(screen.queryByText('Sorting Review')).toBeNull();
		expect(screen.getByText('Binary Search Practice')).toBeTruthy();

		await user.click(screen.getByRole('button', { name: 'Next' }));
		expect(await screen.findByRole('heading', { name: 'Which content would like to be included in the quiz?' })).toBeTruthy();

		expect(screen.getByText('Lecture 1 Notes.pdf')).toBeTruthy();
		expect(screen.getByText('Binary Trees Slides.pptx')).toBeTruthy();

		const materialSearch = screen.getByRole('textbox', { name: 'Search materials' });
		await user.type(materialSearch, 'trees');

		expect(screen.queryByText('Lecture 1 Notes.pdf')).toBeNull();
		expect(screen.getByText('Binary Trees Slides.pptx')).toBeTruthy();
	});

	it('submits selected responses and navigates to quiz review', async () => {
		const user = userEvent.setup();
		const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

		render(<QuizStructure />);

		expect(await screen.findByText('Sorting Review')).toBeTruthy();
		await user.click(screen.getByLabelText('Sorting Review'));
		await user.click(screen.getByRole('button', { name: 'Next' }));

		expect(await screen.findByText('Lecture 1 Notes.pdf')).toBeTruthy();
		await user.click(screen.getByLabelText('Lecture 1 Notes.pdf'));
		await user.click(screen.getByRole('button', { name: 'Next' }));

		const titleInput = document.getElementById('quiz_title') as HTMLInputElement;
		const pointsInput = document.getElementById('quiz_points') as HTMLInputElement;
		const instructionsInput = document.getElementById('quiz_instructions') as HTMLInputElement;

		expect(titleInput).toBeTruthy();
		expect(pointsInput).toBeTruthy();
		expect(instructionsInput).toBeTruthy();

		await user.type(titleInput, 'Midterm Practice Quiz');
		await user.type(pointsInput, '100');
		await user.type(instructionsInput, 'Read each question carefully.');
		await user.click(screen.getByRole('button', { name: 'Next' }));

		const questionCountInput = document.getElementById('quiz_questions') as HTMLInputElement;
		expect(questionCountInput).toBeTruthy();
		await user.type(questionCountInput, '7');
		await user.click(screen.getByRole('button', { name: 'Submit' }));
		await waitFor(() => {
			expect(mockGenerateQuiz).toHaveBeenCalledWith(
				[
					{
						url: 'https://canvas.test/lecture-1.pdf',
						display_name: 'Lecture 1 Notes.pdf',
						content_type: 'application/pdf',
					},
				],
				101,
				[11],
				7,
				'Midterm Practice Quiz',
				'Read each question carefully.'
			);
		});
		await waitFor(() => {
			expect(mockNavigate).toHaveBeenCalledWith('/quiz-review?quiz_id=quiz-created-123');
		});
		expect(alertSpy).not.toHaveBeenCalled();
		alertSpy.mockRestore();
	});
});
