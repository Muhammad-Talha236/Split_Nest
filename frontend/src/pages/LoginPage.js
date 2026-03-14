// pages/LoginPage.js - Login & Register
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// ── Password strength helper ───────────────────────────────────────────────
const getStrength = (p) => {
  if (!p) return { score: 0, label: '', color: '' };
  let score = 0;
  if (p.length >= 6)           score++;
  if (p.length >= 10)          score++;
  if (/[A-Z]/.test(p))        score++;
  if (/[0-9]/.test(p))        score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  const map = [
    { label: '',             color: 'var(--border)' },
    { label: 'Too weak',     color: '#FF5C6A'       },
    { label: 'Weak',         color: '#FF8C5A'       },
    { label: 'Fair',         color: '#FFB547'       },
    { label: 'Strong',       color: '#2ECC9A'       },
    { label: 'Very strong',  color: '#1AB87A'       },
  ];
  return { score, ...map[score] };
};

// ── Shared style helpers ───────────────────────────────────────────────────
const labelStyle = {
  display: 'block', marginBottom: 6, fontSize: 11,
  color: 'var(--text-muted)', fontWeight: 700,
  letterSpacing: 0.8, textTransform: 'uppercase',
};

const inputStyle = (border = 'var(--border)') => ({
  width: '100%', background: 'var(--surface)',
  border: `1px solid ${border}`,
  borderRadius: 10, padding: '11px 14px',
  color: 'var(--text)', fontSize: 14,
  outline: 'none', transition: 'border-color .2s, box-shadow .2s',
  boxSizing: 'border-box',
});

const onFocus = (e) => {
  e.target.style.borderColor = 'var(--accent)';
  e.target.style.boxShadow   = '0 0 0 3px var(--accent-soft)';
};
const onBlur = (e, errBorder = 'var(--border)') => {
  e.target.style.borderColor = errBorder;
  e.target.style.boxShadow   = 'none';
};

// ─────────────────────────────────────────────────────────────────────────────

