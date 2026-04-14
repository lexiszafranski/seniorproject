import { useUser, useClerk } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import '../styles/dashboard.css';
import '../styles/landing.css';
import {
    SignOutIcon
} from '@phosphor-icons/react';

function NavBar() {
const { user } = useUser();
    const { signOut } = useClerk();
    const userInitial = (
        user?.firstName?.[0] ||
        user?.lastName?.[0] ||
        user?.fullName?.[0] ||
        user?.primaryEmailAddress?.emailAddress?.[0] ||
        'U'
    ).toUpperCase();

    async function handleLogout() {
        await signOut({ redirectUrl: '/landing' });
    }

    return (
    <header className="header">
        <Link to="/" className="brand" aria-label="Assessly home">
            Assessly
        </Link>

        <div className="header-actions">
            <p className="header-welcome">Welcome {user?.firstName || 'User'}!</p>
            <div className="header-avatar" aria-label="User profile initial">
                {userInitial}
            </div>
            <SignOutIcon size={30} weight="regular" className="btn-logout" onClick={handleLogout}/>
        </div>
    </header>
);
}
export default NavBar;