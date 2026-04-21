import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom'; //needed to render link components on page
import Landing from '../pages/landing';

describe('Landing links', () => {
	it('renders login heading and subtitle', () => {
        render(
            <MemoryRouter>
                <Landing />
            </MemoryRouter>
        );
        expect(screen.getByRole('heading', { name: /Your course materials, turned into quizzes\./i })).toBeTruthy();
		expect(screen.getByText(/Automate the repetitive work so you can focus on teaching, feedback, and better learning outcomes./i)).toBeTruthy();
	});
    it('routes brand link to home', () => {
        render(
            <MemoryRouter>
                <Landing />
            </MemoryRouter>
        );
        expect(screen.getByRole('link', { name: /Assessly home/i })).toHaveAttribute('href', '/');
    });
    it('routes Sign In link to login', () => {
        render(
            <MemoryRouter>
                <Landing />
            </MemoryRouter>
        );
        expect(screen.getByRole('link', { name: /Sign In/i })).toHaveAttribute('href', '/login');
    });
    it('routes Get Started link to login', () => {
        render(
            <MemoryRouter>
                <Landing />
            </MemoryRouter>
        );
        expect(screen.getByRole('link', { name: /Get Started/i })).toHaveAttribute('href', '/login');
    });
    it('routes Start Creating link to login', () => {
        render(
            <MemoryRouter>
                <Landing />
            </MemoryRouter>
        );
        expect(screen.getByRole('link', { name: /Start Creating/i })).toHaveAttribute('href', '/login');
    });
    it('routes Learn More link to pipeline section', () => {
        render(
            <MemoryRouter>
                <Landing />
            </MemoryRouter>
        );
        expect(screen.getByRole('link', { name: /Scroll down to learn more/i })).toHaveAttribute('href', '#pipeline');
    });
    it('renders the login illustration', () => {
		render(
             <MemoryRouter>
                <Landing />
            </MemoryRouter>
        );
		expect(screen.getByAltText(/Laptop illustration/i)).toBeTruthy();
		expect(screen.getByAltText(/star/i)).toBeTruthy();
	});
});