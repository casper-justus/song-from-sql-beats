import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children?: React.ReactNode; // Allow children to be passed for specific layouts
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    // You can render a loading spinner here if you have one
    return <div>Loading authentication state...</div>;
  }

  if (!session) {
    // User not authenticated, redirect to login page
    // Pass the current location to redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // User is authenticated, render the child components
  // Outlet is used if this is a wrapper route for nested routes
  // Children is used if specific components are passed directly
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
