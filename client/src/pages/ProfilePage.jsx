import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';
import { useToast } from '../lib/ToastContext';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const showToast = useToast();
  const [form, setForm] = useState({
    name: user?.name || '',
    trainingType: user?.training_type || '',
    bio: user?.bio || ''
  });
  const [saving, setSaving] = useState(false);

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
            />
          </div>
          <div className="field">
            <label>What do you train?</label>
            <input
              type="text"
              value={form.trainingType}
              onChange={(e) => update('trainingType', e.target.value)}
              placeholder="e.g. Powerlifting, Yoga, Running"
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
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
