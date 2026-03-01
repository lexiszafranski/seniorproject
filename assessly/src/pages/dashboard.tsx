import { useUser } from '@clerk/clerk-react';
import '../styles/dashboard.css';
import ufImg from '../assets/ufimg.png';
import cardImg from '../assets/cardimg.jpg';

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
              <img src={cardImg} alt="Practice Quiz 1" className="card-image" />
              <h3 className="card-title">Practice Quiz 1: More Sorting</h3>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#666' }}>10 questions • 4 question groups</p>
            </article>
            <article className="card">
              <img src={cardImg} alt="Practice Quiz 2" className="card-image" />
              <h3 className="card-title">Practice Quiz 2: More List, Stacks, Queues</h3>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#666' }}>8 questions • 2 question groups</p>
            </article>
          </div>
        </section>

        <section className="section">
          <h2 className="section-heading">Drafts</h2>
          <div className="cards">
            <article className="card">
              <img src={cardImg} alt="Draft quiz" className="card-image" />
              <h3 className="card-title">Draft quiz</h3>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
