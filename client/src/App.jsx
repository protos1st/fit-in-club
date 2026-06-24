import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/AuthContext';
import { SocketProvider } from './lib/SocketContext';
import { ToastProvider } from './lib/ToastContext';
import AppShell from './components/AppShell';
import AuthPage from './pages/AuthPage';
import MySchedulePage from './pages/MySchedulePage';
import FindBuddiesPage from './pages/FindBuddiesPage';
import LiveNowPage from './pages/LiveNowPage';
import RequestsPage from './pages/RequestsPage';
import ConnectionsPage from './pages/ConnectionsPage';
import ChatPage from './pages/ChatPage';

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

  return (
    <ToastProvider>
      <SocketProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<MySchedulePage />} />
            <Route path="/find" element={<FindBuddiesPage />} />
            <Route path="/live" element={<LiveNowPage />} />
            <Route path="/requests" element={<RequestsPage />} />
            <Route path="/connections" element={<ConnectionsPage />} />
            <Route path="/connections/:userId" element={<ChatPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </SocketProvider>
    </ToastProvider>
  );
}

export default function App() {
  return <ProtectedRoutes />;
}
