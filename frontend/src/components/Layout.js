import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GroupSwitcher from './GroupSwitcher';
import ThemeToggleButton from './ThemeToggleButton';
import Modal from './Modal';
import toast from 'react-hot-toast';
import { alpha } from '../theme';

const NAV_ITEMS = [
  { path: '/dashboard',      icon: '\u25C8', label: 'Dashboard' },
  { path: '/groups',         icon: '\u{1F3D8}\uFE0F', label: 'Groups' },
  { path: '/expenses',       icon: '\u{1F9FE}', label: 'Expenses' },
  { path: '/payments',       icon: '\u{1F4B5}', label: 'Payments' },
  { path: '/balances',       icon: '\u2696\uFE0F', label: 'Balances' },
  { path: '/history',        icon: '\u{1F4DC}', label: 'History' },
  { path: '/members',        icon: '\u{1F465}', label: 'Members', adminOnly: true },
  { path: '/group-requests', icon: '\u2709\uFE0F', label: 'Requests', adminOnly: true },
  { path: '/my-requests',    icon: '\u{1F4E9}', label: 'My Requests', memberOnly: true },
];

export const Avatar = ({ name, size = 36, color = 'var(--accent)' }) => {
  const initials = name?.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase() || '?';
  const outerRadius = Math.max(12, Math.round(size * 0.34));
  const inset = Math.max(2, Math.round(size * 0.08));
  const innerRadius = Math.max(10, outerRadius - inset);
  const accentDot = Math.max(4, Math.round(size * 0.14));

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: outerRadius,
        padding: inset,
        background: `linear-gradient(145deg, ${alpha(color, 36)}, ${alpha(color, 10)})`,
        border: `1px solid ${alpha(color, 34)}`,
        boxShadow: `0 12px 28px ${alpha(color, 18)}`,
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: innerRadius,
          background: `radial-gradient(circle at 22% 18%, ${alpha(color, 18)}, transparent 44%), linear-gradient(160deg, var(--surface-elevated), var(--surface))`,
          border: `1px solid ${alpha(color, 22)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <span
          style={{
            fontSize: size * 0.31,
            fontWeight: 900,
            color,
            letterSpacing: '-0.08em',
            lineHeight: 1,
            fontFamily: "'JetBrains Mono', monospace",
            textTransform: 'uppercase',
            textShadow: `0 0 18px ${alpha(color, 18)}`,
            transform: 'translateX(-0.02em)',
          }}
        >
          {initials}
        </span>

        <span
          style={{
            position: 'absolute',
            top: inset + 1,
            right: inset + 1,
            width: accentDot,
            height: accentDot,
            borderRadius: 999,
            background: color,
            boxShadow: `0 0 0 ${Math.max(3, Math.round(size * 0.06))}px ${alpha(color, 12)}, 0 0 12px ${alpha(color, 28)}`,
          }}
        />
      </div>
    </div>
  );
};

const BrandMark = ({ small = false }) => (
  <div
    style={{
      width: small ? 32 : 36,
      height: small ? 32 : 36,
      borderRadius: small ? 10 : 12,
      background: 'linear-gradient(135deg, #2ECC9A, #1A7A5C)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: small ? 16 : 18,
      fontWeight: 900,
      color: '#000',
      boxShadow: 'var(--shadow)',
      flexShrink: 0,
    }}
  >
    K
  </div>
);

const NavItem = ({ item, active, collapsed = false, onClick }) => (
  <Link to={item.path} onClick={onClick} style={{ textDecoration: 'none' }}>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: collapsed ? '11px 14px' : '11px 14px',
        borderRadius: 10,
        marginBottom: 3,
        cursor: 'pointer',
        background: active ? 'var(--accent-soft)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-muted)',
        borderLeft: `3px solid ${active ? 'var(--accent)' : 'transparent'}`,
        fontWeight: active ? 700 : 500,
        fontSize: 14,
        whiteSpace: 'nowrap',
        transition: 'transform .18s ease, background-color .18s ease, border-color .18s ease, color .18s ease',
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 17,
          flexShrink: 0,
        }}
      >
        {item.icon}
      </span>
      {!collapsed && <span>{item.label}</span>}
    </div>
  </Link>
);

const InfoTile = ({ label, value, tone = 'default' }) => {
  return (
    <div className={`profile-tile profile-tile--${tone}`}>
      <div className="profile-tile__label">{label}</div>
      <div className="profile-tile__value">{value}</div>
    </div>
  );
};

const UserProfileModal = ({ isOpen, onClose, user, activeGroupName, groupCount }) => {
  if (!user) return null;

  const shareRemaining = Math.max(0, (user.adminShareOwed || 0) - (user.adminSharePaid || 0));
  const balanceTone = (user.balance || 0) >= 0 ? 'positive' : 'danger';
  const shareTone = shareRemaining > 0 ? 'danger' : 'positive';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="My Profile" maxWidth={560} className="profile-modal">
      <div className="profile-modal__hero">
        <div className="profile-modal__identity">
          <Avatar name={user.name} size={64} />
          <div className="profile-modal__copy">
            <div className="profile-modal__name">{user.name}</div>
            <div className="profile-modal__email">{user.email || 'No email available'}</div>
            <div className={`profile-modal__role profile-modal__role--${user.role === 'admin' ? 'admin' : 'member'}`}>
              {user.role || 'member'}
            </div>
          </div>
        </div>
        <div className={`profile-modal__balance profile-modal__balance--${balanceTone}`}>
          <div className="profile-modal__balance-label">Current Balance</div>
          <div className="profile-modal__balance-value">Rs. {(user.balance || 0).toLocaleString()}</div>
        </div>
      </div>

      <div className="profile-modal__tiles">
        <InfoTile label="Active Group" value={activeGroupName || 'No active group'} tone="info" />
        <InfoTile label="Groups Joined" value={String(groupCount || 0)} />
        <InfoTile label="Current Balance" value={`Rs. ${(user.balance || 0).toLocaleString()}`} tone={balanceTone} />
        <InfoTile label="My Share Remaining" value={`Rs. ${shareRemaining.toLocaleString()}`} tone={shareTone} />
      </div>

      <div className="profile-modal__summary">
        <div className="profile-modal__summary-label">
          Payment Summary
        </div>
        <div className="profile-modal__summary-grid">
          <div className="profile-modal__summary-item">
            <div className="profile-modal__summary-item-label">Share Owed</div>
            <div className="profile-modal__summary-item-value">Rs. {(user.adminShareOwed || 0).toLocaleString()}</div>
          </div>
          <div className="profile-modal__summary-item">
            <div className="profile-modal__summary-item-label">Share Paid</div>
            <div className="profile-modal__summary-item-value profile-modal__summary-item-value--accent">
              Rs. {(user.adminSharePaid || 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

const Layout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isCompactMobile, setIsCompactMobile] = useState(window.innerWidth <= 480);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, logout, isAdmin, activeGroupId, activeGroup, myGroups } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const mobile = width <= 768;
      setIsMobile(mobile);
      setIsCompactMobile(width <= 480);
      if (mobile) {
        setCollapsed(false);
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const visibleNav = NAV_ITEMS.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.memberOnly && isAdmin) return false;
    return true;
  });

  const currentPage = visibleNav.find((item) => location.pathname === item.path)?.label || 'SplitNest';

  const topBalancePositive = (user?.balance || 0) >= 0;
  const balanceBg = topBalancePositive ? 'var(--accent-soft)' : 'var(--red-soft)';
  const balanceFg = topBalancePositive ? 'var(--accent)' : 'var(--red)';
  const balanceBorder = topBalancePositive ? 'var(--accent-glow)' : 'rgba(255,92,106,0.3)';
  const activeGroupName = activeGroup?.groupId?.name || activeGroup?.name || 'No active group';

  if (isMobile && mobileMenuOpen) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <header
          style={{
            height: 64,
            background: 'var(--surface-alt)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            position: 'sticky',
            top: 0,
            zIndex: 60,
            boxShadow: 'var(--shadow)',
          }}
        >
          <button onClick={() => setMobileMenuOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 22 }}>
            x
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BrandMark small />
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, color: 'var(--text)' }}>SplitNest</span>
          </div>

          <ThemeToggleButton compact />
        </header>

        <nav style={{ padding: 16 }}>
          {visibleNav.map((item) => (
            <NavItem key={item.path} item={item} active={location.pathname === item.path} onClick={() => setMobileMenuOpen(false)} />
          ))}
        </nav>

        {user && (
          <div style={{ position: 'fixed', left: 16, right: 16, bottom: 20 }}>
            <div
              style={{
                padding: 16,
                borderRadius: 18,
                background: 'var(--accent-soft)',
                border: '1px solid var(--accent-glow)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  textAlign: 'left',
                }}
              >
                <Avatar name={user.name} size={40} />
                <div>
                  <div style={{ fontWeight: 800, color: 'var(--text)' }}>{user.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase' }}>
                    {user.role || 'member'}
                  </div>
                </div>
              </button>

              <button
                onClick={handleLogout}
                style={{
                  padding: '8px 16px',
                  borderRadius: 999,
                  background: 'var(--red-soft)',
                  border: '1px solid rgba(255,92,106,0.3)',
                  color: 'var(--red)',
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                Logout
              </button>
            </div>
          </div>
          )}
        <UserProfileModal
          isOpen={profileOpen}
          onClose={() => setProfileOpen(false)}
          user={user}
          activeGroupName={activeGroupName}
          groupCount={myGroups?.length || 0}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', fontFamily: "'DM Sans', sans-serif" }}>
      {!isMobile && (
        <aside
          style={{
            width: collapsed ? 84 : 248,
            flexShrink: 0,
            background: 'var(--surface-alt)',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            padding: '0 0 24px',
            transition: 'width .28s ease',
            position: 'sticky',
            top: 0,
            height: '100vh',
            overflow: 'hidden',
            zIndex: 50,
            boxShadow: 'var(--shadow)',
          }}
        >
          <div style={{ padding: collapsed ? '20px 18px' : '22px 20px', borderBottom: '1px solid var(--border)', marginBottom: 10 }}>
            {collapsed ? (
              <BrandMark small />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <BrandMark />
                <div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 18, color: 'var(--text)', letterSpacing: -0.5 }}>
                    SplitNest
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase' }}>
                    SHARED FINANCE
                  </div>
                </div>
              </div>
            )}
          </div>

          <nav style={{ flex: 1, padding: '0 10px', overflowY: 'auto' }}>
            {visibleNav.map((item) => (
              <NavItem key={item.path} item={item} active={location.pathname === item.path} collapsed={collapsed} />
            ))}
          </nav>

          {!collapsed && user && (
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              style={{
                margin: '0 10px',
                padding: 14,
                width: 'calc(100% - 20px)',
                borderRadius: 18,
                background: 'var(--accent-soft)',
                border: '1px solid var(--accent-glow)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={user.name} size={36} />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: 'var(--text)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {user.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase' }}>
                    {user.role || 'member'}
                  </div>
                </div>
              </div>
            </button>
          )}
        </aside>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header
          style={{
            height: isMobile ? 64 : 68,
            background: 'var(--surface-alt)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: isCompactMobile ? '0 12px' : isMobile ? '0 16px' : '0 24px',
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            zIndex: 40,
            gap: 12,
            boxShadow: 'var(--shadow)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12 }}>
            <button
              onClick={() => (isMobile ? setMobileMenuOpen(true) : setCollapsed((current) => !current))}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
                fontSize: 16,
                padding: '8px 10px',
                borderRadius: 12,
                boxShadow: 'var(--shadow)',
              }}
            >
              |||
            </button>

            <div style={{ fontSize: isMobile ? 13 : 14, color: 'var(--text-muted)' }}>
              <span style={{ color: 'var(--text)', fontWeight: 800 }}>{currentPage}</span>
              {!isMobile && <span> | SplitNest</span>}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 10 }}>
            {!isMobile && <GroupSwitcher />}

            {user && !isMobile && (
              <div
                style={{
                  padding: '6px 12px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 800,
                  background: balanceBg,
                  color: balanceFg,
                  border: `1px solid ${balanceBorder}`,
                }}
              >
                {(user.balance || 0) >= 0 ? '+' : ''}Rs. {(user.balance || 0).toLocaleString()}
              </div>
            )}

            <ThemeToggleButton compact={isMobile} />

            {!isMobile && (
              <button
                onClick={handleLogout}
                style={{
                  padding: '8px 14px',
                  borderRadius: 999,
                  border: '1px solid rgba(255,92,106,0.3)',
                  background: 'var(--red-soft)',
                  color: 'var(--red)',
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                Logout
              </button>
            )}
          </div>
        </header>

        <main style={{ flex: 1, padding: isCompactMobile ? 12 : isMobile ? 16 : 24, overflowY: 'auto', maxWidth: '100%' }} className="page-enter">
          {isMobile && activeGroupId && (
            <div
              style={{
                marginBottom: 14,
                padding: isCompactMobile ? '10px 12px' : '12px 14px',
                borderRadius: 16,
                border: '1px solid var(--border)',
                background: 'linear-gradient(180deg, var(--surface-alt), var(--surface))',
                display: 'grid',
                gap: 10,
                boxShadow: 'var(--shadow)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Active Group
                </div>
                {user && (
                  <div
                    style={{
                      padding: '6px 10px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 800,
                      background: balanceBg,
                      color: balanceFg,
                      border: `1px solid ${balanceBorder}`,
                    }}
                  >
                    {(user.balance || 0) >= 0 ? '+' : ''}Rs. {(user.balance || 0).toLocaleString()}
                  </div>
                )}
              </div>
              <GroupSwitcher />
            </div>
          )}

          {!activeGroupId && location.pathname !== '/groups' && (
            <div
              style={{
                marginBottom: 20,
                padding: isCompactMobile ? '12px 14px' : '14px 18px',
                borderRadius: 18,
                background: 'var(--banner-soft)',
                border: '1px solid var(--accent-ring)',
                display: 'flex',
                alignItems: isMobile ? 'flex-start' : 'center',
                gap: 10,
                flexWrap: 'wrap',
                boxShadow: 'var(--shadow)',
              }}
            >
              <span style={{ fontSize: 18, color: 'var(--accent)', fontWeight: 900 }}>!</span>
              <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 700, flex: 1 }}>
                You have no active group. Create or join one to get started.
              </span>
              <Link
                to="/groups"
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: 'var(--accent)',
                  textDecoration: 'none',
                  background: 'var(--accent-soft)',
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: '1px solid var(--accent-ring)',
                  width: isCompactMobile ? '100%' : 'auto',
                  textAlign: 'center',
                }}
              >
                Browse Groups ->
              </Link>
            </div>
          )}

          {children}
        </main>
      </div>
      <UserProfileModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        user={user}
        activeGroupName={activeGroupName}
        groupCount={myGroups?.length || 0}
      />
    </div>
  );
};

export default Layout;
