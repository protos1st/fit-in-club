import { useEffect, useState, useMemo, useRef } from 'react';
import { TRAINING_OPTIONS } from './OnboardingPage';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useToast } from '../lib/ToastContext';
import { formatTime, timeAgo } from '../lib/utils';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import Portal from '../components/Portal';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ── Tinder card ── */
function SwipeCard({ person, onConnect, onPass, isConnected, isPending, onMessage, zIndex, isTop }) {
  const [exitDir, setExitDir] = useState(null); // 'left' | 'right'
  const [drag, setDrag] = useState({ x: 0, y: 0, dragging: false });
  const startRef = useRef(null);
  const cardRef = useRef(null);

  function startDrag(clientX, clientY) {
    startRef.current = { x: clientX, y: clientY };
    setDrag({ x: 0, y: 0, dragging: true });
  }
  function moveDrag(clientX, clientY) {
    if (!startRef.current) return;
    setDrag({ x: clientX - startRef.current.x, y: clientY - startRef.current.y, dragging: true });
  }
  function endDrag() {
    if (!startRef.current) return;
    const dx = drag.x;
    startRef.current = null;
    if (Math.abs(dx) > 80) {
      triggerExit(dx > 0 ? 'right' : 'left');
    } else {
      setDrag({ x: 0, y: 0, dragging: false });
    }
  }

  function triggerExit(dir) {
    setExitDir(dir);
    setTimeout(() => {
      if (dir === 'right') onConnect();
      else onPass();
    }, 300);
  }

  const rotate = drag.x / 12;
  const likeOpacity = Math.min(Math.max(drag.x / 80, 0), 1);
  const nopeOpacity = Math.min(Math.max(-drag.x / 80, 0), 1);

  const style = exitDir
    ? { transform: `translateX(${exitDir === 'right' ? '120%' : '-120%'}) rotate(${exitDir === 'right' ? 20 : -20}deg)`, transition: 'transform 0.3s ease', opacity: 0 }
    : drag.dragging
    ? { transform: `translate(${drag.x}px, ${drag.y * 0.3}px) rotate(${rotate}deg)`, cursor: 'grabbing' }
    : { transition: 'transform 0.2s ease' };

  return (
    <div
      ref={cardRef}
      className="swipe-card"
      style={{ zIndex, ...style }}
      onMouseDown={isTop ? (e) => startDrag(e.clientX, e.clientY) : undefined}
      onMouseMove={isTop && drag.dragging ? (e) => moveDrag(e.clientX, e.clientY) : undefined}
      onMouseUp={isTop ? endDrag : undefined}
      onMouseLeave={isTop && drag.dragging ? endDrag : undefined}
      onTouchStart={isTop ? (e) => startDrag(e.touches[0].clientX, e.touches[0].clientY) : undefined}
      onTouchMove={isTop ? (e) => { e.preventDefault(); moveDrag(e.touches[0].clientX, e.touches[0].clientY); } : undefined}
      onTouchEnd={isTop ? endDrag : undefined}
    >
      {/* Photo */}
      {person.avatar_url ? (
        <img src={person.avatar_url} alt={person.name} className="swipe-card-photo" draggable={false} />
      ) : (
        <div className="swipe-card-no-photo">
          <Avatar name={person.name} size={120} />
          <span className="swipe-no-photo-name">{person.name.split(' ')[0]}</span>
        </div>
      )}

      {/* Drag indicators */}
      {isTop && (
        <>
          <div className="swipe-label swipe-label-like" style={{ opacity: likeOpacity }}>CONNECT</div>
          <div className="swipe-label swipe-label-nope" style={{ opacity: nopeOpacity }}>PASS</div>
        </>
      )}

      {/* Info overlay */}
      <div className="swipe-card-info">
        <div className="swipe-card-name">
          {person.name}
          {person.gender && person.gender !== 'Prefer not to say' && (
            <span className="swipe-card-gender">{person.gender}</span>
          )}
        </div>
        {person.training_type && <div className="swipe-card-training">{person.training_type}</div>}
        {person.status_tag && <div className="swipe-card-status">● {person.status_tag}</div>}
        {person.overlapping_slots?.length > 0 && (
          <div className="swipe-card-slots">
            {person.overlapping_slots.slice(0, 2).map((s, i) => (
              <span key={i} className="swipe-card-slot">{DAYS[s.day_of_week]} {formatTime(s.start_time)}</span>
            ))}
            {person.overlapping_slots.length > 2 && <span className="swipe-card-slot">+{person.overlapping_slots.length - 2}</span>}
          </div>
        )}
        {person.bio && <div className="swipe-card-bio">{person.bio}</div>}
        {person.checked_in_at && (
          <div className="swipe-card-live">● At gym {timeAgo(person.checked_in_at)}</div>
        )}
      </div>

      {/* Connected / Pending badge */}
      {isConnected && <div className="swipe-card-badge swipe-card-badge-connected">Connected</div>}
      {isPending && !isConnected && <div className="swipe-card-badge swipe-card-badge-pending">Pending</div>}
    </div>
  );
}

