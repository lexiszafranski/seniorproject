import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import Dashboard from '../pages/dashboard';
import {api} from '../config/api';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));

jest.mock('../components/NavBar', () => ({
	__esModule: true,
	default: () => <div data-testid="navbar-mock" />,
}));
jest.mock('../config/api', () => ({
	api: {
		syncCourses: jest.fn(),
		getAssesslyQuizzes: jest.fn(),
	},
}));
const mockSyncCourses = api.syncCourses as jest.Mock;
const mockGetAssesslyQuizzes = api.getAssesslyQuizzes as jest.Mock;

describe('Dashboard', () => {
	beforeEach(() => {
		jest.clearAllMocks();
        mockNavigate.mockClear();
	});
    mockSyncCourses.mockResolvedValue({
        courses: [
            {
                id: 101,
                name: 'Algorithms 101',
                quiz_count: 2,
                enrollments: [{ role: 'TeacherEnrollment' }],
            },
            {
                id: 202,
                name: 'Student Only Course',
                quiz_count: 1,
                enrollments: [{ role: 'StudentEnrollment' }],
            },
        ],
    });
    mockGetAssesslyQuizzes.mockResolvedValue({
        sync_warning: false,
        quizzes: [
            {
                _id: 'quiz-1',
                title: 'Sorting Review Published',
                question_count: 10,
                status: 'saved_to_canvas',
            },
            {
                _id: 'quiz-2',
                title: 'Binary Search Draft',
                question_count: 5,
                status: 'draft',
            },
            {
                _id: 'quiz-3',
                title: 'Algo Search Published' ,
                question_count: 5,
                status: 'published_on_canvas',
            },
        ],
    });
    //Test 1: check for teacher enrollment
	it('shows quizzes for clicked course', async () => {
		render(
			<MemoryRouter>
				<Dashboard />
			</MemoryRouter>
		);
		expect(await screen.findByText('Algorithms 101')).toBeTruthy(); 
		expect(screen.queryByText('Student Only Course')).toBeNull();
	});
    //Test 2: checking if filtering works based on quiz status and how searching affects results 
    it('correct filter/search functionality based on quiz status', async () => {
		const user = userEvent.setup();
		render(
			<MemoryRouter>
				<Dashboard />
			</MemoryRouter>
		);
		expect(await screen.findByText('Algorithms 101')).toBeTruthy(); //check for teacher enrollment
		await user.click(screen.getByText('Algorithms 101'));

		expect(await screen.findByRole('heading', { name: 'Algorithms 101' })).toBeTruthy();
		expect(screen.getByRole('tablist', { name: /Filter quizzes/i })).toBeTruthy();
		expect(screen.getByPlaceholderText('Search created quizzes')).toBeTruthy();
		expect(screen.getByText('Sorting Review Published')).toBeTruthy();
		expect(screen.getByText('Algo Search Published')).toBeTruthy();
		expect(screen.getByText('Binary Search Draft')).toBeTruthy();

		await user.click(screen.getByRole('button', { name: 'Published' }));
		expect(screen.getByText('Sorting Review Published')).toBeTruthy();
		expect(screen.getByText('Algo Search Published')).toBeTruthy();
		expect(screen.queryByText('Binary Search Draft')).toBeNull();

		await user.clear(screen.getByPlaceholderText('Search created quizzes'));
		await user.type(screen.getByPlaceholderText('Search created quizzes'), 'binary');
		expect(screen.getByText('No quizzes match the selected filter.')).toBeTruthy();

		await user.click(screen.getByRole('button', { name: 'All' }));
		expect(screen.getByText('Binary Search Draft')).toBeTruthy();
	});
    //Test 3: 'create new quiz' button routes to quiz structure 
    it('create new quiz button routes to quiz structure page', async () => {
        const user = userEvent.setup();
        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        );
        expect(await screen.findByText('Algorithms 101')).toBeTruthy();
        await user.click(screen.getByText('Algorithms 101'));
        expect(await screen.findByRole('heading', { name: 'Algorithms 101' })).toBeTruthy();
        const newquizButton = screen.getByRole('button', { name: /Create new quiz/i });
        await user.click(newquizButton);
        expect(mockNavigate).toHaveBeenCalledWith('/quiz-structure', { state: { selectedCourseId: 101 } });
    });
    //Test 4: clicking on previous quiz routes to quiz review for that quiz  
    it('clicking on previously created quiz route to quiz review page for that quiz', async () => {
        const user = userEvent.setup();
        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        );
        expect(await screen.findByText('Algorithms 101')).toBeTruthy();
        await user.click(screen.getByText('Algorithms 101'));
        expect(await screen.findByRole('heading', { name: 'Algorithms 101' })).toBeTruthy();

        await user.click(screen.getByText('Sorting Review Published'));
        expect(mockNavigate).toHaveBeenCalledWith('/quiz-review?quiz_id=quiz-1');
    });
    //Test 5: Draft filter shows draft quiz on dashboard
    it('shows draft quiz when Drafts filter is selected', async () => {
        const user = userEvent.setup();
        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        );

        expect(await screen.findByText('Algorithms 101')).toBeTruthy();
        await user.click(screen.getByText('Algorithms 101'));
        expect(await screen.findByRole('heading', { name: 'Algorithms 101' })).toBeTruthy();

        await user.click(screen.getByRole('button', { name: 'Drafts' }));
        expect(screen.getByText('Binary Search Draft')).toBeTruthy();
        expect(screen.queryByText('Sorting Review Published')).toBeNull();
        expect(screen.queryByText('Algo Search Published')).toBeNull();
    });
    //Test 6: after returning from review, newly created draft appears in selected course
    it('shows newly created quiz as draft after opening a course', async () => {
        const user = userEvent.setup();
        mockGetAssesslyQuizzes.mockResolvedValueOnce({
            sync_warning: false,
            quizzes: [
                {
                    _id: 'quiz-99',
                    title: 'Newly Created Quiz',
                    question_count: 8,
                    status: 'draft',
                },
            ],
        });

        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        );

        expect(await screen.findByText('Algorithms 101')).toBeTruthy();
        await user.click(screen.getByText('Algorithms 101'));
        expect(await screen.findByRole('heading', { name: 'Algorithms 101' })).toBeTruthy();

        await user.click(screen.getByRole('button', { name: 'Drafts' }));
        expect(screen.getByText('Newly Created Quiz')).toBeTruthy();
    });
    //Test 7: Back button routes to main dashboard
    it('clicking on back button routes back to dashboard main', async () => {
        const user = userEvent.setup();
        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        );

        expect(await screen.findByText('Algorithms 101')).toBeTruthy();
        await user.click(screen.getByText('Algorithms 101'));
        expect(await screen.findByRole('heading', { name: 'Algorithms 101' })).toBeTruthy();

        await user.click(screen.getByRole('button', { name: /Go back/i }));
        expect(await screen.findByRole('heading', { name: /Your courses/i })).toBeTruthy();
        expect(screen.getByRole('heading', { name: /Continue working/i })).toBeTruthy();
    });
});
