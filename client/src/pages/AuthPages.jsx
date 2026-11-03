import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../api/client.js';
import { ErrorMessage } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Logo() {
  return (
    <svg width="30" height="30" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="28" height="28" rx="7" fill="#f97316" />
      <path d="M6 17h10l-3 4 9-7-9-7 3 4H6" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AuthForm({ mode }) {
  const isRegister = mode === 'register';
  const { login, register } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [form, setForm]         = useState({ name: '', email: '', password: '' });
  const [error, setError]       = useState('');
  const [submitting, setSub]    = useState(false);

  const update = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

  function validate() {
    if (isRegister && form.name.trim().length < 2) return 'Name needs at least 2 characters';
    if (!EMAIL_RE.test(form.email.trim())) return 'Enter a valid email address';
    if (!form.password) return 'Password is required';
    if (isRegister && form.password.length < 8) return 'Password must be at least 8 characters';
    return '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) return setError(err);
    setError('');
    setSub(true);
    try {
      if (isRegister) await register({ name: form.name.trim(), email: form.email.trim(), password: form.password });
      else await login({ email: form.email.trim(), password: form.password });
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
      setSub(false);
    }
  }

  return (
    <div className="auth-page">
      <header className="auth-nav">
        <Link to="/" className="auth-nav-brand">
          <Logo />
          <span>Sprint<span>Board</span></span>
        </Link>
        <div className="auth-nav-links">
          <Link to="/login" className={!isRegister ? 'active' : ''}>Sign in</Link>
          <Link to="/register" className={isRegister ? 'active' : ''}>Create account</Link>
        </div>
      </header>

      <main className="auth-main">
        <div className="auth-card">
        <Link to="/" className="auth-brand">
          <Logo />
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.1rem', color: '#e8eaf0', letterSpacing: '-0.03em' }}>
            Sprint<span style={{ color: '#f97316' }}>Board</span>
          </span>
        </Link>

        <h1>{isRegister ? 'Create account' : 'Welcome back'}</h1>
        <p className="auth-sub muted">
          {isRegister
            ? 'Set up your account to get started.'
            : 'Sign in to continue to your workspace.'}
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <ErrorMessage message={error} />

          {isRegister && (
            <label className="field">
              <span>Full name</span>
              <input
                value={form.name}
                onChange={update('name')}
                autoComplete="name"
                maxLength={60}
                placeholder="Your name"
              />
            </label>
          )}

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={update('email')}
              autoComplete="email"
              placeholder="you@company.com"
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={form.password}
              onChange={update('password')}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              maxLength={72}
              placeholder={isRegister ? 'At least 8 characters' : '••••••••'}
            />
          </label>

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <hr className="auth-divider" />

        <p className="auth-switch">
          {isRegister
            ? (<>Already have an account? <Link to="/login">Sign in</Link></>)
            : (<>No account? <Link to="/register">Sign up</Link></>)}
        </p>
        </div>
      </main>

      <footer className="auth-footer">
        <span>&copy; 2026 SprintBoard. All rights reserved.</span>
        <nav aria-label="Footer navigation">
          <Link to="/login">Sign in</Link>
          <Link to="/register">Create account</Link>
        </nav>
      </footer>
    </div>
  );
}

export const LoginPage    = () => <AuthForm mode="login" />;
export const RegisterPage = () => <AuthForm mode="register" />;
