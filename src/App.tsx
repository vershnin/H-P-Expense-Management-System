import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import SignUpPage from './pages/auth/signup';
import Dashboard from './pages/AdminDashboard';
import './App.css';
import { User } from 'lucide-react';
import { logout } from './api/auth';

// Component to handle authenticated user redirects
const AuthenticatedRedirect: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null; // Let the loading be handled by individual components
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
};

// Main App component with routes
const AppRoutes: React.FC = () => {
  const { login } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage onLogin={login} />} />
      <Route path="/signup" element={<SignUpPage />} />
      
      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      
      {/* Admin only routes */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute requiredRole={['admin']}>
            <AdminRoutes />
          </ProtectedRoute>
        }
      />
      
      {/* Finance routes */}
      <Route
        path="/finance/*"
        element={
          <ProtectedRoute requiredRole={['admin', 'finance']}>
            <FinanceRoutes />
          </ProtectedRoute>
        }
      />
      
      {/* Branch routes */}
      <Route
        path="/branch/*"
        element={
          <ProtectedRoute requiredRole={['admin', 'finance', 'branch']}>
            <BranchRoutes />
          </ProtectedRoute>
        }
      />
      
      {/* Auditor routes */}
      <Route
        path="/audit/*"
        element={
          <ProtectedRoute requiredRole={['admin', 'auditor']}>
            <AuditRoutes />
          </ProtectedRoute>
        }
      />
      
      {/* Default redirect */}
      <Route path="/" element={<AuthenticatedRedirect />} />
      
      {/* 404 route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

// Placeholder components for different role-based routes
const AdminRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<div>Admin Dashboard</div>} />
      <Route path="/users" element={<div>User Management</div>} />
      <Route path="/settings" element={<div>System Settings</div>} />
    </Routes>
  );
};

const FinanceRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<div>Finance Dashboard</div>} />
      <Route path="/reports" element={<div>Financial Reports</div>} />
      <Route path="/budgets" element={<div>Budget Management</div>} />
    </Routes>
  );
};

const BranchRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<div>Branch Dashboard</div>} />
      <Route path="/transactions" element={<div>Branch Transactions</div>} />
      <Route path="/inventory" element={<div>Inventory Management</div>} />
    </Routes>
  );
};

const AuditRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<div>Audit Dashboard</div>} />
      <Route path="/reports" element={<div>Audit Reports</div>} />
      <Route path="/compliance" element={<div>Compliance Checks</div>} />
    </Routes>
  );
};

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/20">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-muted-foreground mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Page Not Found</h2>
        <p className="text-muted-foreground mb-6">
          The page you're looking for doesn't exist.
        </p>
        <a
          href="/"
          className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Go Home
        </a>
      </div>
    </div>
  );
};

// Main App component
const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <AppRoutes />
        </div>
      </AuthProvider>
    </Router>
  );
};

export default App;