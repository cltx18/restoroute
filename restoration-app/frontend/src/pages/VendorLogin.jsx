import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { vendorApi, setVendorToken } from '../api.js';

export default function VendorLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await vendorApi.login(email, password);
      setVendorToken(data.token);
      if (data.must_change_password) {
        navigate('/vendor/change-password');
      } else {
        navigate('/vendor');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <h1>Contractor Portal</h1>
        <p className="sub">Sign in to view your leads, calls, and recordings.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={{ marginTop: 18, fontSize: '0.85rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Link to="/">← Back to homepage</Link>
        </p>
      </div>
    </div>
  );
}
