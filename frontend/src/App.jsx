import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmDialog';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import LeadDetail from './pages/LeadDetail';
import Quotes from './pages/Quotes';
import QuoteDetail from './pages/QuoteDetail';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import Crew from './pages/Crew';
import Trucks from './pages/Trucks';
import Equipment from './pages/Equipment';
import Storage from './pages/Storage';
import Invoices from './pages/Invoices';
import Claims from './pages/Claims';
import Settings from './pages/Settings';
import AITools from './pages/AITools';
import AIAdvanced from './pages/AIAdvanced';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ConfirmProvider>
          <BrowserRouter>
            <ToastProvider />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route
                path="/*"
                element={
                  <PrivateRoute>
                    <Layout>
                      <ErrorBoundary>
                        <Routes>
                          <Route path="/" element={<Dashboard />} />
                          <Route path="/leads" element={<Leads />} />
                          <Route path="/leads/:id" element={<LeadDetail />} />
                          <Route path="/quotes" element={<Quotes />} />
                          <Route path="/quotes/:id" element={<QuoteDetail />} />
                          <Route path="/jobs" element={<Jobs />} />
                          <Route path="/jobs/:id" element={<JobDetail />} />
                          <Route path="/crew" element={<Crew />} />
                          <Route path="/trucks" element={<Trucks />} />
                          <Route path="/equipment" element={<Equipment />} />
                          <Route path="/storage" element={<Storage />} />
                          <Route path="/invoices" element={<Invoices />} />
                          <Route path="/claims" element={<Claims />} />
                          <Route path="/settings" element={<Settings />} />
                          <Route path="/ai-tools" element={<AITools />} />
                          <Route path="/ai-advanced" element={<AIAdvanced />} />
                        </Routes>
                      </ErrorBoundary>
                    </Layout>
                  </PrivateRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </ConfirmProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
