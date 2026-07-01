import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';
import { useToast } from '../lib/ToastContext';
import Avatar from '../components/Avatar';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

async function uploadToCloudinary(file) {
  const { signature, timestamp, folder, api_key } = await api.getUploadSignature();
  const fd = new FormData();
  fd.append('file', file);
  fd.append('signature', signature);
  fd.append('timestamp', timestamp);
  fd.append('folder', folder);
  fd.append('api_key', api_key);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Upload failed');
  return data.secure_url;
}

const STEPS = [
  { key: 'gender', title: 'About you', subtitle: 'This helps others find the right training partner' },
  { key: 'workoutFrequency', title: 'Workout frequency', subtitle: 'How often do you train per week?' },
  { key: 'trainingType', title: 'Training style', subtitle: 'Pick all that apply' },
  { key: 'photo', title: 'Profile photo', subtitle: 'Add a photo so people know who you are' },
];

const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say'];
const FREQUENCY_OPTIONS = ['1–2 times', '3–4 times', '5–6 times', 'Every day'];

export const TRAINING_OPTIONS = [
  'Strength training',
  'Bodybuilding',
  'Powerlifting',
  'CrossFit',
  'Calisthenics',
  'Cardio / Running',
  'Cycling',
  'Yoga',
  'Pilates',
  'HIIT',
  'Martial arts',
  'Sports',
  'Other',
];

export default function OnboardingPage() {
  const { user, setUser } = useAuth();
  const showToast = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ gender: '', workoutFrequency: '', trainingType: [] });
  const [submitting, setSubmitting] = useState(false);
  const [trainingOpen, setTrainingOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const trainingRef = useRef();
  const fileInputRef = useRef();

  useEffect(() => {
    function handleClick(e) {
      if (trainingRef.current && !trainingRef.current.contains(e.target)) setTrainingOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const canProceed = current.key === 'trainingType' || current.key === 'photo' || form[current.key];

  function select(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleTraining(opt) {
    setForm(f => {
      const cur = f.trainingType;
      return { ...f, trainingType: cur.includes(opt) ? cur.filter(x => x !== opt) : [...cur, opt] };
    });
  }

  async function handlePhotoSelect(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Photo must be under 5MB', 'error'); return; }
    setPhotoPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setAvatarUrl(url);
    } catch (err) {
      showToast(err.message || 'Upload failed', 'error');
      setPhotoPreview(null);
    } finally {
      setUploading(false);
    }
  }

  async function handleNext() {
    if (isLast) {
      setSubmitting(true);
      try {
        const payload = { ...form, trainingType: form.trainingType.join(', '), avatarUrl };
        const data = await api.completeOnboarding(payload);
        setUser(data.user);
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setSubmitting(false);
      }
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <div className="onboarding-screen">
      <div className="onboarding-card">
        <div className="onboarding-progress">
          {STEPS.map((_, i) => (
            <div key={i} className={`onboarding-dot ${i <= step ? 'active' : ''}`} />
          ))}
        </div>

        <h2 className="onboarding-title">{current.title}</h2>
        <p className="onboarding-subtitle">{current.subtitle}</p>

        <div className="onboarding-options">
          {current.key === 'gender' && GENDER_OPTIONS.map((opt) => (
            <button key={opt} className={`onboarding-option ${form.gender === opt ? 'selected' : ''}`} onClick={() => select('gender', opt)}>
              {opt}
            </button>
          ))}

          {current.key === 'workoutFrequency' && FREQUENCY_OPTIONS.map((opt) => (
            <button key={opt} className={`onboarding-option ${form.workoutFrequency === opt ? 'selected' : ''}`} onClick={() => select('workoutFrequency', opt)}>
              {opt}
            </button>
          ))}

          {current.key === 'trainingType' && (
            <div className="training-dropdown" ref={trainingRef}>
              <button type="button" className={`training-dropdown-trigger${trainingOpen ? ' open' : ''}`} onClick={() => setTrainingOpen(o => !o)}>
                <span>{form.trainingType.length === 0 ? 'Select training types' : `${form.trainingType.length} selected`}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {trainingOpen && (
                <div className="training-dropdown-menu">
                  <div className="training-check-list">
                    {TRAINING_OPTIONS.map((opt) => (
                      <label key={opt} className="training-check-row">
                        <input type="checkbox" checked={form.trainingType.includes(opt)} onChange={() => toggleTraining(opt)} />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {current.key === 'photo' && (
            <div className="onboarding-photo-step">
              <div className="onboarding-photo-wrap" onClick={() => fileInputRef.current?.click()}>
                <Avatar name={user?.name || 'U'} photo={photoPreview} size={100} />
                {uploading ? (
                  <div className="onboarding-photo-overlay"><div className="spinner-ring" /></div>
                ) : (
                  <div className="onboarding-photo-overlay">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  </div>
                )}
              </div>
              <p className="onboarding-photo-hint">
                {photoPreview ? (uploading ? 'Uploading…' : 'Looking good! Tap to change.') : 'Tap to choose a photo'}
              </p>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoSelect} />
            </div>
          )}
        </div>

        {current.key === 'trainingType' && form.trainingType.length > 0 && (
          <p className="training-pill-count">{form.trainingType.length} selected</p>
        )}

        <div className="onboarding-actions">
          {step > 0 && (
            <button className="btn btn-ghost" onClick={() => setStep((s) => s - 1)}>Back</button>
          )}
          <button className="btn btn-primary ml-auto" onClick={handleNext} disabled={!canProceed || submitting || uploading}>
            {submitting ? 'Saving…' : isLast ? 'Get started' : 'Next'}
          </button>
        </div>

        {current.key === 'photo' && (
          <button className="onboarding-skip" onClick={handleNext}>Skip for now</button>
        )}
      </div>
    </div>
  );
}
