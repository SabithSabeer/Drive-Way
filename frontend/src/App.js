// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import SignupPage from './components/signup';
import Dashboard from './components/Dashboard';
import Landing from './components/landing';
import PricePrediction from './components/predict';
import VehicleMarketplace from './components/carpredict';
import { AuthProvider, useAuth } from './context/AuthContext';
import AdminDashboard from './components/AdminDashboard'; 
import AddBuyer from './components/AddBuyer';
import AddSeller from './components/AddSellerTe';
import SellerDash from './components/SellerDash';
import './App.css';

// Protected route component for regular users
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

// Protected route component for admin users
function AdminRoute({ children }) {
  const { user } = useAuth();
  // Redirect to login if not authenticated, or to dashboard if not admin
  if (!user) {
    return <Navigate to="/login" />;
  }
  if (user.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }
  return children;
}

// Component to handle redirection after login based on user role
function RoleBasedRedirect() {
  const { user } = useAuth();
  
  if (user.role === 'admin') {
    return <Navigate to="/AdminDashboard" replace />;
  } else {
    return <Navigate to="/dashboard" replace />;
  }
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Default Landing Page */}
            <Route path="/" element={<Landing />} />

            {/* Auth Routes */}
            <Route path="/LoginPage" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Redirect after login based on role */}
            <Route path="/redirect" element={<RoleBasedRedirect />} />

            {/* Price Prediction Page (public) */}
            <Route path="/predict" element={<PricePrediction />} />
            <Route path="/carpredict" element={<VehicleMarketplace />} />

            <Route path="/seller-dash" element={<SellerDash />} />


            {/* Protected Admin Dashboard */}
            <Route
              path="/AdminDashboard"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />

            <Route path="/add-buyer" element={<AddBuyer />} />
            <Route path="/add-seller" element={<AddSeller />} />
            

            {/* Protected Dashboard for regular users */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Optional: Explicit landing route */}
            <Route path="/landing" element={<Landing />} />

            {/* Catch-all route (redirect unknown paths to landing) */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;