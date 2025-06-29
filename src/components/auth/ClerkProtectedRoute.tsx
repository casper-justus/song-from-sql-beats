
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

const ClerkProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isSignedIn, isLoaded } = useUser();
  const location = useLocation();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
        <div className="flex flex-col items-center text-white text-lg">
          <svg className="animate-spin h-8 w-8 text-white mb-3" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading authentication...
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ClerkProtectedRoute;
