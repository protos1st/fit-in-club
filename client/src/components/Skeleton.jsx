const sk = {
  background: 'var(--color-line)',
  animation: 'skeleton-pulse 1.2s ease-in-out infinite',
  borderRadius: 'var(--radius)',
};

export function PersonRowSkeleton({ count = 3 }) {
  return Array.from({ length: count }, (_, i) => (
    <div key={i} className="person-row" style={{ animation: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
        <div style={{ ...sk, width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ ...sk, width: '60%', height: 14, marginBottom: 6 }} />
          <div style={{ ...sk, width: '40%', height: 12 }} />
        </div>
      </div>
      <div style={{ ...sk, width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
    </div>
  ));
}

export function ScheduleSkeleton() {
  return Array.from({ length: 7 }, (_, i) => (
    <div key={i} className="sched-row" style={{ animation: 'none' }}>
      <div style={{ ...sk, width: 36, height: 14, flexShrink: 0 }} />
      <div style={{ display: 'flex', gap: 8, flex: 1 }}>
        <div className="skeleton-chip" />
        {i % 2 === 0 && <div className="skeleton-chip" style={{ width: 72 }} />}
      </div>
    </div>
  ));
}

export function ChatBubbleSkeleton({ count = 4 }) {
  return Array.from({ length: count }, (_, i) => {
    const mine = i % 2 === 0;
    return (
      <div
        key={i}
        style={{
          ...sk,
          alignSelf: mine ? 'flex-end' : 'flex-start',
          width: mine ? '55%' : '65%',
          height: 40,
          borderRadius: 14,
          marginBottom: 8,
        }}
      />
    );
  });
}

export function CardSkeleton({ height = 120 }) {
  return (
    <div
      style={{
        ...sk,
        width: '100%',
        height,
        borderRadius: 'var(--radius-lg, 12px)',
      }}
    />
  );
}
