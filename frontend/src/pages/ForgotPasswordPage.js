// pages/ForgotPasswordPage.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const ForgotPasswordPage = () => {
  const [email, setEmail]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Please enter your email address');

    setLoading(true);
    try {
      const res = await authAPI.forgotPassword(email);
      toast.success(res.data.message || 'Reset link sent!');
      setSubmitted(true);
    } catch (err) {
      const msg = err.response?.data?.message || 'Something went wrong. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

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
          <Link to="/login" style={{ textDecoration: 'none' }}>
            <div style={{
              width: 60, height: 60, borderRadius: 18, margin: '0 auto 14px',
              background: 'linear-gradient(135deg, #2ECC9A, #1A7A5C)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 30, fontWeight: 900, color: '#000',
              boxShadow: '0 0 40px rgba(46,204,154,0.3)',
            }}>K</div>
          </Link>
          <h1 style={{
            fontFamily: "'Syne', sans-serif", fontWeight: 900,
            fontSize: 30, color: 'var(--text)', margin: 0, letterSpacing: -0.5,
          }}>Forgot Password?</h1>
          <p style={{ color: 'var(--text-muted)', margin: '6px 0 0', fontSize: 13 }}>
            We'll send a reset link to your email
          </p>
        </div>

        {/* ── Success state ── */}
        {submitted ? (
          <div style={{
            background: 'var(--surface-alt)', border: '1px solid var(--border)',
            borderRadius: 20, padding: 32, textAlign: 'center',
            animation: 'slideUp .3s ease',
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'var(--accent-soft)', border: '2px solid var(--accent-glow)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 34, margin: '0 auto 20px',
            }}>📧</div>

            <h3 style={{
              fontFamily: "'Syne', sans-serif", fontWeight: 800,
              color: 'var(--text)', fontSize: 20, margin: '0 0 10px',
            }}>Check Your Inbox!</h3>

            <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.7, margin: '0 0 8px' }}>
              We've sent a password reset link to:
            </p>
            <div style={{
              fontWeight: 700, color: 'var(--accent)', fontSize: 15,
              margin: '0 0 6px', wordBreak: 'break-all',
            }}>{email}</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.6, margin: '0 0 28px' }}>
              The link expires in <strong style={{ color: 'var(--yellow)' }}>1 hour</strong>.
              Check your spam folder if you don't see it.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => { setSubmitted(false); setEmail(''); }}
                style={{
                  width: '100%', padding: '11px', borderRadius: 10,
                  border: '1px solid var(--border)', background: 'var(--surface)',
                  color: 'var(--text-muted)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}
              >
                Resend to a different email
              </button>
              <Link to="/login" style={{ textDecoration: 'none' }}>
                <button style={{
                  width: '100%', padding: '12px', borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg, #2ECC9A, #1A7A5C)',
                  color: '#000', fontWeight: 800, fontSize: 14, cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(46,204,154,0.25)',
                }}>← Back to Login</button>
              </Link>
            </div>
          </div>

        /* ── Form state ── */
        ) : (
          <div style={{
            background: 'var(--surface-alt)', border: '1px solid var(--border)',
            borderRadius: 20, padding: 28,
          }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.7, margin: '0 0 24px' }}>
              Enter the email address linked to your KhataNest account.
              We'll email you a secure link to reset your password.
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 20 }}>
                <label style={{
                  display: 'block', marginBottom: 6, fontSize: 11,
                  color: 'var(--text-muted)', fontWeight: 700,
                  letterSpacing: 0.8, textTransform: 'uppercase',
                }}>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ali@hostel.com"
                  required
                  autoFocus
                  style={{
                    width: '100%', padding: '11px 14px',
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 10, color: 'var(--text)', fontSize: 14,
                    outline: 'none', transition: 'all .2s',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-soft)'; }}
                  onBlur={e  => { e.target.style.borderColor = 'var(--border)';  e.target.style.boxShadow = 'none'; }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '13px', borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg, #2ECC9A, #1A7A5C)',
                  color: '#000', fontWeight: 800, fontSize: 15,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 20px rgba(46,204,154,0.3)',
                  opacity: loading ? 0.7 : 1, transition: 'opacity .2s',
                }}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <span style={{
                      width: 16, height: 16, border: '2px solid #000',
                      borderTopColor: 'transparent', borderRadius: '50%',
                      display: 'inline-block', animation: 'spin 0.7s linear infinite',
                    }} />
                    Sending...
                  </span>
                ) : 'Send Reset Link'}
              </button>
            </form>

            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <Link to="/login" style={{
                color: 'var(--text-muted)', fontSize: 13,
                textDecoration: 'none', fontWeight: 500,
              }}>← Back to Login</Link>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
};

export default ForgotPasswordPage;