import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import ThemeToggleButton from '../components/ThemeToggleButton';

const Input = ({ label, wrapperClassName = '', ...props }) => (
  <div className={`auth-form__field ${wrapperClassName}`.trim()}>
    <label className="auth-form__label">{label}</label>
    <input {...props} className="auth-form__input" />
  </div>
);

const LoginPage = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const toggleMode = () => {
    setIsRegister((current) => !current);
    setShowPassword(false);
    setLoading(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!email || !password) {
      toast.error('Please fill all fields');
      return;
    }

    if (isRegister && password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        if (!form.firstName || !form.lastName) {
          toast.error('Please enter your full name');
          return;
        }

        if (!agreed) {
          toast.error('Please accept the terms to continue');
          return;
        }

        await register({
          name: `${form.firstName} ${form.lastName}`.trim(),
          email,
          password,
        });

        toast.success('Account created! Create or join a group to get started');
        navigate('/groups');
        return;
      }

      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-shell__glow auth-shell__glow--left" />
      <div className="auth-shell__glow auth-shell__glow--right" />
      <ThemeToggleButton style={{ position: 'absolute', top: 20, right: 20, zIndex: 3 }} />

      <div className="auth-card">
        <aside className="auth-showcase">
          <div className="auth-showcase__logo-panel">
            <div className="auth-showcase__brand auth-showcase__brand--solo">
              <div className="auth-showcase__brand-mark">K</div>
              <div className="auth-showcase__logo-copy">
                <div className="auth-showcase__logo-wordmark">KhataNest</div>
                <div className="auth-showcase__logo-subtitle">Shared expense management</div>
              </div>
            </div>
          </div>
        </aside>

        <section className="auth-panel">
          <div className="auth-panel__surface">
            <div className="auth-panel__head">
              <div className="auth-panel__eyebrow">{isRegister ? 'Create an account' : 'Welcome back'}</div>
              <h1 className="auth-panel__title">{isRegister ? 'Create your account' : 'Login to KhataNest'}</h1>
              <p className="auth-panel__subtitle">
                {isRegister ? 'Already have an account? ' : 'Need an account? '}
                <button
                  type="button"
                  className="auth-panel__switch"
                  onClick={toggleMode}
                >
                  {isRegister ? 'Log in' : 'Create one'}
                </button>
              </p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              {isRegister && (
                <div className="auth-form__row">
                  <Input label="First Name" type="text" placeholder="Muhammad" value={form.firstName} onChange={set('firstName')} autoComplete="given-name" required />
                  <Input label="Last Name" type="text" placeholder="Talha" value={form.lastName} onChange={set('lastName')} autoComplete="family-name" required />
                </div>
              )}

              <Input label="Email" type="email" placeholder="name@hostel.com" value={form.email} onChange={set('email')} autoComplete="email" required />

              <div className="auth-form__field">
                <label className="auth-form__label">Password</label>
                <div className="auth-form__password">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={set('password')}
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                    required
                    className="auth-form__input auth-form__input--password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    className="auth-form__password-toggle"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>

                {!isRegister && (
                  <div className="auth-form__meta">
                    <Link to="/forgot-password" className="auth-form__forgot">
                      Forgot password?
                    </Link>
                  </div>
                )}
              </div>

              {isRegister && (
                <label className="auth-form__check">
                  <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
                  <span>
                    I agree to the <span className="auth-form__check-link">terms & conditions</span>
                  </span>
                </label>
              )}

              <button type="submit" disabled={loading} className="auth-form__submit">
                {loading ? 'Please wait...' : isRegister ? 'Create account' : 'Login to KhataNest'}
              </button>

              <p className="auth-panel__microcopy">
                {isRegister
                  ? 'Start by creating your account, then create or join a group.'
                  : 'Your balances, payments, and expense history stay in sync.'}
              </p>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LoginPage;
