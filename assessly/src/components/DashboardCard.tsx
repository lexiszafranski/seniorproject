type DashboardCardTone = 'published' | 'saved' | 'pending' | 'neutral';

interface DashboardCardProps {
  title: string;
  
  imageSrc: string; //no
  imageAlt?: string; //no
  count?: number;
  singularLabel?: string;
  pluralLabel?: string;
  pointsPossible?: number;
  statusText?: string;
  statusTone?: DashboardCardTone;
  onClick?: () => void;
}

function DashboardCard({
  title,
  imageSrc,
  imageAlt,
  count,
  singularLabel = 'item',
  pluralLabel = 'items',
  pointsPossible,
  statusText,
  statusTone = 'neutral',
  onClick,
}: DashboardCardProps) {
  const hasCount = typeof count === 'number';
  const countText = hasCount
    ? `${count} ${count === 1 ? singularLabel : pluralLabel}`
    : '';
  const pointsText = typeof pointsPossible === 'number' ? ` • ${pointsPossible} points` : '';
  const metaText = `${countText}${pointsText}`.trim();

  return (
    <article
      className="card"
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
      <img src={imageSrc} alt={imageAlt || title} className="card-image" />
      <h3 className="card-title">{title}</h3>
      {metaText && <p className="card-meta">{metaText}</p>}
      {statusText && (
        <span className={`card-badge card-badge-${statusTone}`}>
          {statusText}
        </span>
      )}
    </article>
  );
}

export default DashboardCard;
