import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { useToast } from '../lib/ToastContext';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatTime(t) {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
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
  const showToast = useToast();

  const loadSchedule = useCallback(() => {
    api.getMySchedule().then((data) => setSlots(data.schedule)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSchedule();
    api.getMyStatus().then((data) => setLiveStatus(data.status)).catch(() => {});
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
        const data = await api.checkIn();
        setLiveStatus(data);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLiveBusy(false);
    }
  }

  if (loading) return <div className="spinner-text">Loading your schedule…</div>;

  return (
    <div>
      <div className="page-eyebrow">Your week</div>
      <h1 className="page-title">My Schedule</h1>
      <p className="page-sub">Set the days and times you usually train. Other members can find you by matching overlaps.</p>

      <div className={`live-banner ${liveStatus ? 'on' : 'off'}`}>
        <div className="live-banner-text">
          {liveStatus ? (
            <>
              <strong><span className="pulse-dot" />You're checked in</strong>
              <span>Visible on Live Now for the next 2 hours</span>
            </>
          ) : (
            <>
              <strong>Not checked in</strong>
              <span>Toggle this on when you arrive at the gym</span>
            </>
          )}
        </div>
        <button
          className={liveStatus ? 'btn btn-outline live-banner-action-on' : 'btn btn-primary'}
          onClick={toggleLive}
          disabled={liveBusy}
        >
          {liveStatus ? 'Check out' : "I'm here now"}
        </button>
      </div>

      <div className="flex-between mb-md">
        <div className="section-title no-margin">Weekly training schedule</div>
        {saving && <span className="spinner-text no-padding">Saving…</span>}
      </div>

      <div className="week-grid">
        {DAYS.map((label, dayIndex) => {
          const daySlots = slots.filter((s) => s.day_of_week === dayIndex);
          return (
            <div className="day-col" key={dayIndex}>
              <div className="day-col-head">{label}</div>
              <div className="day-col-body">
                {daySlots.map((s) => (
                  <div className="slot-chip" key={s.id}>
                    <span>{formatTime(s.start_time)}–{formatTime(s.end_time)}</span>
                    <button onClick={() => removeSlot(s.id)} aria-label="Remove slot">×</button>
                  </div>
                ))}

                {addingDay === dayIndex ? (
                  <div className="slot-editor">
                    <input
                      type="time"
                      value={draft.start_time}
                      onChange={(e) => setDraft((d) => ({ ...d, start_time: e.target.value }))}
                    />
                    <input
                      type="time"
                      value={draft.end_time}
                      onChange={(e) => setDraft((d) => ({ ...d, end_time: e.target.value }))}
                    />
                    {draftError && <div className="slot-editor-error">{draftError}</div>}
                    <div className="slot-editor-actions">
                      <button className="btn btn-primary btn-sm" onClick={() => addSlot(dayIndex)}>Add</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setAddingDay(null); setDraftError(''); }}>Cancel</button>
                    </div>
                  </div>
                ) : daySlots.length < 2 ? (
                  <button className="slot-add-btn" onClick={() => startAdding(dayIndex)}>+ Add time</button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
