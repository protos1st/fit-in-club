import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import fitinLogo from '../assets/fitin-logo-green.png';

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [form, setForm] = useState({ name: '', email: '', password: '', gymCode: '', trainingType: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await signup(form);
      }
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <img src={fitinLogo} alt="Fit In Club" className="auth-logo" />
        <div className="auth-tagline">
          {mode === 'login' ? 'Log in to find your gym buddies.' : 'Sign up with your gym access code.'}
        </div>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="field">
              <label>Full name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                required
                placeholder="Alex Carter"
              />
            </div>
          )}

          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>

          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              required
              minLength={6}
              placeholder="At least 6 characters"
            />
          </div>

          {mode === 'signup' && (
            <>
              <div className="field">
                <label>Gym access code</label>
                <input
                  type="text"
                  value={form.gymCode}
                  onChange={(e) => update('gymCode', e.target.value)}
                  required
                  placeholder="Ask the front desk"
                />
              </div>
              <div className="field">
                <label>What do you train? (optional)</label>
                <input
                  type="text"
                  value={form.trainingType}
                  onChange={(e) => update('trainingType', e.target.value)}
                  placeholder="e.g. Powerlifting, Yoga, Running"
                />
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' ? (
            <>No account yet? <button onClick={() => { setMode('signup'); setError(''); }}>Sign up</button></>
          ) : (
            <>Already a member? <button onClick={() => { setMode('login'); setError(''); }}>Log in</button></>
          )}
        </div>
      </div>
    </div>
  );
}