/* ── Live list row ── */
function LiveListRow({ person, onConnect, onPass, onMessage, isConnected, isPending }) {
  return (
    <div className="live-row">
      {person.avatar_url ? (
        <img src={person.avatar_url} alt={person.name} className="live-row-photo" />
      ) : (
        <Avatar name={person.name} size={52} />
      )}
      <div className="live-row-info">
        <div className="live-row-name">
          {person.name}
          {person.gender && person.gender !== 'Prefer not to say' && (
            <span className="live-row-gender">{person.gender}</span>
          )}
        </div>
        {person.training_type && <div className="live-row-training">{person.training_type}</div>}
        <div className="live-row-status">
          {person.status_tag && <span>{person.status_tag} · </span>}
          <span className="live-row-live">● At gym {timeAgo(person.checked_in_at)}</span>
        </div>
      </div>
      <div className="live-row-actions">
        {isConnected ? (
          <button className="btn btn-outline btn-sm" onClick={onMessage} aria-label="Message">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          </button>
        ) : (
          <>
            <button className="live-row-pass" onClick={onPass} aria-label="Pass">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <button className="btn btn-primary btn-sm" onClick={onConnect} disabled={isPending}>
              {isPending ? 'Sent' : 'Connect'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function DiscoverPage() {
  const [live, setLive] = useState([]);
  const [matches, setMatches] = useState([]);
  const [matchNote, setMatchNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [sentTo, setSentTo] = useState(new Set());
  const [connectedTo, setConnectedTo] = useState(new Set());
  const [pendingTo, setPendingTo] = useState(new Set());
  const [outgoing, setOutgoing] = useState([]);
  const [tab, setTab] = useState('matches'); // 'matches' | 'live'
  const [cardIdx, setCardIdx] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [genderFilter, setGenderFilter] = useState('');
  const [trainingFilter, setTrainingFilter] = useState([]);
  const [dayFilter, setDayFilter] = useState('');
  const showToast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.allSettled([api.getLive(), api.getOverlap(), api.getConnections(), api.getOutgoing()])
      .then(([liveRes, overlapRes, connRes, outRes]) => {
        if (liveRes.status === 'fulfilled') setLive(liveRes.value.live || []);
        if (overlapRes.status === 'fulfilled') {
          setMatches(overlapRes.value.matches || []);
          setMatchNote(overlapRes.value.note || '');
        }
        if (connRes.status === 'fulfilled') setConnectedTo(new Set((connRes.value.connections || []).map((c) => c.user_id)));
        if (outRes.status === 'fulfilled') {
          setOutgoing(outRes.value.outgoing || []);
          setPendingTo(new Set((outRes.value.outgoing || []).map((r) => r.user_id)));
        }
        const failed = [liveRes, overlapRes, connRes, outRes].some(r => r.status === 'rejected');
        if (failed) showToast('Some data failed to load. Pull to refresh.', 'error');
      }).finally(() => setLoading(false));

    const interval = setInterval(() => {
      api.getLive().then((data) => setLive(data.live || []));
    }, 30000);
    return () => clearInterval(interval);
  }, []);


  const queue = useMemo(() => {
    const pool = tab === 'live' ? live : matches;
    let result = [...pool];
    if (tab === 'matches') result = result.filter(p => !connectedTo.has(p.user_id) && !pendingTo.has(p.user_id) && !sentTo.has(p.user_id));
    if (genderFilter) result = result.filter(p => p.gender === genderFilter);
    const matchCount = (p) => {
      const userTypes = p.training_type?.split(',').map(t => t.trim()) || [];
      return trainingFilter.filter(f => userTypes.includes(f)).length;
    };
    if (trainingFilter.length > 0) {
      result = result.filter(p => matchCount(p) > 0);
      result.sort((a, b) => matchCount(b) - matchCount(a));
    }
    if (dayFilter !== '' && tab === 'matches') {
      result = result.filter(p => p.overlapping_slots?.some(s => s.day_of_week === Number(dayFilter)));
    }
    if (tab === 'live') {
      result.sort((a, b) => (connectedTo.has(b.user_id) ? 1 : 0) - (connectedTo.has(a.user_id) ? 1 : 0));
    }
    return result;
  }, [tab, live, matches, genderFilter, trainingFilter, dayFilter, connectedTo, pendingTo, sentTo]);

  // Reset card index when tab or filters change
  useEffect(() => { setCardIdx(0); }, [tab, genderFilter, trainingFilter.join(','), dayFilter]);

  async function handleConnect(person) {
    setCardIdx(i => i + 1);
    if (connectedTo.has(person.user_id)) {
      navigate(`/connections/${person.user_id}`);
      return;
    }
    if (sentTo.has(person.user_id) || pendingTo.has(person.user_id)) return;
    try {
      await api.sendBuddyRequest(person.user_id);
      setSentTo(prev => new Set(prev).add(person.user_id));
      showToast(`Buddy request sent to ${person.name}!`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function handlePass(person) {
    setCardIdx(i => i + 1);
    const target = person || remaining[0];
    if (target) api.passProfile(target.user_id).catch(() => {});
  }

  const remaining = queue.slice(cardIdx);
  const activeFilterCount = (genderFilter ? 1 : 0) + (trainingFilter.length > 0 ? 1 : 0) + (dayFilter !== '' ? 1 : 0);

  if (loading) return (
    <div className="swipe-loading">
      <div className="swipe-card-skeleton" />
      <div className="swipe-actions-skeleton" />
    </div>
  );

  return (
    <div className="swipe-page">
      {/* Header */}
      <div className="swipe-header">
        <div className="swipe-tabs">
          <button className={`swipe-tab ${tab === 'matches' ? 'swipe-tab-active' : ''}`} onClick={() => setTab('matches')}>
            Schedule match
            {matches.length > 0 && <span className="swipe-tab-count">{matches.length}</span>}
          </button>
          <button className={`swipe-tab ${tab === 'live' ? 'swipe-tab-active' : ''}`} onClick={() => setTab('live')}>
            Live now
            {live.length > 0 && <span className="swipe-tab-count swipe-tab-count-live">{live.length}</span>}
          </button>
        </div>
        <button className={`swipe-filter-btn ${activeFilterCount > 0 ? 'swipe-filter-active' : ''}`} onClick={() => setShowFilters(true)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
          {activeFilterCount > 0 && <span className="swipe-filter-badge">{activeFilterCount}</span>}
        </button>
      </div>

      {tab === 'live' ? (
        /* Scrollable live list */
        <div className="live-list-wrap">
          {queue.length === 0 ? (
            <div className="swipe-empty-card">
              <EmptyState
                type="messages"
                title="No one live right now"
                message="Check back when more members check in."
                action={activeFilterCount > 0 ? 'Clear filters' : undefined}
                onAction={activeFilterCount > 0 ? () => { setGenderFilter(''); setTrainingFilter([]); setDayFilter(''); } : undefined}
              />
            </div>
          ) : (
            <div className="live-list">
              {queue.map((person) => (
                <LiveListRow
                  key={person.user_id}
                  person={person}
                  isConnected={connectedTo.has(person.user_id)}
                  isPending={sentTo.has(person.user_id) || pendingTo.has(person.user_id)}
                  onConnect={() => handleConnect(person)}
                  onPass={() => handlePass(person)}
                  onMessage={() => navigate(`/connections/${person.user_id}`)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Card stack */}
          <div className="swipe-stack-wrap">
            {matchNote ? (
              <div className="swipe-empty-card">
                <EmptyState type="schedule" title="Set your schedule first" message={matchNote} action="Set schedule" onAction={() => navigate('/')} />
              </div>
            ) : remaining.length === 0 ? (
              <div className="swipe-empty-card">
                <EmptyState
                  type="discover"
                  title="You've seen everyone"
                  message={activeFilterCount > 0 ? 'Try clearing your filters.' : 'New members join every day. Check back soon!'}
                  action={activeFilterCount > 0 ? 'Clear filters' : undefined}
                  onAction={activeFilterCount > 0 ? () => { setGenderFilter(''); setTrainingFilter([]); setDayFilter(''); } : undefined}
                />
              </div>
            ) : (
              <div className="swipe-stack">
                {/* Show up to 3 cards stacked */}
                {remaining.slice(0, 3).map((person, i) => (
                  <SwipeCard
                    key={person.user_id}
                    person={person}
                    zIndex={3 - i}
                    isTop={i === 0}
                    isConnected={connectedTo.has(person.user_id)}
                    isPending={sentTo.has(person.user_id) || pendingTo.has(person.user_id)}
                    onConnect={() => handleConnect(person)}
                    onPass={() => handlePass(person)}
                    onMessage={(id) => navigate(`/connections/${id}`)}
                  />
                ))}
              </div>
            )}

            {/* Counter */}
            {remaining.length > 0 && (
              <div className="swipe-counter">{cardIdx + 1} / {queue.length}</div>
            )}
          </div>

          {/* Action buttons */}
          {remaining.length > 0 && (
            <div className="swipe-actions">
              <button className="swipe-btn swipe-btn-pass" onClick={() => handlePass(remaining[0])} aria-label="Pass">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>

              {connectedTo.has(remaining[0]?.user_id) ? (
                <button className="swipe-btn swipe-btn-message" onClick={() => navigate(`/connections/${remaining[0].user_id}`)} aria-label="Message">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                </button>
              ) : (
                <button
                  className="swipe-btn swipe-btn-connect"
                  onClick={() => handleConnect(remaining[0])}
                  disabled={sentTo.has(remaining[0]?.user_id) || pendingTo.has(remaining[0]?.user_id)}
                  aria-label="Connect"
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Filter sheet */}
      {showFilters && (
        <Portal>
          <div className="sheet-backdrop" onClick={() => setShowFilters(false)} />
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="sheet-title">Filter</div>

            <div style={{ padding: '0 20px' }}>
              <div className="filter-sheet-label">Gender</div>
              <div className="filter-sheet-options">
                {['', 'Male', 'Female', 'Other'].map(g => (
                  <button key={g} className={`filter-pill ${genderFilter === g ? 'filter-pill-active' : ''}`} onClick={() => setGenderFilter(g)}>{g || 'All'}</button>
                ))}
              </div>

              <div className="filter-sheet-label" style={{ marginTop: 16 }}>Training type</div>
              <div className="filter-sheet-options">
                {TRAINING_OPTIONS.map(t => (
                  <button key={t} className={`filter-pill ${trainingFilter.includes(t) ? 'filter-pill-active' : ''}`}
                    onClick={() => setTrainingFilter(f => f.includes(t) ? f.filter(x => x !== t) : [...f, t])}>
                    {t}
                  </button>
                ))}
              </div>

              {tab === 'matches' && (
                <>
                  <div className="filter-sheet-label" style={{ marginTop: 16 }}>Day</div>
                  <div className="filter-sheet-options">
                    <button className={`filter-pill ${dayFilter === '' ? 'filter-pill-active' : ''}`} onClick={() => setDayFilter('')}>All</button>
                    {DAYS.map((d, i) => (
                      <button key={i} className={`filter-pill ${dayFilter === String(i) ? 'filter-pill-active' : ''}`} onClick={() => setDayFilter(String(i))}>{d}</button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="filter-sheet-actions">
              <button className="btn btn-ghost" onClick={() => { setGenderFilter(''); setTrainingFilter([]); setDayFilter(''); }}>Clear all</button>
              <button className="btn btn-primary" onClick={() => setShowFilters(false)}>
                Show {queue.length} {queue.length === 1 ? 'match' : 'matches'}
              </button>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
