import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useToast } from '../lib/ToastContext';
import { formatTime, initials, timeAgo, lastActiveLabel } from '../lib/utils';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import Portal from '../components/Portal';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function ProfileModal({ person, type, connectedTo, pendingTo, sentTo, onSend, onClose, onMessage, onCancel, outgoing }) {
  const isConnected = connectedTo.has(person.user_id);
  const isSent = sentTo.has(person.user_id) || pendingTo.has(person.user_id);
  const pendingRequest = (outgoing || []).find(r => r.user_id === person.user_id);
  const activity = lastActiveLabel(person.last_active);

  return (
    <Portal>
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-label={`${person.name}'s profile`} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <div className="modal-header">
          <Avatar name={person.name} size={56} />
          <h2 className="modal-name">{person.name}</h2>
          {person.training_type && <span className="tag">{person.training_type}</span>}
          {person.gender && person.gender !== 'Prefer not to say' && (
            <span className="tag tag-ml">{person.gender}</span>
          )}
          {activity && type === 'match' && (
            <div className="modal-activity">{activity}</div>
          )}
        </div>

        {person.bio && <p className="modal-bio">{person.bio}</p>}

        {type === 'live' && (
          <div className="modal-detail">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7" strokeDasharray="2 3"/></svg>
            <span>Checked in {timeAgo(person.checked_in_at)}{person.status_tag && ` · ${person.status_tag}`}</span>
          </div>
        )}

        {person.overlapping_slots && person.overlapping_slots.length > 0 && (
          <>
            <div className="modal-section-title">Overlapping schedule</div>
            <div className="modal-slots">
              {person.overlapping_slots.map((s, i) => (
                <div className="modal-slot" key={i}>
                  <span className="modal-slot-day">{DAYS[s.day_of_week]}</span>
                  <span className="modal-slot-time">{formatTime(s.start_time)} – {formatTime(s.end_time)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="modal-action">
          {isConnected ? (
            <button className="btn btn-primary btn-block" onClick={() => onMessage(person.user_id)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="btn-icon-inline"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              Message
            </button>
          ) : isSent && pendingRequest ? (
            <button className="btn btn-danger-outline btn-block" onClick={() => onCancel(pendingRequest.id)}>
              Cancel Request
            </button>
          ) : (
            <button
              className="btn btn-primary btn-block"
              onClick={() => { onSend(person.user_id); }}
              disabled={isSent}
            >
              {isSent ? 'Request Sent' : 'Send Buddy Request'}
            </button>
          )}
        </div>
      </div>
    </div>
    </Portal>
  );
}

export default function DiscoverPage() {
  const [live, setLive] = useState([]);
  const [matches, setMatches] = useState([]);
  const [matchNote, setMatchNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [sentTo, setSentTo] = useState(new Set());
  const [connectedTo, setConnectedTo] = useState(new Set());
  const [pendingTo, setPendingTo] = useState(new Set());
  const [outgoing, setOutgoing] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const showToast = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [trainingFilter, setTrainingFilter] = useState('');
  const [dayFilter, setDayFilter] = useState('');
  const [sortBy, setSortBy] = useState('overlaps');
  const [showFilters, setShowFilters] = useState(false);
  const [showAllLive, setShowAllLive] = useState(false);
  const [showAllMatches, setShowAllMatches] = useState(false);
  const PREVIEW_COUNT = 4;

  useEffect(() => {
    Promise.all([
      api.getLive(),
      api.getOverlap(),
      api.getConnections(),
      api.getOutgoing()
    ]).then(([liveData, overlap, conn, out]) => {
      setLive(liveData.live || []);
      setMatches(overlap.matches || []);
      setMatchNote(overlap.note || '');
      setConnectedTo(new Set((conn.connections || []).map((c) => c.user_id)));
      setOutgoing(out.outgoing || []);
      setPendingTo(new Set((out.outgoing || []).map((r) => r.user_id)));
    }).finally(() => setLoading(false));

    const interval = setInterval(() => {
      api.getLive().then((data) => setLive(data.live || []));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  async function sendRequest(userId) {
    try {
      const data = await api.sendBuddyRequest(userId);
      setSentTo((prev) => new Set(prev).add(userId));
      if (data.note) showToast(data.note, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function cancelRequest(requestId) {
    try {
      await api.cancelRequest(requestId);
      const updated = outgoing.filter(r => r.id !== requestId);
      setOutgoing(updated);
      setPendingTo(new Set(updated.map(r => r.user_id)));
      setSentTo(prev => { const s = new Set(prev); updated.forEach(r => s.delete(r.user_id)); return s; });
      showToast('Request cancelled', 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function goToChat(userId) {
    navigate(`/connections/${userId}`);
  }

  const genders = useMemo(() => {
    const all = [...live, ...matches];
    const g = new Set();
    all.forEach((p) => { if (p.gender && p.gender !== 'Prefer not to say') g.add(p.gender); });
    return Array.from(g).sort();
  }, [live, matches]);

  const trainingTypes = useMemo(() => {
    const all = [...live, ...matches];
    const t = new Set();
    all.forEach((p) => { if (p.training_type) t.add(p.training_type); });
    return Array.from(t).sort();
  }, [live, matches]);

  const filteredLive = useMemo(() => {
    let result = [...live];
    if (search) result = result.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    if (genderFilter) result = result.filter((p) => p.gender === genderFilter);
    if (trainingFilter) result = result.filter((p) => p.training_type === trainingFilter);
    return result;
  }, [live, search, genderFilter, trainingFilter]);

  const filteredMatches = useMemo(() => {
    let result = [...matches];
    if (search) result = result.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()));
    if (genderFilter) result = result.filter((m) => m.gender === genderFilter);
    if (trainingFilter) result = result.filter((m) => m.training_type === trainingFilter);
    if (dayFilter !== '') {
      const day = Number(dayFilter);
      result = result.filter((m) => m.overlapping_slots.some((s) => s.day_of_week === day));
    }
    if (sortBy === 'overlaps') result.sort((a, b) => b.overlapping_slots.length - a.overlapping_slots.length);
    else if (sortBy === 'name') result.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'recent') result.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    else if (sortBy === 'active') result.sort((a, b) => new Date(b.last_active || 0) - new Date(a.last_active || 0));
    return result;
  }, [matches, search, genderFilter, trainingFilter, dayFilter, sortBy]);

  const hasFilters = genderFilter || trainingFilter || dayFilter !== '';
  const activeFilterCount = (genderFilter ? 1 : 0) + (trainingFilter ? 1 : 0) + (dayFilter !== '' ? 1 : 0);

  if (loading) return <div className="spinner-text">Finding gym buddies…</div>;

  return (
    <div>
      <div className="page-eyebrow">Discover</div>
      <h1 className="page-title">Find Buddies</h1>
      <p className="page-sub">People at the gym right now and members with matching schedules.</p>

      <div className="search-row">
        <div className="filter-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-hint)" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            aria-label="Search members"
          />
        </div>
        <button className={`filter-icon-btn ${hasFilters ? 'filter-icon-active' : ''}`} onClick={() => setShowFilters(true)} aria-label="Filters">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
          {activeFilterCount > 0 && <span className="filter-badge">{activeFilterCount}</span>}
        </button>
      </div>

      {hasFilters && (
        <div className="active-filters">
          {genderFilter && <button className="active-filter-chip" onClick={() => setGenderFilter('')}>{genderFilter} ×</button>}
          {trainingFilter && <button className="active-filter-chip" onClick={() => setTrainingFilter('')}>{trainingFilter} ×</button>}
          {dayFilter !== '' && <button className="active-filter-chip" onClick={() => setDayFilter('')}>{DAYS[dayFilter]} ×</button>}
        </div>
      )}

      {showFilters && (
        <Portal>
        <div className="modal-overlay" onClick={() => setShowFilters(false)}>
          <div className="filter-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="filter-sheet-header">
              <h3 className="filter-sheet-title">Filters</h3>
              <button className="modal-close" onClick={() => setShowFilters(false)} aria-label="Close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {genders.length > 0 && (
              <div className="filter-sheet-section">
                <div className="filter-sheet-label">Gender</div>
                <div className="filter-sheet-options">
                  <button className={`filter-pill ${genderFilter === '' ? 'filter-pill-active' : ''}`} onClick={() => setGenderFilter('')}>All</button>
                  {genders.map((g) => (
                    <button key={g} className={`filter-pill ${genderFilter === g ? 'filter-pill-active' : ''}`} onClick={() => setGenderFilter(g)}>{g}</button>
                  ))}
                </div>
              </div>
            )}

            {trainingTypes.length > 0 && (
              <div className="filter-sheet-section">
                <div className="filter-sheet-label">Training type</div>
                <div className="filter-sheet-options">
                  <button className={`filter-pill ${trainingFilter === '' ? 'filter-pill-active' : ''}`} onClick={() => setTrainingFilter('')}>All</button>
                  {trainingTypes.map((t) => (
                    <button key={t} className={`filter-pill ${trainingFilter === t ? 'filter-pill-active' : ''}`} onClick={() => setTrainingFilter(t)}>{t}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="filter-sheet-section">
              <div className="filter-sheet-label">Day</div>
              <div className="filter-sheet-options">
                <button className={`filter-pill ${dayFilter === '' ? 'filter-pill-active' : ''}`} onClick={() => setDayFilter('')}>All</button>
                {DAYS.map((d, i) => (
                  <button key={i} className={`filter-pill ${dayFilter === String(i) ? 'filter-pill-active' : ''}`} onClick={() => setDayFilter(String(i))}>{d}</button>
                ))}
              </div>
            </div>

            <div className="filter-sheet-actions">
              <button className="btn btn-ghost" onClick={() => { setGenderFilter(''); setTrainingFilter(''); setDayFilter(''); }}>Clear all</button>
              <button className="btn btn-primary rounded-pill" onClick={() => setShowFilters(false)}>Show results</button>
            </div>
          </div>
        </div>
        </Portal>
      )}

      {live.length > 0 && (
        <>
          <div className="section-title">
            At the gym now
            <span className="schedule-count">{filteredLive.length}</span>
          </div>
          <div className="card">
            {filteredLive.length === 0 ? (
              <div className="empty-state"><p>No one matches your filters.</p></div>
            ) : (
              <>
                {(showAllLive ? filteredLive : filteredLive.slice(0, PREVIEW_COUNT)).map((p) => {
                  const isConn = connectedTo.has(p.user_id);
                  const isSent = sentTo.has(p.user_id) || pendingTo.has(p.user_id);
                  return (
                    <div className="person-row person-row-clickable" key={p.user_id} onClick={() => { setSelectedPerson(p); setSelectedType('live'); }}>
                      <div className="avatar-wrap">
                        <Avatar name={p.name} size={40} />
                        {isConn && <span className="connected-badge" aria-label="Connected"><svg width="12" height="12" viewBox="0 0 24 24" fill="#fff" stroke="none"><path d="M20 6L9 17l-5-5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></span>}
                      </div>
                      <div className="person-info">
                        <div className="person-name"><span className="pulse-dot" />{p.name}</div>
                        <div className="person-meta">{timeAgo(p.checked_in_at)}{p.status_tag && <span className="status-tag-label"> · {p.status_tag}</span>}</div>
                      </div>
                      {isConn ? (
                        <span className="disc-status-tag disc-status-connected">Connected</span>
                      ) : isSent ? (
                        <span className="disc-status-tag disc-status-pending">Pending</span>
                      ) : (
                        <button className="disc-quick-add" onClick={(e) => { e.stopPropagation(); sendRequest(p.user_id); }} aria-label={`Send request to ${p.name}`} title="Send buddy request">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        </button>
                      )}
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-hint)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                  );
                })}
                {!showAllLive && filteredLive.length > PREVIEW_COUNT && (
                  <button className="show-more-btn" onClick={() => setShowAllLive(true)}>
                    Show all ({filteredLive.length})
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}

      <div className="section-title mt-md">
        <span>Schedule matches</span>
        <span className="schedule-count">{filteredMatches.length}</span>
      </div>

      {!matchNote && filteredMatches.length > 0 && (
        <div className="disc-sort-row">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="disc-sort-select" aria-label="Sort matches">
            <option value="overlaps">Most overlaps</option>
            <option value="active">Most active</option>
            <option value="name">Name A–Z</option>
            <option value="recent">Recently joined</option>
          </select>
        </div>
      )}

      {matchNote ? (
        <div className="card">
          <EmptyState
            type="schedule"
            title="Set your schedule first"
            message={matchNote}
            action="Set up schedule"
            onAction={() => navigate('/')}
          />
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="card">
          <EmptyState
            type="discover"
            title={(hasFilters || search) ? 'No matches found' : 'No overlaps yet'}
            message={(hasFilters || search) ? 'Try broadening your filters or check back later.' : "As more members join, you'll find training partners here."}
          />
        </div>
      ) : (
        <div className="card">
          {(showAllMatches ? filteredMatches : filteredMatches.slice(0, PREVIEW_COUNT)).map((m, idx, arr) => {
            const isConn = connectedTo.has(m.user_id);
            const isSent = sentTo.has(m.user_id) || pendingTo.has(m.user_id);
            const activity = lastActiveLabel(m.last_active);
            return (
              <div
                className={`person-row person-row-clickable ${idx < arr.length - 1 ? '' : 'person-row-last'}`}
                key={m.user_id}
                onClick={() => { setSelectedPerson(m); setSelectedType('match'); }}
              >
                <div className="avatar-wrap">
                  <Avatar name={m.name} size={40} />
                  {isConn && <span className="connected-badge" aria-label="Connected"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg></span>}
                </div>
                <div className="person-info">
                  <div className="person-name">{m.name}</div>
                  <div className="person-meta">
                    {m.overlapping_slots.length} slot{m.overlapping_slots.length !== 1 ? 's' : ''}
                    {activity && <span className="disc-activity"> · {activity}</span>}
                  </div>
                </div>
                {isConn ? (
                  <span className="disc-status-tag disc-status-connected">Connected</span>
                ) : isSent ? (
                  <span className="disc-status-tag disc-status-pending">Pending</span>
                ) : (
                  <button className="disc-quick-add" onClick={(e) => { e.stopPropagation(); sendRequest(m.user_id); }} aria-label={`Send request to ${m.name}`} title="Send buddy request">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </button>
                )}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-hint)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            );
          })}
          {!showAllMatches && filteredMatches.length > PREVIEW_COUNT && (
            <button className="show-more-btn" onClick={() => setShowAllMatches(true)}>
              Show all ({filteredMatches.length})
            </button>
          )}
        </div>
      )}

      {selectedPerson && (
        <ProfileModal
          person={selectedPerson}
          type={selectedType}
          connectedTo={connectedTo}
          pendingTo={pendingTo}
          sentTo={sentTo}
          onSend={sendRequest}
          onCancel={cancelRequest}
          onMessage={goToChat}
          outgoing={outgoing}
          onClose={() => setSelectedPerson(null)}
        />
      )}
    </div>
  );
}
