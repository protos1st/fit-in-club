import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';
import { useToast } from '../lib/ToastContext';
import Avatar from '../components/Avatar';
import { confirmDialog } from '../components/ConfirmDialog';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

async function uploadToCloudinary(file) {
  const { signature, timestamp, folder, api_key } = await api.getUploadSignature();
  const fd = new FormData();
  fd.append('file', file);
  fd.append('signature', signature);
  fd.append('timestamp', timestamp);
  fd.append('folder', folder);
  fd.append('api_key', api_key);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: fd,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Upload failed');
  return data.secure_url;
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
  const [uploading, setUploading] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const fileInputRef = useRef();

  useEffect(() => {
    api.getLeaderboard().then((data) => setLeaderboard(data.leaderboard || [])).catch(() => {});
  }, []);

  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  function toggleTheme() {
    const next = !dark;
    setDark(next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Photo must be under 5MB', 'error'); return; }
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      const data = await api.updateProfile({ ...form, avatarUrl: url });
      setUser(data.user);
      showToast('Photo updated', 'success');
    } catch (err) {
      showToast('Photo upload failed', 'error');
    } finally {
      setUploading(false);
    }
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
      <div className="profile-header-card">
        <div className="avatar-upload-wrap" onClick={() => fileInputRef.current?.click()}>
          <Avatar name={user?.name || 'U'} photo={user?.avatar_url || null} size={56} />
          <div className="avatar-upload-overlay">{uploading ? '…' : '📷'}</div>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
        </div>
        <div className="profile-header-info">
          <h1 className="profile-header-name">{user?.name}</h1>
          <div className="profile-header-email">{user?.email}</div>
          <div className="profile-header-stats">
            <div>
              <span className="profile-header-stat-val">{leaderboard.find(u => u.user_id === user?.id)?.checkins || 0}</span>
              <span className="profile-header-stat-label">Check-ins</span>
            </div>
            <div>
              <span className="profile-header-stat-val">{user?.training_type || '—'}</span>
              <span className="profile-header-stat-label">Training</span>
            </div>
          </div>
        </div>
      </div>

      <div className="section-title">Edit profile</div>
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
              className="profile-bio-input"
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
                <Avatar name={u.name} size={36} />
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
        <div className="profile-setting profile-setting-link" onClick={() => navigate('/blocked')}>
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
        <div className="profile-setting profile-setting-danger">
          <div>
            <div className="profile-setting-title profile-setting-danger-title">Delete account</div>
            <div className="profile-setting-desc">Permanently delete your account and all data</div>
          </div>
          <button className="btn btn-danger-outline btn-sm" onClick={async () => {
            if (!(await confirmDialog({ title: 'Delete your account?', message: 'This will permanently delete your account, messages, connections, and all data. This cannot be undone.', confirmLabel: 'Delete my account', danger: true }))) return;
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
