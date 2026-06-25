import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';
import { useToast } from '../lib/ToastContext';

const STEPS = [
  { key: 'membership', title: 'Gym membership', subtitle: 'What type of membership do you have?' },
  { key: 'workoutFrequency', title: 'Workout frequency', subtitle: 'How often do you train per week?' },
  { key: 'buddyPreference', title: 'Buddy preference', subtitle: 'What are you looking for?' },
  { key: 'trainingType', title: 'Training style', subtitle: 'What do you usually train?' },
  { key: 'bio', title: 'About you', subtitle: 'A short intro so buddies know who you are' }
];

const OPTIONS = {
  membership: ['Monthly', 'Quarterly', 'Yearly', 'Day pass', 'Other'],
  workoutFrequency: ['1–2 times', '3–4 times', '5–6 times', 'Every day'],
  buddyPreference: ['Looking for a buddy', 'Open to being a buddy', 'Both']
};

export default function OnboardingPage() {
  const { setUser } = useAuth();
  const showToast = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    membership: '',
    workoutFrequency: '',
    buddyPreference: '',
    trainingType: '',
    bio: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const canProceed = current.key === 'bio' || current.key === 'trainingType' || form[current.key];

  function select(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleNext() {
    if (isLast) {
      setSubmitting(true);
      try {
        const data = await api.completeOnboarding(form);
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
          {OPTIONS[current.key] ? (
            OPTIONS[current.key].map((opt) => (
              <button
                key={opt}
                className={`onboarding-option ${form[current.key] === opt ? 'selected' : ''}`}
                onClick={() => select(current.key, opt)}
              >
                {opt}
              </button>
            ))
          ) : current.key === 'bio' ? (
            <textarea
              value={form.bio}
              onChange={(e) => select('bio', e.target.value)}
              placeholder="e.g. I've been training for 2 years, looking for a consistent gym partner"
              rows={3}
              maxLength={500}
              style={{ resize: 'vertical' }}
            />
          ) : (
            <input
              type="text"
              value={form.trainingType}
              onChange={(e) => select('trainingType', e.target.value)}
              placeholder="e.g. Powerlifting, CrossFit, Yoga, Running"
              maxLength={100}
            />
          )}
        </div>

        <div className="onboarding-actions">
          {step > 0 && (
            <button className="btn btn-ghost" onClick={() => setStep((s) => s - 1)}>Back</button>
          )}
          <button
            className="btn btn-primary"
            onClick={handleNext}
            disabled={!canProceed || submitting}
            style={{ marginLeft: 'auto' }}
          >
            {submitting ? 'Saving…' : isLast ? 'Get started' : 'Next'}
          </button>
        </div>

        {!isLast && current.key !== 'membership' && (
          <button className="onboarding-skip" onClick={() => setStep((s) => s + 1)}>Skip</button>
        )}
      </div>
    </div>
  );
}