const LoginPage = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', groupName: '' });

  const { login, register }     = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate                = useNavigate();

  const set = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    if (error) setError(''); // clear error as user types
  };

  const switchTab = (toRegister) => {
    setIsRegister(toRegister);
    setError('');
    setShowPass(false);
    setForm({ name: '', email: '', password: '', groupName: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side checks
    if (isRegister && !form.name.trim()) { setError('Please enter your full name.'); return; }
    if (!form.email.trim())              { setError('Please enter your email address.'); return; }
    if (!form.password)                  { setError('Please enter your password.'); return; }
    if (form.password.length < 6)        { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);
    try {
      if (isRegister) {
        await register({ name: form.name, email: form.email, password: form.password, groupName: form.groupName });
        navigate('/dashboard');
      } else {
        await login(form.email, form.password);
        navigate('/dashboard');
      }
    } catch (err) {
      const msg = err.response?.data?.message || '';
      // Make error messages user-friendly
      if (msg.toLowerCase().includes('invalid email or password')) {
        setError('Incorrect email or password. Please try again.');
      } else if (msg.toLowerCase().includes('email already')) {
        setError('This email is already registered. Try logging in instead.');
      } else if (msg.toLowerCase().includes('deactivated')) {
        setError('Your account has been deactivated. Contact your admin.');
      } else {
        setError(msg || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const strength    = isRegister ? getStrength(form.password) : null;
  const errEmail    = error && (!form.email    || error.toLowerCase().includes('email')    || error.toLowerCase().includes('incorrect'));
  const errPassword = error && (!form.password || error.toLowerCase().includes('password') || error.toLowerCase().includes('incorrect'));

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      backgroundImage: 'radial-gradient(ellipse 70% 50% at 50% -5%, var(--accent-soft), transparent)',
      position: 'relative',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Theme toggle */}
        <button onClick={toggleTheme} style={{
          position: 'absolute', top: 20, right: 20,
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 14px', borderRadius: 10,
          border: '1px solid var(--border)', background: 'var(--surface)',
          color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          <span>{isDark ? '☀️' : '🌙'}</span>
          <span>{isDark ? 'Light' : 'Dark'}</span>
        </button>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 68, height: 68, borderRadius: 20, margin: '0 auto 14px',
            background: 'linear-gradient(135deg, #2ECC9A, #1A7A5C)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 34, fontWeight: 900, color: '#000',
            boxShadow: '0 0 50px rgba(46,204,154,0.3)',
          }}>K</div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 34, color: 'var(--text)', margin: 0, letterSpacing: -1 }}>
            KhataNest
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '6px 0 0', fontSize: 14 }}>
            Hostel Expense Management
          </p>
        </div>

        <div style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 20, padding: 28 }}>

          {/* Tabs */}
          <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 10, padding: 4, marginBottom: 24 }}>
            {[['Login', false], ['Register', true]].map(([label, val]) => (
              <button key={label} onClick={() => switchTab(val)} style={{
                flex: 1, padding: '9px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 14, transition: 'all .2s',
                background: isRegister === val ? 'var(--accent-soft)' : 'transparent',
                color:      isRegister === val ? 'var(--accent)'      : 'var(--text-muted)',
              }}>{label}</button>
            ))}
          </div>

          <form onSubmit={handleSubmit} noValidate>

            {/* Name — register only */}
            {isRegister && (
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Full Name</label>
                <input
                  type="text" placeholder="Ali Raza"
                  value={form.name} onChange={set('name')} required
                  style={inputStyle()}
                  onFocus={onFocus}
                  onBlur={e => onBlur(e)}
                />
              </div>
            )}

            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Email Address</label>
              <input
                type="email" placeholder="ali@hostel.com"
                value={form.email} onChange={set('email')} required
                style={inputStyle(errEmail ? '#FF5C6A' : 'var(--border)')}
                onFocus={onFocus}
                onBlur={e => onBlur(e, errEmail ? '#FF5C6A' : 'var(--border)')}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: isRegister ? 0 : 4 }}>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password} onChange={set('password')} required
                  style={{ ...inputStyle(errPassword ? '#FF5C6A' : 'var(--border)'), paddingRight: 44 }}
                  onFocus={onFocus}
                  onBlur={e => onBlur(e, errPassword ? '#FF5C6A' : 'var(--border)')}
                />
                {/* Show/hide toggle */}
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 15, padding: 0, lineHeight: 1, color: 'var(--text-muted)',
                  }}
                >{showPass ? '🙈' : '👁️'}</button>
              </div>

              {/* ── Password strength (register only) ── */}
              {isRegister && form.password.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  {/* 5-segment bar */}
                  <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
                    {[1,2,3,4,5].map(i => (
                      <div key={i} style={{
                        flex: 1, height: 4, borderRadius: 99,
                        background: i <= strength.score ? strength.color : 'var(--border)',
                        transition: 'background .25s',
                      }} />
                    ))}
                  </div>
                  {/* Label + hint */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                    <span style={{ fontWeight: 700, color: strength.color }}>{strength.label}</span>
                    {strength.score <= 2 && (
                      <span style={{ color: 'var(--text-muted)' }}>— try adding numbers or symbols</span>
                    )}
                    {strength.score === 3 && (
                      <span style={{ color: 'var(--text-muted)' }}>— almost there!</span>
                    )}
                    {strength.score >= 4 && (
                      <span style={{ color: strength.color }}>✓</span>
                    )}
                  </div>
                </div>
              )}

              {/* Forgot password link — login only */}
              {!isRegister && (
                <div style={{ marginTop: 8, textAlign: 'right' }}>
                  <Link
                    to="/forgot-password"
                    style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 500 }}
                    onMouseEnter={e => e.target.style.color = 'var(--accent)'}
                    onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
                  >
                    Forgot password?
                  </Link>
                </div>
              )}
            </div>

            {/* Group name — register only */}
            {isRegister && (
              <div style={{ marginBottom: 16, marginTop: 16 }}>
                <label style={labelStyle}>Group / Hostel Name</label>
                <input
                  type="text" placeholder="My Hostel Group"
                  value={form.groupName} onChange={set('groupName')}
                  style={inputStyle()}
                  onFocus={onFocus}
                  onBlur={e => onBlur(e)}
                />
              </div>
            )}

            {/* ── Inline error banner ── */}
            {error && (
              <div style={{
                margin: '14px 0 4px',
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(255,92,106,0.1)',
                border: '1px solid rgba(255,92,106,0.35)',
                display: 'flex', alignItems: 'flex-start', gap: 9,
                animation: 'errIn .2s ease',
              }}>
                <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>⚠️</span>
                <span style={{ fontSize: 13, color: '#FF7C86', fontWeight: 600, lineHeight: 1.45 }}>
                  {error}
                </span>
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '13px', borderRadius: 12, border: 'none',
              marginTop: error ? 12 : 16,
              background: 'linear-gradient(135deg, #2ECC9A, #1A7A5C)',
              color: '#000', fontWeight: 800, fontSize: 15,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 20px rgba(46,204,154,0.3)',
              opacity: loading ? 0.7 : 1, transition: 'opacity .2s',
            }}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{
                    width: 15, height: 15,
                    border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000',
                    borderRadius: '50%', display: 'inline-block',
                    animation: 'spin .7s linear infinite',
                  }} />
                  Please wait...
                </span>
              ) : isRegister ? 'Create Account & Group' : 'Login to KhataNest'}
            </button>

          </form>
        </div>
      </div>

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes errIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  );
};

export default LoginPage;