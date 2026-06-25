import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';
import { useToast } from '../lib/ToastContext';

function initials(name) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

export default function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  const showToast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: user?.name || '',
    trainingType: user?.training_type || '',
    bio: user?.bio || '',
    gender: user?.gender || ''
  });
  const [saving, setSaving] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    api.getLeaderboard().then((data) => setLeaderboard(data.leaderboard || [])).catch(() => {});
  }, []);

  const dark = localStorage.getItem('theme') === 'dark';
  function toggleTheme() {
    const next = dark ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', next);
    window.location.reload();
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await api.updateProfile(form);
      setUser(data.user);
      showToast('Profile updated', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-eyebrow">Account</div>
      <h1 className="page-title">Profile</h1>
      <p className="page-sub">Update your name, training style, and bio visible to other members.</p>

      <div className="card card-narrow">
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Full name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              required
              maxLength={100}
            />
          </div>
          <div className="field">
            <label>Gender</label>
            <select
              value={form.gender}
              onChange={(e) => update('gender', e.target.value)}
            >
              <option value="">Not set</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>
          <div className="field">
            <label>What do you train?</label>
            <input
              type="text"
              value={form.trainingType}
              onChange={(e) => update('trainingType', e.target.value)}
              placeholder="e.g. Powerlifting, Yoga, Running"
              maxLength={100}
            />
          </div>
          <div className="field">
            <label>Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => update('bio', e.target.value)}
              placeholder="A short intro about yourself"
              rows={3}
              style={{ resize: 'vertical' }}
              maxLength={500}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>

      <div className="section-title mt-md">Preferences</div>
      <div className="card card-narrow">
        <div className="profile-setting">
          <div>
            <div className="profile-setting-title">Dark mode</div>
            <div className="profile-setting-desc">{dark ? 'Currently on' : 'Currently off'}</div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={toggleTheme}>
            {dark ? 'Switch to light' : 'Switch to dark'}
          </button>
        </div>
      </div>

      {leaderboard.length > 0 && (
        <>
          <div className="section-title mt-md">
            This week's most consistent
            <span className="schedule-count">{leaderboard.length}</span>
          </div>
          <div className="card card-narrow">
            {leaderboard.map((u, i) => (
              <div className="person-row" key={u.user_id}>
                <div className="leaderboard-rank">{i + 1}</div>
                <div className="person-avatar">{initials(u.name)}</div>
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

      <div className="section-title mt-md">Others</div>
      <div className="card card-narrow">
        <div className="profile-setting" onClick={() => navigate('/blocked')} style={{ cursor: 'pointer' }}>
          <div>
            <div className="profile-setting-title">Blocked users</div>
            <div className="profile-setting-desc">Manage blocked members</div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-hint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>

      <div className="section-title mt-md">Account</div>
      <div className="card card-narrow">
        <div className="profile-setting">
          <div>
            <div className="profile-setting-title">Log out</div>
            <div className="profile-setting-desc">{user?.email}</div>
          </div>
          <button className="btn btn-danger-outline btn-sm" onClick={logout}>Log out</button>
        </div>
        <div className="profile-setting" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--color-line)' }}>
          <div>
            <div className="profile-setting-title" style={{ color: 'var(--color-danger)' }}>Delete account</div>
            <div className="profile-setting-desc">Permanently delete your account and all data</div>
          </div>
          <button className="btn btn-danger-outline btn-sm" onClick={async () => {
            if (!confirm('Are you sure? This will permanently delete your account, messages, connections, and all data. This cannot be undone.')) return;
            if (!confirm('Really delete? Type OK to confirm.')) return;
            try {
              await api.deleteAccount();
              logout();
            } catch (err) {
              showToast(err.message, 'error');
            }
          }}>Delete</button>
        </div>
      </div>
    </div>
  );
}
