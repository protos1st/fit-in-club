import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { api, setToken } from '../lib/api';
import { useToast } from '../lib/ToastContext';
import Avatar from '../components/Avatar';
import { confirmDialog } from '../components/ConfirmDialog';
import Portal from '../components/Portal';
import { TRAINING_OPTIONS } from './OnboardingPage';

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
    trainingType: user?.training_type ? user.training_type.split(', ').filter(Boolean) : [],
    bio: user?.bio || '',
    gender: user?.gender || ''
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null); // optimistic local preview
  const [photoSheet, setPhotoSheet] = useState(false);
  const [photoViewer, setPhotoViewer] = useState(false);
  const [trainingOpen, setTrainingOpen] = useState(false);
  const [showTrainingList, setShowTrainingList] = useState(false);
  const trainingRef = useRef();
  const [leaderboard, setLeaderboard] = useState([]);
  const fileInputRef = useRef();

  useEffect(() => {
    api.getLeaderboard().then((d) => setLeaderboard(d.leaderboard || [])).catch(() => {});
  }, []);

  const [pwSheet, setPwSheet] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError('');
    if (pwForm.next.length < 8) { setPwError('New password must be at least 8 characters'); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError('New passwords do not match'); return; }
    setPwSaving(true);
    try {
      const data = await api.changePassword(pwForm.current, pwForm.next);
      setToken(data.token);
      showToast('Password updated', 'success');
      setPwSheet(false);
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwSaving(false);
    }
  }

  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  function toggleTheme() {
    const next = !dark;
    setDark(next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
  }

  useEffect(() => {
    function handleClick(e) {
      if (trainingRef.current && !trainingRef.current.contains(e.target)) setTrainingOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Photo must be under 5MB', 'error'); return; }

    // Optimistic preview
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      const data = await api.updateProfile({ name: form.name, trainingType: form.trainingType.join(', '), bio: form.bio, gender: form.gender, avatarUrl: url });
      setUser(data.user);
      setPreview(null);
      showToast('Photo updated', 'success');
    } catch (err) {
      setPreview(null);
      showToast(err.message || 'Photo upload failed', 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleRemovePhoto() {
    setPhotoSheet(false);
    const ok = await confirmDialog({ title: 'Remove photo?', message: 'Your profile will show initials instead.', confirmLabel: 'Remove', danger: true });
    if (!ok) return;
    try {
      const data = await api.updateProfile({ name: form.name, trainingType: form.trainingType.join(', '), bio: form.bio, gender: form.gender, avatarUrl: '' });
      setUser(data.user);
      showToast('Photo removed', 'success');
    } catch (err) {
      showToast('Failed to remove photo', 'error');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await api.updateProfile({ ...form, trainingType: form.trainingType.join(', ') });
      setUser(data.user);
      showToast('Profile saved', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  const displayPhoto = preview || user?.avatar_url || null;
  const checkins = leaderboard.find(u => u.user_id === user?.id)?.checkins || 0;
  const trainingTypesList = user?.training_type ? user.training_type.split(',').map(t => t.trim()).filter(Boolean) : [];
  const trainingStatLabel = trainingTypesList.length === 0
    ? '—'
    : trainingTypesList.length === 1
    ? trainingTypesList[0]
    : `${trainingTypesList[0]} +${trainingTypesList.length - 1}`;

  return (
    <div>
      {/* Instagram-style header */}
      <div className="ig-profile-header">
        <div className="ig-avatar-wrap">
          <div onClick={() => displayPhoto ? setPhotoViewer(true) : setPhotoSheet(true)} style={{ cursor: 'pointer' }}>
            <Avatar name={user?.name || 'U'} photo={displayPhoto} size={88} />
          </div>
          {uploading ? (
            <div className="ig-avatar-spinner"><div className="spinner-ring" /></div>
          ) : (
            <div className="ig-avatar-badge" onClick={() => setPhotoSheet(true)} style={{ cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M12 15.2A3.2 3.2 0 1 0 12 8.8a3.2 3.2 0 0 0 0 6.4z"/>
                <path d="M9 3L7.17 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.17L15 3H9zm3 15a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/>
              </svg>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelected} />
        </div>

        <div className="ig-profile-meta">
          <div className="ig-profile-name">{user?.name}</div>
          <div className="ig-profile-email">{user?.email}</div>
          <div className="ig-profile-stats">
            <div className="ig-stat">
              <span className="ig-stat-val">{checkins}</span>
              <span className="ig-stat-label">Check-ins</span>
            </div>
            <div className="ig-stat-divider" />
            <div className="ig-stat ig-stat-clickable" onClick={() => trainingTypesList.length > 0 && setShowTrainingList(true)}>
              <span className="ig-stat-val">{trainingStatLabel}</span>
              <span className="ig-stat-label">Training</span>
            </div>
            <div className="ig-stat-divider" />
            <div className="ig-stat">
              <span className="ig-stat-val">{user?.gender || '—'}</span>
              <span className="ig-stat-label">Gender</span>
            </div>
          </div>
          {user?.bio && <div className="ig-profile-bio">{user.bio}</div>}
        </div>
      </div>

      {/* Training types modal */}
      {showTrainingList && (
        <Portal>
          <div className="modal-backdrop" onClick={() => setShowTrainingList(false)}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">Training types</div>
                <button className="modal-close" onClick={() => setShowTrainingList(false)} aria-label="Close">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div className="req-profile-training" style={{ justifyContent: 'flex-start' }}>
                {trainingTypesList.map(t => <span key={t} className="tag">{t}</span>)}
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Photo viewer */}
      {photoViewer && displayPhoto && (
        <Portal>
          <div className="photo-viewer-backdrop" onClick={() => setPhotoViewer(false)}>
            <img src={displayPhoto} alt={user?.name} className="photo-viewer-img" onClick={e => e.stopPropagation()} />
            <button className="photo-viewer-close" onClick={() => setPhotoViewer(false)} aria-label="Close">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </Portal>
      )}

      {/* Photo action sheet */}
      {photoSheet && (
        <Portal>
          <div className="sheet-backdrop" onClick={() => setPhotoSheet(false)} />
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="sheet-title">Profile photo</div>
            <button className="sheet-action" onClick={() => { setPhotoSheet(false); fileInputRef.current?.click(); }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              Upload photo
            </button>
            {displayPhoto && (
              <button className="sheet-action sheet-action-danger" onClick={handleRemovePhoto}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                Remove photo
              </button>
            )}
            <button className="sheet-action sheet-action-cancel" onClick={() => setPhotoSheet(false)}>Cancel</button>
          </div>
        </Portal>
      )}

      {/* Change password modal */}
      {pwSheet && (
        <Portal>
          <div className="modal-backdrop" onClick={() => setPwSheet(false)}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">Change password</div>
                <button className="modal-close" onClick={() => setPwSheet(false)} aria-label="Close">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <form onSubmit={handleChangePassword}>
                {pwError && <div className="form-error">{pwError}</div>}
                <div className="field">
                  <label>Current password</label>
                  <input type="password" value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} autoComplete="current-password" autoFocus maxLength={128} />
                </div>
                <div className="field">
                  <label>New password</label>
                  <input type="password" value={pwForm.next} onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))} placeholder="At least 8 characters" autoComplete="new-password" maxLength={128} />
                </div>
                <div className="field">
                  <label>Confirm new password</label>
                  <input type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} placeholder="Same password again" autoComplete="new-password" maxLength={128} />
                </div>
                <button type="submit" className="btn btn-primary btn-block" disabled={pwSaving || !pwForm.current || !pwForm.next || !pwForm.confirm}>
                  {pwSaving ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </div>
          </div>
        </Portal>
      )}

      <div className="section-title">Edit profile</div>
      <div className="card card-narrow">
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Full name</label>
            <input type="text" value={form.name} onChange={(e) => update('name', e.target.value)} required maxLength={100} />
          </div>
          <div className="field">
            <label>Gender</label>
            <select value={form.gender} onChange={(e) => update('gender', e.target.value)}>
              <option value="">Not set</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>
          <div className="field">
            <label>What do you train?</label>
            <div className="training-dropdown" ref={trainingRef}>
              <button type="button" className={`training-dropdown-trigger${trainingOpen ? ' open' : ''}`} onClick={() => setTrainingOpen(o => !o)}>
                <span>{form.trainingType.length === 0 ? 'Select training types' : `${form.trainingType.length} selected`}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {trainingOpen && (
                <div className="training-dropdown-menu">
                  <div className="training-check-list">
                    {TRAINING_OPTIONS.map(opt => (
                      <label key={opt} className="training-check-row">
                        <input
                          type="checkbox"
                          checked={form.trainingType.includes(opt)}
                          onChange={() => update('trainingType', form.trainingType.includes(opt) ? form.trainingType.filter(x => x !== opt) : [...form.trainingType, opt])}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="field">
            <label>Bio</label>
            <textarea value={form.bio} onChange={(e) => update('bio', e.target.value)} placeholder="A short intro about yourself" rows={3} className="profile-bio-input" maxLength={500} />
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


      <div className="section-title mt-md">Others</div>
      <div className="card card-narrow">
        <div className="profile-setting profile-setting-link" onClick={() => navigate('/blocked')}>
          <div>
            <div className="profile-setting-title">Blocked users</div>
            <div className="profile-setting-desc">Manage blocked members</div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-hint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
        <div className="profile-setting profile-setting-link" onClick={() => navigate('/passed')}>
          <div>
            <div className="profile-setting-title">Passed profiles</div>
            <div className="profile-setting-desc">Bring back people you passed on</div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-hint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>

      <div className="section-title mt-md">Account</div>
      <div className="card card-narrow">
        <div className="profile-setting profile-setting-link" onClick={() => setPwSheet(true)}>
          <div>
            <div className="profile-setting-title">Change password</div>
            <div className="profile-setting-desc">Update your login password</div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-hint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
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
            try { await api.deleteAccount(); logout(); } catch (err) { showToast(err.message, 'error'); }
          }}>Delete</button>
        </div>
      </div>
    </div>
  );
}
