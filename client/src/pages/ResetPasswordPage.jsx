import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import fitinLogo from '../assets/fitin-logo-green.png';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="form-error">Invalid reset link. Please request a new one.</div>
          <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} onClick={() => navigate('/auth')}>Back to login</button>
        </div>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirm) { setError("Passwords don't match"); return; }

    setSubmitting(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err.message || 'Reset failed. Link may have expired.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <a href="https://fitin.club/" target="_blank" rel="noopener noreferrer" className="auth-logo-link">
          <img src={fitinLogo} alt="Fit In Club" className="auth-logo" />
        </a>

        {done ? (
          <>
            <h1 className="auth-heading">Password updated</h1>
            <p className="auth-tagline">You can now log in with your new password.</p>
            <button className="btn btn-primary btn-block" style={{ marginTop: 8 }} onClick={() => navigate('/auth')}>Go to login</button>
          </>
        ) : (
          <>
            <h1 className="auth-heading">Set new password</h1>
            <p className="auth-tagline">Choose a new password for your account.</p>
            {error && <div className="form-error" role="alert">{error}</div>}
            <form onSubmit={handleSubmit} noValidate>
              <div className="field">
                <label>New password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" maxLength={128} autoFocus />
                {password.length > 0 && (
                  <div className={`password-strength ${password.length >= 8 ? 'ok' : 'weak'}`}>
                    {password.length < 8 ? `${8 - password.length} more character${8 - password.length > 1 ? 's' : ''} needed` : 'Looks good'}
                  </div>
                )}
              </div>
              <div className="field">
                <label>Confirm password</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Same password again" autoComplete="new-password" maxLength={128} />
                {confirm.length > 0 && password !== confirm && (
                  <div className="password-strength weak">Passwords don't match</div>
                )}
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                {submitting ? 'Saving…' : 'Reset password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
