import { Link } from 'react-router-dom';
import {
	ArrowRightIcon,
    ArrowDownIcon,
	BinocularsIcon,
	FileTextIcon,
	SparkleIcon,
	UploadSimpleIcon,
} from '@phosphor-icons/react';
import starImage from '../assets/golden_star.png';
import laptopImage from '../assets/laptop.png';
import '../styles/landing.css';

const pipelineSteps = [
	{
		title: 'Prompt',
		description: 'Drop in course materials and define the quiz structure you want the system to generate.',
		icon: FileTextIcon,
	},
	{
		title: 'Generate',
		description: 'Turn course materials such as lecture PDFs into practice questions with a few clicks.',
		icon: SparkleIcon,
	},
	{
		title: 'Review',
		description: 'Check the output, refine wording, and keep the questions aligned to the course.',
		icon: BinocularsIcon,
	},
	{
		title: 'Sync',
		description: 'Push the final quiz back into your Canvas course once it is ready to publish.',
		icon: UploadSimpleIcon,
	},
];

function Landing() {
	return (
    <main className="landing-shell">
        <div className="landing-frame">
            <header className="landing-nav soft-panel">
                <Link to="/" className="brand" aria-label="Assessly home">
                    Assessly
                </Link>

                <div className="nav-actions">
                    <Link to="/login" className="nav-link">
                        Sign In
                    </Link>
                    <Link to="/login" className="button-link primary">
                        Get Started
                        <ArrowRightIcon size={18} weight="bold" />
                    </Link>
                </div>
            </header>

            <section className="hero">
                <div className="hero-copy">
                    <div className="eyebrow">
                        <SparkleIcon size={16} weight="fill" />
                        Course quizzes, simplified
                    </div>
                    <h1 className="hero-title">
                        <span>Your course materials,</span>
                        <span>turned into quizzes.</span>
                    </h1>
                    <p className="hero-subtitle">
                        Automate the repetitive work so you can focus on teaching, feedback, and better learning outcomes.
                    </p>
                    <div className="hero-actions">
                        <Link to="/login" className="button-link primary">
                            Start Creating
                            <ArrowRightIcon size={18} weight="bold" />
                        </Link>
                        <a href="#pipeline" className="scroll-cta">
                            Scroll down to learn more
                        <ArrowDownIcon size={16} weight="bold" />
                        </a>
                    </div>
                </div>

                <div className="hero-visual" aria-hidden="true">
                    <div className="hero-glow" />
                    <img className="hero-star" src={starImage} alt="" />
                    <img className="hero-laptop" src={laptopImage} alt="Laptop illustration" />
                </div>
            </section>

            <section className="pipeline" id="pipeline">
                <p className="pipeline-heading">The pipeline</p>
                <div className="pipeline-grid">
                    {pipelineSteps.map((step) => {
                        const Icon = step.icon;
                        return (
                            <article key={step.title} className="pipeline-card ">
                                <div className="pipeline-icon" aria-hidden="true">
                                    <Icon size={30} weight="regular" />
                                </div>
                                <h2 className="pipeline-title">{step.title}</h2>
                                <p className="pipeline-copy">{step.description}</p>
                            </article>
                        );
                    })}
                </div>
            </section>
        </div>
    </main>
	);
}

export default Landing;
