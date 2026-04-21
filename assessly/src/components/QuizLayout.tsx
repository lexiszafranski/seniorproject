import DraftIcon from '../assets/SpinnerGap.svg';
import PublishedIcon from '../assets/RocketLaunch.svg';

type QuizLayoutTone = 'Published' | 'Saved' | 'Review' | 'Editing' | 'neutral';

interface QuizLayoutProps {
    icon: string
    title: string;
    imageAlt?: string; //no
    count?: number;
    singularLabel?: string;
    pluralLabel?: string;
    statusText?: string;
    statusTone?: QuizLayoutTone;
    date?: string;
    onClick?: () => void;
}

function QuizLayout({
    icon,
    title,
    imageAlt,
    count,
    singularLabel = 'question',
    pluralLabel = 'questions',
    statusText,
    statusTone = 'neutral',
    date,
    onClick,
}: QuizLayoutProps) {
  const hasCount = typeof count === 'number';
  const countText = hasCount
    ? `${count} ${count === 1 ? singularLabel : pluralLabel}`
    : '';
  const metaText = `${countText}`.trim();
  const quizIcon = icon === 'draft' ? DraftIcon : PublishedIcon;

  return (
    <div className="quiz"
        onClick={onClick}
        style={onClick ? { cursor: 'pointer' } : undefined}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
            onClick
            ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onClick();
                }
                }
            : undefined
        }
    > 
        <div className="quiz-icon-title">
            <img src={quizIcon} alt={imageAlt || title} className="icon" />
            <div className="quiz-content">
                <h3 className="quiz-title">{title}</h3>
                {metaText && <p className="quiz-metrics">{metaText}</p>}
            </div>
        </div>
        
        <div className="quiz-content">
            {statusText && (
            <span className={`card-badge card-badge-${statusTone}`}>
            {statusText}
            </span>
            )}
            <p className="quiz-metrics-date">{date}</p>
        </div> 
      </div>
  );
}

export default QuizLayout;
