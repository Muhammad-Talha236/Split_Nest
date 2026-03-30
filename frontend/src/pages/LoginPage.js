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
  const heroHighlights = [
    'Split rent, utilities, and groceries without messy chats.',
    'Track who paid, who owes, and what still needs settling.',
    'Keep one clean shared ledger for your whole group.',
  ];
  const heroStats = [
    { value: '24/7', label: 'Visible balances' },
    { value: '3 taps', label: 'Add a payment' },
    { value: 'Zero', label: 'Awkward confusion' },
  ];

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
          <div className="auth-showcase__brand-row">
            <div className="auth-showcase__brand">
              <div className="auth-showcase__brand-mark">K</div>
              <div>
                <div className="auth-showcase__brand-name">KhataNest</div>
                <div className="auth-showcase__brand-copy">Shared expense management</div>
              </div>
            </div>
            <span className="auth-showcase__eyebrow">Calm money tracking for roommates</span>
          </div>

          <div className="auth-showcase__content">
            <div className="auth-showcase__copy">
              <h2 className="auth-showcase__title">A simpler way to manage shared money.</h2>
              <p className="auth-showcase__text">
                KhataNest keeps group expenses organized in one place, so everyone can see what was paid, what is due, and what comes next.
              </p>
            </div>

            <div className="auth-showcase__stats">
              {heroStats.map((item) => (
                <div key={item.label} className="auth-showcase__stat">
                  <strong className="auth-showcase__stat-value">{item.value}</strong>
                  <span className="auth-showcase__stat-label">{item.label}</span>
                </div>
              ))}
            </div>

            <div className="auth-showcase__feature-card">
              <div className="auth-showcase__feature-card-head">
                <span className="auth-showcase__feature-pill">Live ledger</span>
                <strong className="auth-showcase__feature-amount">Rs. 8,450</strong>
              </div>
              <div className="auth-showcase__feature-list">
                {heroHighlights.map((item) => (
                  <div key={item} className="auth-showcase__feature-item">
                    <span className="auth-showcase__feature-dot" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="auth-showcase__quote">
              <div className="auth-showcase__quote-title">Why it feels better</div>
              <p className="auth-showcase__quote-text">
                One clean screen for dues, expenses, and payments instead of searching old messages and screenshots.
              </p>
            </div>
          </div>

          <div className="auth-showcase__footer">
            <div className="auth-showcase__avatars">
              <span className="auth-showcase__avatar">AT</span>
              <span className="auth-showcase__avatar">MZ</span>
              <span className="auth-showcase__avatar">HK</span>
            </div>
            <p className="auth-showcase__footer-copy">
              Built for hostel rooms, flats, and small shared households.
            </p>
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
