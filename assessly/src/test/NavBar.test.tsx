import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom'; //needed to render link components on page
import NavBar from '../components/NavBar';

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => jest.fn(),
}));
const mockSignOut = jest.fn();
jest.mock('@clerk/clerk-react', () => ({
    useUser: () => ({
    user: {
        firstName: 'John',
        lastName: 'Doe',
        fullName: 'John Doe',
        primaryEmailAddress: { emailAddress: 'john@example.com' },
    },
    }),
    useClerk: () => ({
        signOut: mockSignOut,
    }),
}));

describe('NavBar Test', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    //Test 1: routes logo to home 
    it('routes brand link to home', () => {
        render(
            <MemoryRouter>
                <NavBar />
            </MemoryRouter>
        );
        expect(screen.getByRole('link', { name: /Assessly home/i })).toHaveAttribute('href', '/');
    });
    //Test 2: logout calls Clerk signOut and then landing 
    it('logout calls signOut with landing redirect', async () => {
        mockSignOut.mockResolvedValue(undefined);
        const user = userEvent.setup();
        render(
            <MemoryRouter>
                <NavBar />
            </MemoryRouter>
        );
        const logoutIcon = screen.getByLabelText('logout');
        await user.click(logoutIcon);
        expect(mockSignOut).toHaveBeenCalledWith({ redirectUrl: '/landing' });
    });
    //Test 3: displays welcome message
    it('displays user welcome message in NavBar', () => {
        render(
        <MemoryRouter>
            <NavBar />
        </MemoryRouter>
        );
        expect(screen.getByText('Welcome John!')).toBeTruthy();
    });
    //Test 4: displays avatar initial leter
    it('displays user first letter in avatar', () => {
        render(
            <MemoryRouter>
                <NavBar />
            </MemoryRouter>
        );
        expect(screen.getByLabelText('User profile initial')).toHaveTextContent('J');
    });
});