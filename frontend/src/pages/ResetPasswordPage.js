import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import ThemeToggleButton from '../components/ThemeToggleButton';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

const ResetPasswordPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { updateUser } = useAuth();

  const [status, setStatus] = useState('loading');
  const [tokenInfo, setTokenInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ password: '', confirmPassword: '' });

  useEffect(() => {
    const validate = async () => {
      try {
        const response = await authAPI.validateResetToken(token);
        setTokenInfo(response.data);
        setStatus('valid');
      } catch (error) {
        const message = error.response?.data?.message || '';
        setStatus(message.toLowerCase().includes('already been used') ? 'used' : 'invalid');
      }
    };

    validate();
  }, [token]);

  const handleReset = async (event) => {
    event.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    if (form.password !== form.confirmPassword) return toast.error('Passwords do not match');

    setLoading(true);
    try {
      const response = await authAPI.resetPassword(token, form.password);
      const { token: jwt, user } = response.data;

      localStorage.setItem('khatanest_token', jwt);
      localStorage.setItem('khatanest_user', JSON.stringify(user));
      updateUser(user);

      toast.success('Password reset! Logging you in...');
      setStatus('success');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (error) {
      const message = error.response?.data?.message || 'Reset failed. Please try again.';
      if (message.toLowerCase().includes('expired') || message.toLowerCase().includes('invalid')) setStatus('invalid');
      else if (message.toLowerCase().includes('already been used')) setStatus('used');
      else toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const strengthScore = (password) => {
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 10) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  };

  const score = strengthScore(form.password);
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][score] || '';
  const strengthColor = ['', 'var(--red)', 'var(--yellow)', 'var(--yellow)', 'var(--accent)', 'var(--accent)'][score] || 'var(--border)';

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ maxWidth: 400, width: '100%', textAlign: 'center', background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 24, padding: 40, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 18, color: 'var(--accent)', fontWeight: 900, marginBottom: 16 }}>DONE</div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, color: 'var(--accent)', fontSize: 22, margin: '0 0 10px' }}>Password Reset</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>Redirecting you to the dashboard...</p>
        </div>
      </div>
    );
  }

  if (status === 'invalid' || status === 'used') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ maxWidth: 420, width: '100%', textAlign: 'center', background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 24, padding: 40, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 18, color: 'var(--red)', fontWeight: 900, marginBottom: 16 }}>{status === 'used' ? 'USED' : 'EXPIRED'}</div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, color: 'var(--text)', fontSize: 22, margin: '0 0 12px' }}>
            {status === 'used' ? 'Link Already Used' : 'Link Expired'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.7, margin: '0 0 28px' }}>
            {status === 'used'
              ? 'This reset link has already been used. Each link works only once for security.'
              : 'This reset link has expired. Please request a new one.'}
          </p>
          <Link to="/forgot-password" style={{ textDecoration: 'none' }}>
            <button type="button" style={{ width: '100%', padding: '12px', borderRadius: 14, border: 'none', background: 'var(--button-primary-gradient)', color: 'var(--button-primary-text)', fontWeight: 800, fontSize: 14, marginBottom: 12, boxShadow: 'var(--shadow)' }}>
              Request New Reset Link
            </button>
          </Link>
          <Link to="/login" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>Back to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backgroundImage: 'radial-gradient(ellipse 70% 50% at 50% -5%, var(--accent-soft), transparent)',
      }}
    >
      <ThemeToggleButton style={{ position: 'fixed', top: 20, right: 20 }} />

      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 60, height: 60, borderRadius: 18, margin: '0 auto 14px', background: 'linear-gradient(135deg, #2ECC9A, #1A7A5C)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 900, color: '#000', boxShadow: '0 0 40px rgba(46,204,154,0.3)' }}>
            K
          </div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 30, color: 'var(--text)', margin: 0, letterSpacing: -0.5 }}>
            Set New Password
          </h1>
          {tokenInfo?.name && (
            <p style={{ color: 'var(--text-muted)', margin: '6px 0 0', fontSize: 13 }}>
              Hi <strong style={{ color: 'var(--accent)' }}>{tokenInfo.name}</strong>, choose a strong new password.
            </p>
          )}
        </div>

        <div style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 24, padding: 28, boxShadow: 'var(--shadow)' }}>
          <form onSubmit={handleReset}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder="Min 6 characters"
                  required
                  autoFocus
                  style={{ width: '100%', padding: '11px 54px 11px 14px' }}
                />
                <button type="button" onClick={() => setShowPass((current) => !current)} aria-label={showPass ? 'Hide password' : 'Show password'} title={showPass ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 700, fontSize: 12, padding: 0 }}>
                  {showPass ? '🙈' : '🙉'}
                </button>
              </div>

              {form.password.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    {[1, 2, 3, 4, 5].map((index) => (
                      <div key={index} style={{ flex: 1, height: 4, borderRadius: 99, background: index <= score ? strengthColor : 'var(--border)', transition: 'background .3s ease' }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: strengthColor, fontWeight: 700 }}>{strengthLabel}</div>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Confirm Password
              </label>
              <input
                type={showPass ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                placeholder="Re-enter your password"
                required
                style={{ width: '100%', borderColor: form.confirmPassword && form.password !== form.confirmPassword ? 'var(--red)' : undefined }}
              />
              {form.confirmPassword && form.password !== form.confirmPassword && <div style={{ marginTop: 4, fontSize: 12, color: 'var(--red)', fontWeight: 700 }}>Passwords do not match</div>}
              {form.confirmPassword && form.password === form.confirmPassword && form.confirmPassword.length >= 6 && <div style={{ marginTop: 4, fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>Passwords match</div>}
            </div>

            <button
              type="submit"
              disabled={loading || form.password !== form.confirmPassword || form.password.length < 6}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: 14,
                border: 'none',
                background: 'var(--button-primary-gradient)',
                color: 'var(--button-primary-text)',
                fontWeight: 800,
                fontSize: 15,
                cursor: loading || form.password !== form.confirmPassword || form.password.length < 6 ? 'not-allowed' : 'pointer',
                boxShadow: 'var(--shadow)',
                opacity: loading || form.password !== form.confirmPassword || form.password.length < 6 ? 0.6 : 1,
              }}
            >
              {loading ? 'Resetting...' : 'Reset Password & Login'}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <Link to="/login" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
