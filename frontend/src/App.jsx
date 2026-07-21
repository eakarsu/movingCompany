import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './context/AuthContext';
import LegalDocuments from './pages/LegalDocuments';
import Login from './pages/Login';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="min-h-screen grid place-items-center bg-slate-950 text-slate-200">Checking session…</div>;
  }
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/legal-documents" element={<PrivateRoute><LegalDocuments /></PrivateRoute>} />
            <Route path="/" element={<Navigate to="/legal-documents" replace />} />
            <Route path="*" element={<Navigate to="/legal-documents" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
