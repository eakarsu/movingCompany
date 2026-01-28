import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
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
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <Layout>
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
                  </Routes>
                </Layout>
              </PrivateRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
