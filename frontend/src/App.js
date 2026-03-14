// App.js - Root component with routing
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import JoinPage from './pages/JoinPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import ExpensesPage from './pages/ExpensesPage';
import PaymentsPage from './pages/PaymentsPage';
import MembersPage from './pages/MembersPage';
import BalancesPage from './pages/BalancesPage';
import HistoryPage from './pages/HistoryPage';
import Spinner from './components/Spinner';

// Protected route wrapper
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, loading, isAdmin } = useAuth();

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner message="Loading KhataNest..." />
    </div>
  );

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;

  return <Layout>{children}</Layout>;
};

// Public route (redirect if logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
};

const AppRoutes = () => (
  <Routes>
    {/* Public routes */}
    <Route path="/login"           element={<PublicRoute><LoginPage /></PublicRoute>} />
    <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
    <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

    {/* Invite join page — public, no auth, no sidebar */}
    <Route path="/join/:token" element={<JoinPage />} />

    {/* Protected routes */}
    <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
    <Route path="/expenses"  element={<ProtectedRoute><ExpensesPage /></ProtectedRoute>} />
    <Route path="/payments"  element={<ProtectedRoute><PaymentsPage /></ProtectedRoute>} />
    <Route path="/members"   element={<ProtectedRoute adminOnly><MembersPage /></ProtectedRoute>} />
    <Route path="/balances"  element={<ProtectedRoute><BalancesPage /></ProtectedRoute>} />
    <Route path="/history"   element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />

    {/* Fallbacks */}
    <Route path="/"  element={<Navigate to="/dashboard" replace />} />
    <Route path="*"  element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <ThemeProvider>
        <AppRoutes />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background  : 'var(--surface-alt)',
              color       : 'var(--text)',
              border      : '1px solid var(--border)',
              borderRadius: '10px',
              fontSize    : '13px',
              fontFamily  : "'DM Sans', sans-serif",
              fontWeight  : 600,
            },
            success: { iconTheme: { primary: '#2ECC9A', secondary: '#000' } },
            error  : { iconTheme: { primary: '#FF5C6A', secondary: '#fff' } },
          }}
        />
        <style>{`
          @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
          @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
          .page-enter { animation: fadeIn .3s ease; }
        `}</style>
      </ThemeProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;