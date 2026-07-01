import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useToast } from '../lib/ToastContext';
import { formatTime, initials } from '../lib/utils';
import Avatar from '../components/Avatar';
import Portal from '../components/Portal';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TEMPLATES = [
  { label: 'Weekdays', days: [1, 2, 3, 4, 5] },
  { label: 'Mon / Wed / Fri', days: [1, 3, 5] },
  { label: 'Tue / Thu / Sat', days: [2, 4, 6] },
  { label: 'Every day', days: [0, 1, 2, 3, 4, 5, 6] },
];

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

function LiveBanner({ liveStatus, liveBusy, statusTag, setStatusTag, onToggle, onExtend, todayMatches }) {
  const expiresAt = liveStatus?.expires_at;
  const timeLeft = expiresAt ? Math.max(0, Math.round((new Date(expiresAt) - Date.now()) / 60000)) : 0;
  const showExtendPrompt = liveStatus && timeLeft <= 10 && timeLeft > 0;

  return (
    <div className={`live-banner ${liveStatus ? 'on' : 'off'}`}>
      <div className="live-banner-top">
        <div className="live-banner-text">
          {liveStatus ? (
            <>
              <strong><span className="pulse-dot" />You're at the gym</strong>
              <span>{timeLeft > 0 ? `Visible for ${timeLeft} more min` : 'Expiring soon'}</span>
              {liveStatus.status_tag && <span className="tag tag-sm tag-spaced">{liveStatus.status_tag}</span>}
              {todayMatches > 0 && (
                <span className="sched-match-hint">{todayMatches} buddy match{todayMatches !== 1 ? 'es' : ''} today</span>
              )}
              {showExtendPrompt && (
                <div className="sched-extend-prompt">
                  <span>Still training?</span>
                  <button className="btn btn-primary btn-sm rounded-pill" onClick={onExtend}>Extend 1 hr</button>
                </div>
              )}
            </>
          ) : (
            <>
              <strong>Not checked in</strong>
              <span>Let others know you're at the gym</span>
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
      {!liveStatus && (
        <div className="status-tag-picker">
          {STATUS_TAGS.map((t) => (
            <button key={t} className={`filter-pill ${statusTag === t ? 'filter-pill-active' : ''}`} onClick={() => setStatusTag(statusTag === t ? '' : t)}>{t}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MySchedulePage() {
  const [slots, setSlots] = useState([]);
  const [loadError, setLoadError] = useState(false);
  const [waking, setWaking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingDay, setAddingDay] = useState(null);
  const [editingSlot, setEditingSlot] = useState(null);
  const [draft, setDraft] = useState({ start_time: '06:00', end_time: '07:00' });
  const [draftError, setDraftError] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [customDays, setCustomDays] = useState([]);
  const [customTime, setCustomTime] = useState({ start_time: '06:00', end_time: '07:00' });

  const [liveStatus, setLiveStatus] = useState(null);
  const [liveBusy, setLiveBusy] = useState(false);
  const [statusTag, setStatusTag] = useState('');
  const [todayMatches, setTodayMatches] = useState(0);
  const [dayBuddies, setDayBuddies] = useState({});
  const showToast = useToast();
  const navigate = useNavigate();
  const timerRef = useRef(null);

  const today = new Date().getDay();

  const loadSchedule = useCallback((attempt = 0) => {
    if (attempt === 0) { setLoadError(false); setWaking(false); setLoading(true); }
    api.getMySchedule()
      .then((data) => { setSlots(data.schedule); setWaking(false); setLoading(false); })
      .catch(() => {
        if (attempt < 10) {
          setLoading(false);
          setWaking(true);
          setTimeout(() => loadSchedule(attempt + 1), 5000);
        } else {
          setWaking(false);
          setLoadError(true);
          setLoading(false);
        }
      });
  }, []);

  useEffect(() => {
    loadSchedule();
    api.getMyStatus().then((data) => setLiveStatus(data.status)).catch(() => {});
    api.getTodayMatches().then((data) => setTodayMatches(data.count)).catch(() => {});
    api.getDayBuddies().then((data) => setDayBuddies(data.buddies || {})).catch(() => {});
  }, [loadSchedule]);

  useEffect(() => {
    if (liveStatus) {
      timerRef.current = setInterval(() => {
        const left = Math.max(0, Math.round((new Date(liveStatus.expires_at) - Date.now()) / 60000));
        if (left <= 0) {
          setLiveStatus(null);
          clearInterval(timerRef.current);
        } else {
          setLiveStatus(s => ({ ...s }));
        }
      }, 30000);
      return () => clearInterval(timerRef.current);
    }
  }, [liveStatus?.expires_at]);

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
      api.getDayBuddies().then((d) => setDayBuddies(d.buddies || {})).catch(() => {});
      api.getTodayMatches().then((d) => setTodayMatches(d.count)).catch(() => {});
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  function startAdding(day) {
    setEditingSlot(null);
    setDraftError('');
    setDraft({ start_time: '06:00', end_time: '07:00' });
    setAddingDay(day);
  }

  function startEditing(slot) {
    setAddingDay(null);
    setDraftError('');
    setDraft({ start_time: slot.start_time, end_time: slot.end_time });
    setEditingSlot(slot.id);
  }

  function addSlot(day) {
    if (draft.start_time >= draft.end_time) { setDraftError('Start time must be before end time'); return; }
    const daySlots = slots.filter((s) => s.day_of_week === day);
    if (daySlots.length >= 2) { setDraftError('Max 2 slots per day'); return; }
    const overlaps = daySlots.some((s) => draft.start_time < s.end_time && s.start_time < draft.end_time);
    if (overlaps) { setDraftError('Overlaps with an existing slot'); return; }
    setDraftError('');
    const newSlots = [...slots, { day_of_week: day, ...draft }];
    setAddingDay(null);
    persist(newSlots);
  }

  function saveEdit(slotId) {
    if (draft.start_time >= draft.end_time) { setDraftError('Start time must be before end time'); return; }
    const slot = slots.find(s => s.id === slotId);
    const daySlots = slots.filter(s => s.day_of_week === slot.day_of_week && s.id !== slotId);
    const overlaps = daySlots.some(s => draft.start_time < s.end_time && s.start_time < draft.end_time);
    if (overlaps) { setDraftError('Overlaps with an existing slot'); return; }
    setDraftError('');
    const newSlots = slots.map(s => s.id === slotId ? { ...s, start_time: draft.start_time, end_time: draft.end_time } : s);
    setEditingSlot(null);
    persist(newSlots);
  }

  function removeSlot(slotId) {
    const removed = slots.find((s) => s.id === slotId);
    const newSlots = slots.filter((s) => s.id !== slotId);
    setSlots(newSlots);
    persist(newSlots);
    showToast('Time slot removed', 'info', {
      onUndo: () => { persist([...newSlots, removed]); }
    });
  }

  function applyTemplate(template) {
    const newSlots = template.days.map(d => ({ day_of_week: d, start_time: '06:00', end_time: '07:00' }));
    persist(newSlots);
    setShowTemplates(false);
    showToast(`Applied "${template.label}" template`, 'success');
  }

  function toggleCustomDay(d) {
    setCustomDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  }

  function applyCustom() {
    if (customDays.length === 0) return;
    if (customTime.start_time >= customTime.end_time) { showToast('Start time must be before end time', 'error'); return; }
    const newSlots = customDays.map(d => ({ day_of_week: d, start_time: customTime.start_time, end_time: customTime.end_time }));
    persist(newSlots);
    setShowTemplates(false);
    setCustomDays([]);
    showToast('Custom schedule applied', 'success');
  }

  async function toggleLive() {
    setLiveBusy(true);
    try {
      if (liveStatus) {
        await api.checkOut();
        setLiveStatus(null);
        showToast('Checked out', 'info', {
          onUndo: async () => {
            try { const data = await api.checkIn(); setLiveStatus(data); } catch (err) { showToast(err.message, 'error'); }
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

  async function handleExtend() {
    try {
      const data = await api.extendCheckIn();
      setLiveStatus(s => ({ ...s, expires_at: data.expires_at }));
      showToast('Extended by 1 hour', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  const hasSlots = slots.length > 0;

  return (
    <div>
      <h1 className="page-title">My Schedule</h1>

      {!loading && hasSlots && (
        <LiveBanner
          liveStatus={liveStatus} liveBusy={liveBusy} statusTag={statusTag}
          setStatusTag={setStatusTag} onToggle={toggleLive} onExtend={handleExtend}
          todayMatches={todayMatches}
        />
      )}

      {saving && <div className="saving-indicator">Saving…</div>}

      {waking && (
        <div className="sched-template-cta">
          <p className="sched-template-text">Server is starting up, hang tight…</p>
        </div>
      )}

      {!loading && !waking && loadError && (
        <div className="sched-template-cta">
          <p className="sched-template-text">Couldn't load your schedule. Check your connection and try again.</p>
          <button className="btn btn-primary rounded-pill" onClick={loadSchedule}>Retry</button>
        </div>
      )}

      {!loading && !loadError && !hasSlots && (
        <div className="sched-template-cta">
          <p className="sched-template-text">Set up your weekly gym schedule to find buddies with matching times.</p>
          <button className="btn btn-primary rounded-pill" onClick={() => setShowTemplates(true)}>
            Get started
          </button>
        </div>
      )}

      {!loading && hasSlots && (
        <div className="sched-toolbar">
          <button className="sched-template-btn" onClick={() => setShowTemplates(!showTemplates)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            Templates
          </button>
        </div>
      )}

      {showTemplates && (
        <Portal>
          <div className="sheet-backdrop" onClick={() => setShowTemplates(false)} />
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="sheet-title">Templates</div>
            <div style={{ padding: '0 20px 20px' }}>
              <p className="sched-templates-sub">Replace your schedule with a preset. Adjust times after.</p>
              <div className="sched-templates-grid">
                {TEMPLATES.map(t => (
                  <button key={t.label} className="sched-templates-item" onClick={() => applyTemplate(t)}>
                    <span className="sched-templates-name">{t.label}</span>
                    <span className="sched-templates-days">{t.days.map(d => DAYS[d]).join(', ')}</span>
                  </button>
                ))}
              </div>
              <div className="sched-custom-divider">or pick your own</div>
              <div className="sched-custom">
                <div className="sched-custom-days">
                  {DAYS.map((d, i) => (
                    <button key={i} className={`sched-custom-day ${customDays.includes(i) ? 'active' : ''}`} onClick={() => toggleCustomDay(i)}>{d}</button>
                  ))}
                </div>
                <div className="sched-custom-time">
                  <div className="sched-editor-field">
                    <label className="sched-editor-label">From</label>
                    <input type="time" value={customTime.start_time} onChange={e => setCustomTime(t => ({ ...t, start_time: e.target.value }))} />
                  </div>
                  <div className="sched-editor-field">
                    <label className="sched-editor-label">To</label>
                    <input type="time" value={customTime.end_time} onChange={e => setCustomTime(t => ({ ...t, end_time: e.target.value }))} />
                  </div>
                </div>
                <button className="btn btn-primary btn-sm rounded-pill mt-sm" onClick={applyCustom} disabled={customDays.length === 0}>
                  Apply to {customDays.length > 0 ? customDays.map(d => DAYS[d]).join(', ') : '...'}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {loading ? <SkeletonList /> : (loadError || waking) ? null : (
        <div className="schedule-list card">
          {DAYS.map((label, dayIndex) => {
            const daySlots = slots.filter((s) => s.day_of_week === dayIndex);
            const isToday = dayIndex === today;
            const buddies = dayBuddies[dayIndex] || [];
            return (
              <div key={dayIndex}>
                <div className={`sched-row ${isToday ? 'sched-row-today' : ''}`}>
                  <span className={`sched-day ${isToday ? 'sched-day-today' : ''}`}>
                    {label}
                    {isToday && <span className="sched-today-dot" />}
                  </span>
                  <div className="sched-slots">
                    {daySlots.map((s) => (
                      editingSlot === s.id ? null : (
                        <span className={`sched-chip ${isToday ? 'sched-chip-today' : ''}`} key={s.id} onClick={() => startEditing(s)} title="Tap to edit">
                          {formatTime(s.start_time)}–{formatTime(s.end_time)}
                          <button
                            className="sched-chip-remove"
                            onClick={(e) => { e.stopPropagation(); removeSlot(s.id); }}
                            aria-label={`Remove ${DAYS_FULL[dayIndex]} ${formatTime(s.start_time)} slot`}
                          >×</button>
                        </span>
                      )
                    ))}
                    {daySlots.length === 0 && addingDay !== dayIndex && (
                      <span className="sched-empty">—</span>
                    )}
                    {buddies.length > 0 && !addingDay && !editingSlot && (
                      <div className="sched-buddies">
                        {buddies.slice(0, 3).map(b => (
                          <div key={b.user_id} className="sched-buddy-avatar-wrap" title={b.name} onClick={() => navigate('/discover')}>
                            <Avatar name={b.name} size={24} />
                          </div>
                        ))}
                        {buddies.length > 3 && <span className="sched-buddy-more">+{buddies.length - 3}</span>}
                      </div>
                    )}
                  </div>
                  {addingDay !== dayIndex && editingSlot === null && daySlots.length < 2 && (
                    <button className="sched-add-btn" onClick={() => startAdding(dayIndex)} aria-label={`Add time slot on ${DAYS_FULL[dayIndex]}`}>+ add</button>
                  )}
                </div>

                {editingSlot && daySlots.some(s => s.id === editingSlot) && (
                  <div className="sched-editor">
                    <div className="sched-editor-fields">
                      <div className="sched-editor-field">
                        <label className="sched-editor-label">From</label>
                        <input type="time" value={draft.start_time} onChange={(e) => setDraft(d => ({ ...d, start_time: e.target.value }))} aria-label="Start time" />
                      </div>
                      <div className="sched-editor-field">
                        <label className="sched-editor-label">To</label>
                        <input type="time" value={draft.end_time} onChange={(e) => setDraft(d => ({ ...d, end_time: e.target.value }))} aria-label="End time" />
                      </div>
                    </div>
                    {draftError && <div className="sched-editor-error">{draftError}</div>}
                    <div className="sched-editor-actions">
                      <button className="btn btn-primary btn-sm" onClick={() => saveEdit(editingSlot)}>Save</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditingSlot(null); setDraftError(''); }}>Cancel</button>
                    </div>
                  </div>
                )}

                {addingDay === dayIndex && (
                  <div className="sched-editor">
                    <div className="sched-editor-fields">
                      <div className="sched-editor-field">
                        <label className="sched-editor-label">From</label>
                        <input type="time" value={draft.start_time} onChange={(e) => setDraft(d => ({ ...d, start_time: e.target.value }))} aria-label="Start time" />
                      </div>
                      <div className="sched-editor-field">
                        <label className="sched-editor-label">To</label>
                        <input type="time" value={draft.end_time} onChange={(e) => setDraft(d => ({ ...d, end_time: e.target.value }))} aria-label="End time" />
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
    </div>
  );
}
