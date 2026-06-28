const illustrations = {
  schedule: (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="60" r="50" fill="var(--color-sage-bg)" />
      <rect x="35" y="30" width="50" height="55" rx="6" fill="var(--color-card)" stroke="var(--color-navy)" strokeWidth="2" />
      <rect x="35" y="30" width="50" height="16" rx="6" fill="var(--color-navy)" />
      <circle cx="48" cy="38" r="2" fill="var(--color-accent)" />
      <circle cx="60" cy="38" r="2" fill="var(--color-accent)" />
      <circle cx="72" cy="38" r="2" fill="var(--color-accent)" />
      <line x1="42" y1="56" x2="58" y2="56" stroke="var(--color-line)" strokeWidth="2" strokeLinecap="round" />
      <line x1="42" y1="64" x2="72" y2="64" stroke="var(--color-line)" strokeWidth="2" strokeLinecap="round" />
      <line x1="42" y1="72" x2="64" y2="72" stroke="var(--color-line)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="85" cy="75" r="16" fill="var(--color-accent)" opacity="0.9" />
      <line x1="85" y1="68" x2="85" y2="82" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="78" y1="75" x2="92" y2="75" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  discover: (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="60" r="50" fill="var(--color-sage-bg)" />
      <circle cx="45" cy="50" r="14" fill="var(--color-navy)" opacity="0.8" />
      <circle cx="45" cy="44" r="6" fill="var(--color-card)" />
      <path d="M35 58a10 10 0 0120 0" fill="var(--color-card)" />
      <circle cx="75" cy="50" r="14" fill="var(--color-accent)" opacity="0.8" />
      <circle cx="75" cy="44" r="6" fill="var(--color-card)" />
      <path d="M65 58a10 10 0 0120 0" fill="var(--color-card)" />
      <path d="M50 72 Q60 82 70 72" stroke="var(--color-navy)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <circle cx="60" cy="77" r="3" fill="var(--color-accent)" />
    </svg>
  ),
  requests: (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="60" r="50" fill="var(--color-sage-bg)" />
      <rect x="30" y="40" width="60" height="40" rx="8" fill="var(--color-card)" stroke="var(--color-navy)" strokeWidth="2" />
      <path d="M30 48l30 18 30-18" stroke="var(--color-accent)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="82" cy="38" r="10" fill="var(--color-accent)" />
      <line x1="82" y1="33" x2="82" y2="43" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="77" y1="38" x2="87" y2="38" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  messages: (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="60" r="50" fill="var(--color-sage-bg)" />
      <rect x="28" y="35" width="44" height="30" rx="8" fill="var(--color-navy)" />
      <polygon points="40,65 34,78 52,65" fill="var(--color-navy)" />
      <rect x="48" y="50" width="44" height="28" rx="8" fill="var(--color-accent)" />
      <polygon points="80,78 86,90 68,78" fill="var(--color-accent)" />
      <circle cx="44" cy="49" r="2" fill="white" />
      <circle cx="50" cy="49" r="2" fill="white" />
      <circle cx="56" cy="49" r="2" fill="white" />
      <circle cx="64" cy="63" r="2" fill="white" />
      <circle cx="70" cy="63" r="2" fill="white" />
      <circle cx="76" cy="63" r="2" fill="white" />
    </svg>
  ),
  chat: (
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="40" fill="var(--color-sage-bg)" />
      <path d="M30 45c0-8 9-15 20-15s20 7 20 15-9 15-20 15c-3 0-6-.5-8-1.5L32 64l4-10c-4-3-6-6-6-9z" fill="var(--color-navy)" />
      <circle cx="42" cy="44" r="2" fill="var(--color-accent)" />
      <circle cx="50" cy="44" r="2" fill="var(--color-accent)" />
      <circle cx="58" cy="44" r="2" fill="var(--color-accent)" />
    </svg>
  ),
};

export default function EmptyState({ type, title, message, action, onAction }) {
  return (
    <div className="empty-state-v2">
      {illustrations[type] && (
        <div className="empty-state-illustration">{illustrations[type]}</div>
      )}
      <h3 className="empty-state-v2-title">{title}</h3>
      <p className="empty-state-v2-msg">{message}</p>
      {action && (
        <button className="btn btn-primary rounded-pill mt-sm" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}
