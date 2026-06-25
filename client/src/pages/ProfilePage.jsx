import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';
import { useToast } from '../lib/ToastContext';

export default function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  const showToast = useToast();
  const [form, setForm] = useState({
    name: user?.name || '',
    trainingType: user?.training_type || '',
    bio: user?.bio || ''
  });
  const [saving, setSaving] = useState(false);

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

      <div className="card" style={{ maxWidth: 480 }}>
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
      <div className="card" style={{ maxWidth: 480 }}>
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

      <div className="section-title mt-md">Account</div>
      <div className="card" style={{ maxWidth: 480 }}>
        <div className="profile-setting">
          <div>
            <div className="profile-setting-title">Log out</div>
            <div className="profile-setting-desc">{user?.email}</div>
          </div>
          <button className="btn btn-danger-outline btn-sm" onClick={logout}>Log out</button>
        </div>
      </div>
    </div>
  );
}
