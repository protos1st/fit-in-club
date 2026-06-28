export function initials(name) {
  return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
}

export function formatTime(t) {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function timeAgo(iso) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export function lastActiveLabel(iso) {
  if (!iso) return null;
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return 'Active today';
  if (days === 1) return 'Active yesterday';
  if (days <= 7) return `Active ${days}d ago`;
  if (days <= 30) return `Active ${Math.round(days / 7)}w ago`;
  return 'Inactive';
}
