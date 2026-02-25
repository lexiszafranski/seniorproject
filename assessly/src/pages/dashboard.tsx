import { useUser } from '@clerk/clerk-react';
import '../styles/dashboard.css';
import ufImg from '../assets/ufimg.png';

function Dashboard() {
  const { user } = useUser();
  return (
    <div className="dashboard">
      <header className="header">
        <div className="header-logo">
        <img src={ufImg} alt="description" style={{ width: '100px', height: 'auto'}} />
        </div>
        <h1 className="header-welcome">WELCOME BACK, {user?.firstName?.toUpperCase() || 'User'}!</h1>
        <div className="header-actions">
          <button type="button" className="btn-new-quiz">New Quiz</button>
          <div className="header-avatar" />
        </div>
      </header>

      <hr className="separator" />

      <main className="main">
        <section className="section">
          <h2 className="section-heading">Published</h2>
          <div className="cards">
            <article className="card">
              <div className="card-top" />
              <span className="card-date">1/25/26</span>
              <h3 className="card-title">Practice Quiz 1: More Sorting</h3>
            </article>
            <article className="card">
              <div className="card-top" />
              <span className="card-date">1/30/26</span>
              <h3 className="card-title">Practice Quiz 2: More List, Stacks, Queues</h3>
            </article>
          </div>
        </section>

        <section className="section">
          <h2 className="section-heading">Drafts</h2>
          <div className="cards">
            <article className="card">
              <div className="card-top" />
              <span className="card-date">—</span>
              <h3 className="card-title">Draft quiz</h3>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
