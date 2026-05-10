import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        {/*
          WebSocketProvider must live ABOVE the routes. If it sits inside each
          route element, navigating between Dashboard and Reports unmounts the
          provider, kills the WebSocket, and wipes the transactions list — so
          Reports always renders with an empty count.
          The provider internally no-ops when there's no auth token, which is
          what /login needs.
        */}
        <WebSocketProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/:boothId"
              element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              }
            />
          </Routes>
        </WebSocketProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
