import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import fitinLogo from '../assets/fitin-logo-green.png';

function EyeIcon({ open }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {open ? (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </>
      ) : (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
          <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </>
      )}
    </svg>
  );
}

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', gymCode: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (error) setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (mode === 'signup' && !form.name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!form.email.trim()) {
      setError('Please enter your email');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (mode === 'signup' && !form.gymCode.trim()) {
      setError('Gym code is required — ask the front desk');
      return;
    }

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

  function switchMode() {
    setMode((m) => m === 'login' ? 'signup' : 'login');
    setError('');
    setShowPassword(false);
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <a href="https://fitin.club/" target="_blank" rel="noopener noreferrer" className="auth-logo-link">
          <img src={fitinLogo} alt="Fit In Club" className="auth-logo" />
        </a>

        <h1 className="auth-heading">{mode === 'login' ? 'Welcome back' : 'Join your gym'}</h1>
        <p className="auth-tagline">
          {mode === 'login' ? 'Log in to find your gym buddies.' : 'Create an account to connect with training partners.'}
        </p>

        {error && <div className="form-error" role="alert">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          {mode === 'signup' && (
            <div className="field">
              <label htmlFor="auth-name">Full name</label>
              <input
                id="auth-name"
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                maxLength={100}
              />
            </div>
          )}

          <div className="field">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              maxLength={254}
            />
          </div>

          <div className="field">
            <label htmlFor="auth-password">Password</label>
            <div className="password-wrapper">
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                maxLength={128}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
            {mode === 'signup' && form.password.length > 0 && (
              <div className={`password-strength ${form.password.length >= 6 ? 'ok' : 'weak'}`}>
                {form.password.length < 6 ? `${6 - form.password.length} more character${6 - form.password.length > 1 ? 's' : ''} needed` : 'Looks good'}
              </div>
            )}
          </div>

          {mode === 'signup' && (
            <div className="field">
              <label htmlFor="auth-gymcode">Gym access code</label>
              <input
                id="auth-gymcode"
                type="text"
                value={form.gymCode}
                onChange={(e) => update('gymCode', e.target.value)}
                placeholder="Ask the front desk"
                maxLength={50}
              />
              <div className="form-note">Your gym provides this code to verify membership.</div>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>

        {mode === 'login' && (
          <div className="auth-forgot">
            <button onClick={() => setError('Please ask the gym front desk to reset your password.')}>Forgot password?</button>
          </div>
        )}

        <div className="auth-switch">
          {mode === 'login' ? (
            <>New here? <button onClick={switchMode}>Create an account</button></>
          ) : (
            <>Already a member? <button onClick={switchMode}>Log in</button></>
          )}
        </div>
      </div>
      <div className="powered-by auth-powered-by">
        Powered by
        <a href="https://fitin.club/" target="_blank" rel="noopener noreferrer" className="powered-by-link">
          <img src={fitinLogo} alt="FitIn" className="powered-by-logo" />
        </a>
      </div>
    </div>
  );
}
