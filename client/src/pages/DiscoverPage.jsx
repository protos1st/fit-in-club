import { useEffect, useState, useMemo } from 'react';
import { api } from '../lib/api';
import { useToast } from '../lib/ToastContext';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatTime(t) {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function initials(name) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

function timeAgo(iso) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs} hr ago`;
}

function ProfileModal({ person, type, connectedTo, pendingTo, sentTo, onSend, onClose }) {
  const isConnected = connectedTo.has(person.user_id);
  const isSent = sentTo.has(person.user_id) || pendingTo.has(person.user_id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <div className="modal-header">
          <div className="modal-avatar">{initials(person.name)}</div>
          <h2 className="modal-name">{person.name}</h2>
          {person.training_type && <span className="tag">{person.training_type}</span>}
          {person.gender && person.gender !== 'Prefer not to say' && (
            <span className="tag" style={{ marginLeft: 4 }}>{person.gender}</span>
          )}
        </div>

        {person.bio && <p className="modal-bio">{person.bio}</p>}

        {type === 'live' && (
          <div className="modal-detail">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7" strokeDasharray="2 3"/></svg>
            <span>Checked in {timeAgo(person.checked_in_at)}</span>
          </div>
        )}

        {person.overlapping_slots && person.overlapping_slots.length > 0 && (
          <>
            <div className="modal-section-title">Overlapping Schedule</div>
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
            <span className="btn btn-ghost btn-block" style={{ cursor: 'default' }}>Already Connected</span>
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
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const showToast = useToast();

  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [trainingFilter, setTrainingFilter] = useState('');

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
    return result;
  }, [matches, search, genderFilter, trainingFilter]);

  const hasFilters = search || genderFilter || trainingFilter;

  if (loading) return <div className="spinner-text">Finding gym buddies…</div>;

  return (
    <div>
      <div className="page-eyebrow">Discover</div>
      <h1 className="page-title">Find Buddies</h1>
      <p className="page-sub">People at the gym right now and members with matching schedules.</p>

      <div className="filter-bar">
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
        <div className="filter-chips">
          {genders.length > 0 && (
            <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className="filter-select" aria-label="Filter by gender">
              <option value="">All genders</option>
              {genders.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          )}
          {trainingTypes.length > 0 && (
            <select value={trainingFilter} onChange={(e) => setTrainingFilter(e.target.value)} className="filter-select" aria-label="Filter by training">
              <option value="">All training</option>
              {trainingTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
        </div>
        {hasFilters && (
          <button className="filter-clear" onClick={() => { setSearch(''); setGenderFilter(''); setTrainingFilter(''); }}>
            Clear filters
          </button>
        )}
      </div>

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
              filteredLive.map((p) => (
                <div className="person-row person-row-clickable" key={p.user_id} onClick={() => { setSelectedPerson(p); setSelectedType('live'); }}>
                  <div className="person-avatar">{initials(p.name)}</div>
                  <div className="person-info">
                    <div className="person-name"><span className="pulse-dot" />{p.name}</div>
                    <div className="person-meta">
                      {p.training_type && <span className="tag tag-spaced">{p.training_type}</span>}
                      {timeAgo(p.checked_in_at)}
                    </div>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-hint)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              ))
            )}
          </div>
        </>
      )}

      <div className="section-title mt-md">
        Schedule matches
        <span className="schedule-count">{filteredMatches.length}</span>
      </div>

      {matchNote ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-title">Set your schedule first</div>
            <p>{matchNote}</p>
          </div>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-title">{hasFilters ? 'No matches' : 'No overlaps yet'}</div>
            <p>{hasFilters ? 'Try broadening your filters.' : 'No one else trains during your current time slots yet.'}</p>
          </div>
        </div>
      ) : (
        <div className="card">
          {filteredMatches.map((m, idx) => (
            <div
              className={`person-row person-row-clickable ${idx < filteredMatches.length - 1 ? '' : 'person-row-last'}`}
              key={m.user_id}
              onClick={() => { setSelectedPerson(m); setSelectedType('match'); }}
            >
              <div className="person-avatar">{initials(m.name)}</div>
              <div className="person-info">
                <div className="person-name">{m.name}</div>
                <div className="person-meta">
                  {m.training_type && <span className="tag tag-spaced">{m.training_type}</span>}
                  {m.overlapping_slots.length} overlapping slot{m.overlapping_slots.length !== 1 ? 's' : ''}
                </div>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-hint)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          ))}
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
          onClose={() => setSelectedPerson(null)}
        />
      )}
    </div>
  );
}
