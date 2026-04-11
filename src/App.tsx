import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { BrowsePage } from './pages/BrowsePage';
import { SavedDealsPage } from './pages/SavedDealsPage';
import { PreferencesPage } from './pages/PreferencesPage';
import { AdminPage } from './pages/AdminPage';
import { LandingPage } from './pages/LandingPage';
import { PricingPage } from './pages/PricingPage';
import { useAuth } from './hooks/useAuth';

function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const isPublicPage = ['/login', '/signup', '/pricing', '/'].includes(location.pathname);
  const isLandingPage = location.pathname === '/' && !user;

  return (
    <div className="min-h-screen bg-gray-900">
      {user && !isPublicPage && <Navbar />}
      {user && location.pathname === '/pricing' && <Navbar />}
      <Routes>
        {/* Public routes */}
        <Route path="/" element={user ? <Navigate to="/browse" replace /> : <LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected routes */}
        <Route path="/browse" element={<ProtectedRoute><BrowsePage /></ProtectedRoute>} />
        <Route path="/saved" element={<ProtectedRoute><SavedDealsPage /></ProtectedRoute>} />
        <Route path="/preferences" element={<ProtectedRoute><PreferencesPage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppLayout />
      </Router>
    </AuthProvider>
  );
}

export default App;import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { BrowsePage } from './pages/BrowsePage';
import { SavedDealsPage } from './pages/SavedDealsPage';
import { PreferencesPage } from './pages/PreferencesPage';
import { AdminPage } from './pages/AdminPage';
import { useAuth } from './hooks/useAuth';

function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  return (
    <div className="bg-gray-900">
      {user && !isAuthPage && <Navbar />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/browse" element={<ProtectedRoute><BrowsePage /></ProtectedRoute>} />
        <Route path="/saved" element={<ProtectedRoute><SavedDealsPage /></ProtectedRoute>} />
        <Route path="/preferences" element={<ProtectedRoute><PreferencesPage /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
        <Route path="/" element={<Navigate to="/browse" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppLayout />
      </Router>
    </AuthProvider>
  );
}

export default App;
