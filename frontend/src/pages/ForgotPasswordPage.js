import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import ThemeToggleButton from '../components/ThemeToggleButton';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email) return toast.error('Please enter your email address');

    setLoading(true);
    try {
      const response = await authAPI.forgotPassword(email);
      toast.success(response.data.message || 'Reset link sent!');
      setSubmitted(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
          <Link to="/login" style={{ textDecoration: 'none' }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 18,
                margin: '0 auto 14px',
                background: 'linear-gradient(135deg, #2ECC9A, #1A7A5C)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 30,
                fontWeight: 900,
                color: '#000',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              K
            </div>
          </Link>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 30, color: 'var(--text)', margin: 0, letterSpacing: -0.5 }}>
            Forgot Password?
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '6px 0 0', fontSize: 13 }}>We&apos;ll send a reset link to your email</p>
        </div>

        {submitted ? (
          <div style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 24, padding: 32, textAlign: 'center', boxShadow: 'var(--shadow)' }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'var(--accent-soft)',
                border: '2px solid var(--accent-glow)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                margin: '0 auto 20px',
                color: 'var(--accent)',
                fontWeight: 900,
              }}
            >
              MAIL
            </div>

            <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, color: 'var(--text)', fontSize: 20, margin: '0 0 10px' }}>
              Check Your Inbox
            </h3>

            <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.7, margin: '0 0 8px' }}>
              We&apos;ve sent a password reset link to:
            </p>
            <div style={{ fontWeight: 800, color: 'var(--accent)', fontSize: 15, margin: '0 0 6px', wordBreak: 'break-all' }}>{email}</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.6, margin: '0 0 28px' }}>
              The link expires in <strong style={{ color: 'var(--yellow)' }}>1 hour</strong>. Check your spam folder if needed.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setEmail('');
                }}
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text-muted)',
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                Resend to a different email
              </button>
              <Link to="/login" style={{ textDecoration: 'none' }}>
                <button
                  type="button"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 14,
                    border: 'none',
                    background: 'var(--button-primary-gradient)',
                    color: 'var(--button-primary-text)',
                    fontWeight: 800,
                    fontSize: 14,
                    boxShadow: 'var(--shadow)',
                  }}
                >
                  Back to Login
                </button>
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 24, padding: 28, boxShadow: 'var(--shadow)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.7, margin: '0 0 24px' }}>
              Enter the email address linked to your KhataNest account and we&apos;ll send you a secure reset link.
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                  Email Address
                </label>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ali@hostel.com" required autoFocus />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: 14,
                  border: 'none',
                  background: 'var(--button-primary-gradient)',
                  color: 'var(--button-primary-text)',
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: 'var(--shadow)',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <Link to="/login" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>
                Back to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
