import { fireEvent, render } from '@testing-library/react';
import DashboardCard from '../components/DashboardCard';

describe('DashboardCard', () => {
    //Test 1: rendering of dashboard card 
    it('renders title, question cont, and quiz points', () => {
        const { getByRole, getByText } = render(
        <DashboardCard
            title="Week 1 Quiz"
            imageSrc="/test-image.png"
            count={2}
            singularLabel="question"
            pluralLabel="questions"
            pointsPossible={10}
            statusText="Saved"
            statusTone="saved"
        />
        );
        expect(getByRole('heading', { name: 'Week 1 Quiz' })).toBeTruthy();
        expect(getByText('2 questions • 10 points')).toBeTruthy();
        expect(getByText('Saved')).toBeTruthy();
    });
    //Test 2: clicking on the dashboard is responsive 
    it('calls onClick when clicked with a mouse', () => {
        const onClick = jest.fn();
        const { getByRole } = render(
            <DashboardCard
                title="Clickable"
                imageSrc="/test-image.png"
                onClick={onClick}
            />
        );
        const card = getByRole('button');
        fireEvent.click(card);
        expect(onClick).toHaveBeenCalledTimes(1);
    });
});
