import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { useToast } from '../lib/ToastContext';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatTime(t) {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function SkeletonList() {
  return (
    <div className="schedule-list card">
      {DAYS.map((d, i) => (
        <div className="sched-row" key={i}>
          <span className="sched-day">{d}</span>
          <div className="sched-slots"><div className="skeleton-chip" /></div>
        </div>
      ))}
    </div>
  );
}

const STATUS_TAGS = ['Looking for a spotter', 'Open to join', 'Solo session', 'Cardio buddy wanted'];

function LiveBanner({ liveStatus, liveBusy, statusTag, setStatusTag, onToggle }) {
  const expiresAt = liveStatus?.expires_at;
  const timeLeft = expiresAt ? Math.max(0, Math.round((new Date(expiresAt) - Date.now()) / 60000)) : 0;

  return (
    <div className={`live-banner ${liveStatus ? 'on' : 'off'}`}>
      <div className="live-banner-text">
        {liveStatus ? (
          <>
            <strong><span className="pulse-dot" />You're at the gym</strong>
            <span>{timeLeft > 0 ? `Visible for ${timeLeft} more min` : 'Expiring soon'}</span>
            {liveStatus.status_tag && <span className="tag tag-sm" style={{ marginTop: 4 }}>{liveStatus.status_tag}</span>}
          </>
        ) : (
          <>
            <strong>Not checked in</strong>
            <span>Let others know you're at the gym</span>
            <div className="status-tag-picker">
              {STATUS_TAGS.map((t) => (
                <button key={t} className={`filter-pill ${statusTag === t ? 'filter-pill-active' : ''}`} onClick={() => setStatusTag(statusTag === t ? '' : t)}>{t}</button>
              ))}
            </div>
          </>
        )}
      </div>
      <button
        className={liveStatus ? 'btn btn-outline live-banner-action-on' : 'btn btn-primary'}
        onClick={onToggle}
        disabled={liveBusy}
        aria-label={liveStatus ? 'Check out of the gym' : 'Check in at the gym'}
      >
        {liveBusy ? 'Please wait…' : liveStatus ? 'Check out' : "I'm here now"}
      </button>
    </div>
  );
}

export default function MySchedulePage() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingDay, setAddingDay] = useState(null);
  const [draft, setDraft] = useState({ start_time: '06:00', end_time: '07:00' });
  const [draftError, setDraftError] = useState('');

  const [liveStatus, setLiveStatus] = useState(null);
  const [liveBusy, setLiveBusy] = useState(false);
  const [statusTag, setStatusTag] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const showToast = useToast();

  const today = new Date().getDay();

  const loadSchedule = useCallback(() => {
    api.getMySchedule().then((data) => setSlots(data.schedule)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSchedule();
    api.getMyStatus().then((data) => setLiveStatus(data.status)).catch(() => {});
    api.getLeaderboard().then((data) => setLeaderboard(data.leaderboard || [])).catch(() => {});
  }, [loadSchedule]);

  async function persist(newSlots) {
    setSaving(true);
    try {
      const payload = newSlots.map((s) => ({
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time
      }));
      const data = await api.saveMySchedule(payload);
      setSlots(data.schedule);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  function startAdding(day) {
    setDraftError('');
    setDraft({ start_time: '06:00', end_time: '07:00' });
    setAddingDay(day);
  }

  function addSlot(day) {
    if (draft.start_time >= draft.end_time) {
      setDraftError('Start time must be before end time');
      return;
    }
    const daySlots = slots.filter((s) => s.day_of_week === day);
    if (daySlots.length >= 2) {
      setDraftError('Max 2 slots per day');
      return;
    }
    const overlaps = daySlots.some((s) => draft.start_time < s.end_time && s.start_time < draft.end_time);
    if (overlaps) {
      setDraftError('Overlaps with an existing slot');
      return;
    }
    setDraftError('');
    const newSlots = [...slots, { day_of_week: day, ...draft }];
    setAddingDay(null);
    persist(newSlots);
  }

  function removeSlot(slotId) {
    const removed = slots.find((s) => s.id === slotId);
    const newSlots = slots.filter((s) => s.id !== slotId);
    setSlots(newSlots);
    persist(newSlots);
    showToast('Time slot removed', 'info', {
      onUndo: () => {
        const restored = [...newSlots, removed];
        setSlots(restored);
        persist(restored);
      }
    });
  }

  async function toggleLive() {
    setLiveBusy(true);
    try {
      if (liveStatus) {
        await api.checkOut();
        setLiveStatus(null);
        showToast('Checked out', 'info', {
          onUndo: async () => {
            try {
              const data = await api.checkIn();
              setLiveStatus(data);
            } catch (err) {
              showToast(err.message, 'error');
            }
          }
        });
      } else {
        const data = await api.checkIn(statusTag);
        setLiveStatus(data);
        setStatusTag('');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLiveBusy(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">My Schedule</h1>

      <LiveBanner liveStatus={liveStatus} liveBusy={liveBusy} statusTag={statusTag} setStatusTag={setStatusTag} onToggle={toggleLive} />

      {saving && <div className="saving-indicator">Saving…</div>}

      {loading ? <SkeletonList /> : (
        <div className="schedule-list card">
          {DAYS.map((label, dayIndex) => {
            const daySlots = slots.filter((s) => s.day_of_week === dayIndex);
            const isToday = dayIndex === today;
            return (
              <div key={dayIndex}>
                <div className={`sched-row ${isToday ? 'sched-row-today' : ''}`}>
                  <span className={`sched-day ${isToday ? 'sched-day-today' : ''}`}>
                    {label}
                    {isToday && <span className="sched-today-dot" />}
                  </span>
                  <div className="sched-slots">
                    {daySlots.map((s) => (
                      <span className={`sched-chip ${isToday ? 'sched-chip-today' : ''}`} key={s.id}>
                        {formatTime(s.start_time)}–{formatTime(s.end_time)}
                        <button
                          className="sched-chip-remove"
                          onClick={() => removeSlot(s.id)}
                          aria-label={`Remove ${DAYS_FULL[dayIndex]} ${formatTime(s.start_time)} slot`}
                        >×</button>
                      </span>
                    ))}
                    {daySlots.length === 0 && addingDay !== dayIndex && (
                      <span className="sched-empty">—</span>
                    )}
                  </div>
                  {addingDay !== dayIndex && daySlots.length < 2 && (
                    <button className="sched-add-btn" onClick={() => startAdding(dayIndex)} aria-label={`Add time slot on ${DAYS_FULL[dayIndex]}`}>+ add</button>
                  )}
                </div>

                {addingDay === dayIndex && (
                  <div className="sched-editor">
                    <div className="sched-editor-fields">
                      <div className="sched-editor-field">
                        <label className="sched-editor-label">From</label>
                        <input
                          type="time"
                          value={draft.start_time}
                          onChange={(e) => setDraft((d) => ({ ...d, start_time: e.target.value }))}
                          aria-label="Start time"
                        />
                      </div>
                      <div className="sched-editor-field">
                        <label className="sched-editor-label">To</label>
                        <input
                          type="time"
                          value={draft.end_time}
                          onChange={(e) => setDraft((d) => ({ ...d, end_time: e.target.value }))}
                          aria-label="End time"
                        />
                      </div>
                    </div>
                    {draftError && <div className="sched-editor-error">{draftError}</div>}
                    <div className="sched-editor-actions">
                      <button className="btn btn-primary btn-sm" onClick={() => addSlot(dayIndex)}>Add slot</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setAddingDay(null); setDraftError(''); }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {leaderboard.length > 0 && (
        <>
          <div className="section-title mt-md">
            This week's most consistent
            <span className="schedule-count">{leaderboard.length}</span>
          </div>
          <div className="card">
            {leaderboard.map((u, i) => (
              <div className="person-row" key={u.user_id}>
                <div className="leaderboard-rank">{i + 1}</div>
                <div className="person-avatar">{u.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}</div>
                <div className="person-info">
                  <div className="person-name">{u.name}</div>
                  {u.training_type && <div className="person-meta">{u.training_type}</div>}
                </div>
                <div className="leaderboard-count">{u.checkins} day{u.checkins !== 1 ? 's' : ''}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
