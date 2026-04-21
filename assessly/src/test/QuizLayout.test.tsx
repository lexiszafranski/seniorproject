import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuizLayout from '../components/QuizLayout';

jest.mock('../assets/SpinnerGap.svg', () => 'draft-icon.svg');
jest.mock('../assets/RocketLaunch.svg', () => 'published-icon.svg');

describe('QuizLayout', () => {
	it('renders passed input props (title, count, status, and date)', () => {
		render(
			<QuizLayout
				icon="draft"
				title="Algorithms Quiz"
				count={10}
				statusText="Draft"
				statusTone="Editing"
				date="Apr 21, 2026"
			/>
		);
		expect(screen.getByRole('heading', { name: 'Algorithms Quiz' })).toBeTruthy();
		expect(screen.getByText('10 questions')).toBeTruthy();
		expect(screen.getByText('Draft')).toBeTruthy();
		expect(screen.getByText('Apr 21, 2026')).toBeTruthy();
	});

	it('applies correct badge color class from statusTone', () => {
		const { rerender } = render(
			<QuizLayout
				icon="published"
				title="Sorting Quiz"
				statusText="Published"
				statusTone="Published"
			/>
		);
		expect(screen.getByText('Published')).toHaveClass('card-badge', 'card-badge-Published');

		rerender(
			<QuizLayout
				icon="draft"
				title="Review Quiz"
				statusText="Needs Review"
				statusTone="Review"
			/>
		);
		expect(screen.getByText('Needs Review')).toHaveClass('card-badge', 'card-badge-Review');
	});

	it('calls onClick', async () => {
		const user = userEvent.setup();
		const handleClick = jest.fn();

		render(
			<QuizLayout
				icon="draft"
				title="Interactive Quiz"
				onClick={handleClick}
			/>
		);
		const card = screen.getByRole('button');
		await user.click(card);
		expect(handleClick).toHaveBeenCalledTimes(1);
	});
});
