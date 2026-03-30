import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import ThemeToggleButton from '../components/ThemeToggleButton';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const JoinPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState('loading');
  const [groupInfo, setGroupInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });

  useEffect(() => {
    const validate = async () => {
      try {
        const response = await axios.get(`${API_URL}/auth/join/${token}`);
        setGroupInfo(response.data);
        setStatus('valid');
      } catch (error) {
        const message = error.response?.data?.message || '';
        setStatus(message.includes('already been used') ? 'used' : 'invalid');
      }
    };

    validate();
  }, [token]);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password) return toast.error('Please fill all fields');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    if (form.password !== form.confirmPassword) return toast.error('Passwords do not match');

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/join/${token}`, {
        name: form.name,
        email: form.email,
        password: form.password,
      });

      const { token: jwt, user } = response.data;
      localStorage.setItem('khatanest_token', jwt);
      localStorage.setItem('khatanest_user', JSON.stringify(user));
      window.location.href = '/dashboard';
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      if (message.includes('already been used')) setStatus('used');
      else toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    );
  }

  if (status === 'invalid' || status === 'used') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ maxWidth: 420, width: '100%', textAlign: 'center', background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 24, padding: 40, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 18, color: 'var(--accent)', fontWeight: 900, marginBottom: 16 }}>{status === 'used' ? 'USED' : 'INVALID'}</div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 24, color: 'var(--text)', marginBottom: 12 }}>
            {status === 'used' ? 'Link Already Used' : 'Invalid Link'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
            {status === 'used'
              ? 'This invite link has already been used to create an account. Each link works only once.'
              : 'This invite link is invalid or expired. Please ask your group admin to generate a new one.'}
          </p>
          <button type="button" onClick={() => navigate('/login')} style={{ padding: '11px 28px', borderRadius: 14, border: 'none', background: 'var(--button-primary-gradient)', color: 'var(--button-primary-text)', fontWeight: 800, fontSize: 14, boxShadow: 'var(--shadow)' }}>
            Go to Login
          </button>
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

      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 68, height: 68, borderRadius: 20, margin: '0 auto 14px', background: 'linear-gradient(135deg, #2ECC9A, #1A7A5C)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, fontWeight: 900, color: '#000', boxShadow: '0 0 50px rgba(46,204,154,0.3)' }}>
            K
          </div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 30, color: 'var(--text)', margin: 0, letterSpacing: -1 }}>
            Join KhataNest
          </h1>

          <div style={{ marginTop: 16, padding: '12px 20px', borderRadius: 16, background: 'var(--accent-soft)', border: '1px solid var(--accent-glow)', display: 'inline-block', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>You&apos;re joining</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 17, color: 'var(--accent)' }}>{groupInfo?.groupName}</div>
            {groupInfo?.invitedBy && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Invited by {groupInfo.invitedBy}</div>}
          </div>
        </div>

        <div style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 24, padding: 28, boxShadow: 'var(--shadow)' }}>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, color: 'var(--text)', fontSize: 18, margin: '0 0 20px' }}>
            Create Your Account
          </h3>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>Full Name *</label>
            <input value={form.name} onChange={set('name')} placeholder="Ali Khan" />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>Email Address *</label>
            <input type="email" value={form.email} onChange={set('email')} placeholder="ali@example.com" />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>Password *</label>
            <div style={{ position: 'relative' }}>
              <input type={showPass ? 'text' : 'password'} value={form.password} onChange={set('password')} placeholder="Min 6 characters" style={{ width: '100%', paddingRight: 54 }} />
              <button type="button" onClick={() => setShowPass((current) => !current)} aria-label={showPass ? 'Hide password' : 'Show password'} title={showPass ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 700, fontSize: 12, padding: 0 }}>
                {showPass ? '🙈' : '🙉'}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 22 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>Confirm Password *</label>
            <input type={showPass ? 'text' : 'password'} value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="Re-enter password" style={{ width: '100%', borderColor: form.confirmPassword && form.password !== form.confirmPassword ? 'var(--accent)' : undefined }} />
            {form.confirmPassword && form.password !== form.confirmPassword && <div style={{ marginTop: 4, fontSize: 12, color: 'var(--accent)' }}>Passwords do not match</div>}
          </div>

          <button type="button" onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '13px', borderRadius: 14, border: 'none', background: 'var(--button-primary-gradient)', color: 'var(--button-primary-text)', fontWeight: 800, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, boxShadow: 'var(--shadow)' }}>
            {loading ? 'Creating Account...' : 'Join Group & Create Account'}
          </button>

          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, marginTop: 16 }}>
            Already have an account?{' '}
            <span onClick={() => navigate('/login')} style={{ color: 'var(--accent)', fontWeight: 800, cursor: 'pointer' }}>
              Login here
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default JoinPage;
