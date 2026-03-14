// pages/ResetPasswordPage.js
// This page is opened via the link in the reset email: /reset-password/:token
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const ResetPasswordPage = () => {
  const { token }            = useParams();
  const navigate             = useNavigate();
  const { updateUser }       = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [status, setStatus]   = useState('loading'); // loading | valid | invalid | used | success
  const [tokenInfo, setTokenInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm]       = useState({ password: '', confirmPassword: '' });

  // Validate token on mount
  useEffect(() => {
    const validate = async () => {
      try {
        const res = await authAPI.validateResetToken(token);
        setTokenInfo(res.data);
        setStatus('valid');
      } catch (err) {
        const msg = err.response?.data?.message || '';
        if (msg.toLowerCase().includes('already been used')) setStatus('used');
        else setStatus('invalid');
      }
    };
    validate();
  }, [token]);

  const handleReset = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    if (form.password !== form.confirmPassword) return toast.error('Passwords do not match');

    setLoading(true);
    try {
      const res = await authAPI.resetPassword(token, form.password);
      const { token: jwt, user } = res.data;

      // Auto-login
      localStorage.setItem('khatanest_token', jwt);
      localStorage.setItem('khatanest_user', JSON.stringify(user));
      updateUser(user);

      toast.success('Password reset! Logging you in...');
      setStatus('success');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      const msg = err.response?.data?.message || 'Reset failed. Please try again.';
      if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('invalid')) {
        setStatus('invalid');
      } else if (msg.toLowerCase().includes('already been used')) {
        setStatus('used');
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const strengthScore = (p) => {
    let s = 0;
    if (p.length >= 6)  s++;
    if (p.length >= 10) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };
  const score = strengthScore(form.password);
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][score] || '';
  const strengthColor = ['', '#FF5C6A', '#FFB547', '#FFB547', '#2ECC9A', '#2ECC9A'][score] || 'var(--border)';

  // ── Loading ──
  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  // ── Success ──
  if (status === 'success') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ maxWidth: 400, width: '100%', textAlign: 'center', background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 20, padding: 40 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, color: 'var(--accent)', fontSize: 22, margin: '0 0 10px' }}>Password Reset!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>Redirecting you to the dashboard...</p>
        </div>
      </div>
    );
  }

  // ── Invalid / Expired / Used ──
  if (status === 'invalid' || status === 'used') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ maxWidth: 420, width: '100%', textAlign: 'center', background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 20, padding: 40 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>{status === 'used' ? '🔒' : '⏰'}</div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, color: 'var(--text)', fontSize: 22, margin: '0 0 12px' }}>
            {status === 'used' ? 'Link Already Used' : 'Link Expired'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.7, margin: '0 0 28px' }}>
            {status === 'used'
              ? 'This reset link has already been used. Each link works only once for security.'
              : 'This reset link has expired (links are valid for 1 hour). Please request a new one.'}
          </p>
          <Link to="/forgot-password" style={{ textDecoration: 'none' }}>
            <button style={{
              width: '100%', padding: '12px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #2ECC9A, #1A7A5C)',
              color: '#000', fontWeight: 800, fontSize: 14, cursor: 'pointer',
              marginBottom: 12,
            }}>Request New Reset Link</button>
          </Link>
          <Link to="/login" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>← Back to Login</Link>
        </div>
      </div>
    );
  }

  // ── Valid: show the reset form ──
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      backgroundImage: 'radial-gradient(ellipse 70% 50% at 50% -5%, var(--accent-soft), transparent)',
    }}>
      {/* Theme toggle */}
      <button onClick={toggleTheme} style={{
        position: 'fixed', top: 20, right: 20,
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 14px', borderRadius: 10,
        border: '1px solid var(--border)', background: 'var(--surface)',
        color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
      }}>
        <span>{isDark ? '☀️' : '🌙'}</span>
        <span>{isDark ? 'Light' : 'Dark'}</span>
      </button>

      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 18, margin: '0 auto 14px',
            background: 'linear-gradient(135deg, #2ECC9A, #1A7A5C)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30, fontWeight: 900, color: '#000',
            boxShadow: '0 0 40px rgba(46,204,154,0.3)',
          }}>K</div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 30, color: 'var(--text)', margin: 0, letterSpacing: -0.5 }}>
            Set New Password
          </h1>
          {tokenInfo?.name && (
            <p style={{ color: 'var(--text-muted)', margin: '6px 0 0', fontSize: 13 }}>
              Hi <strong style={{ color: 'var(--accent)' }}>{tokenInfo.name}</strong> 👋 choose a strong new password
            </p>
          )}
        </div>

        <div style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 20, padding: 28 }}>
          <form onSubmit={handleReset}>

            {/* New Password */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Min 6 characters"
                  required
                  autoFocus
                  style={{
                    width: '100%', padding: '11px 44px 11px 14px',
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 10, color: 'var(--text)', fontSize: 14,
                    outline: 'none', transition: 'all .2s',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-soft)'; }}
                  onBlur={e  => { e.target.style.borderColor = 'var(--border)';  e.target.style.boxShadow = 'none'; }}
                />
                <button type="button" onClick={() => setShowPass(s => !s)} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0,
                }}>{showPass ? '🙈' : '👁️'}</button>
              </div>

              {/* Strength bar */}
              {form.password.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    {[1,2,3,4,5].map(i => (
                      <div key={i} style={{
                        flex: 1, height: 4, borderRadius: 99,
                        background: i <= score ? strengthColor : 'var(--border)',
                        transition: 'background .3s',
                      }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: strengthColor, fontWeight: 700 }}>{strengthLabel}</div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Confirm Password
              </label>
              <input
                type={showPass ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                placeholder="Re-enter your password"
                required
                style={{
                  width: '100%', padding: '11px 14px',
                  background: 'var(--surface)', border: `1px solid ${form.confirmPassword && form.password !== form.confirmPassword ? 'var(--red)' : 'var(--border)'}`,
                  borderRadius: 10, color: 'var(--text)', fontSize: 14,
                  outline: 'none', transition: 'all .2s',
                }}
                onFocus={e => { if (form.password === form.confirmPassword || !form.confirmPassword) { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-soft)'; }}}
                onBlur={e  => { e.target.style.borderColor = form.confirmPassword && form.password !== form.confirmPassword ? 'var(--red)' : 'var(--border)'; e.target.style.boxShadow = 'none'; }}
              />
              {form.confirmPassword && form.password !== form.confirmPassword && (
                <div style={{ marginTop: 4, fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>
                  ✗ Passwords do not match
                </div>
              )}
              {form.confirmPassword && form.password === form.confirmPassword && form.confirmPassword.length >= 6 && (
                <div style={{ marginTop: 4, fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
                  ✓ Passwords match
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || form.password !== form.confirmPassword || form.password.length < 6}
              style={{
                width: '100%', padding: '13px', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, #2ECC9A, #1A7A5C)',
                color: '#000', fontWeight: 800, fontSize: 15,
                cursor: (loading || form.password !== form.confirmPassword || form.password.length < 6) ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 20px rgba(46,204,154,0.3)',
                opacity: (loading || form.password !== form.confirmPassword || form.password.length < 6) ? 0.6 : 1,
                transition: 'opacity .2s',
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{ width: 16, height: 16, border: '2px solid #000', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                  Resetting...
                </span>
              ) : '🔑 Reset Password & Login'}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <Link to="/login" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>
              ← Back to Login
            </Link>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
};

export default ResetPasswordPage;