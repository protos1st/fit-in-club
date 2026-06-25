import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/AuthContext';
import { SocketProvider } from './lib/SocketContext';
import { ToastProvider } from './lib/ToastContext';
import AppShell from './components/AppShell';
import AuthPage from './pages/AuthPage';
import MySchedulePage from './pages/MySchedulePage';
import DiscoverPage from './pages/DiscoverPage';
import RequestsPage from './pages/RequestsPage';
import ConnectionsPage from './pages/ConnectionsPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import OnboardingPage from './pages/OnboardingPage';
import BlockedPage from './pages/BlockedPage';
import AdminPage from './pages/AdminPage';

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="spinner-text spinner-text-centered">Loading…</div>;
  }

  if (!user) {
    return (
      <ToastProvider>
        <AuthPage />
      </ToastProvider>
    );
  }

  if (!user.onboarded) {
    return (
      <ToastProvider>
        <OnboardingPage />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <SocketProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<MySchedulePage />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/requests" element={<RequestsPage />} />
            <Route path="/connections" element={<ConnectionsPage />} />
            <Route path="/connections/:userId" element={<ChatPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/blocked" element={<BlockedPage />} />
            <Route path="/find" element={<Navigate to="/discover" replace />} />
            <Route path="/live" element={<Navigate to="/discover" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </SocketProvider>
    </ToastProvider>
  );
}

export default function App() {
  if (window.location.pathname === '/admin') {
    return <AdminPage />;
  }
  return <ProtectedRoutes />;
}
