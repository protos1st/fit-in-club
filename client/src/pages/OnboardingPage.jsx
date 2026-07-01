import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';
import { useToast } from '../lib/ToastContext';

const STEPS = [
  { key: 'gender', title: 'About you', subtitle: 'This helps others find the right training partner' },
  { key: 'workoutFrequency', title: 'Workout frequency', subtitle: 'How often do you train per week?' },
  { key: 'trainingType', title: 'Training style', subtitle: 'Pick all that apply' }
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
  const { setUser } = useAuth();
  const showToast = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ gender: '', workoutFrequency: '', trainingType: [] });
  const [submitting, setSubmitting] = useState(false);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const canProceed = current.key === 'trainingType' || form[current.key];

  function select(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleTraining(opt) {
    setForm(f => {
      const cur = f.trainingType;
      return { ...f, trainingType: cur.includes(opt) ? cur.filter(x => x !== opt) : [...cur, opt] };
    });
  }

  async function handleNext() {
    if (isLast) {
      setSubmitting(true);
      try {
        const payload = { ...form, trainingType: form.trainingType.join(', ') };
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
            <button
              key={opt}
              className={`onboarding-option ${form.gender === opt ? 'selected' : ''}`}
              onClick={() => select('gender', opt)}
            >
              {opt}
            </button>
          ))}

          {current.key === 'workoutFrequency' && FREQUENCY_OPTIONS.map((opt) => (
            <button
              key={opt}
              className={`onboarding-option ${form.workoutFrequency === opt ? 'selected' : ''}`}
              onClick={() => select('workoutFrequency', opt)}
            >
              {opt}
            </button>
          ))}

          {current.key === 'trainingType' && (
            <div className="training-check-list">
              {TRAINING_OPTIONS.map((opt) => (
                <label key={opt} className="training-check-row">
                  <input
                    type="checkbox"
                    checked={form.trainingType.includes(opt)}
                    onChange={() => toggleTraining(opt)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
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
          <button
            className="btn btn-primary ml-auto"
            onClick={handleNext}
            disabled={!canProceed || submitting}
          >
            {submitting ? 'Saving…' : isLast ? 'Get started' : 'Next'}
          </button>
        </div>

        {!isLast && step > 0 && (
          <button className="onboarding-skip" onClick={() => setStep((s) => s + 1)}>Skip</button>
        )}
      </div>
    </div>
  );
}
