import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/Auth0Context'; // Assuming this correctly imports your Auth0 context

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

const Auth0ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // Destructure isAuthenticated, isLoading, and error from your Auth0 context.
  // The 'error' property is crucial for handling authentication failures.
  const { isAuthenticated, isLoading, error } = useAuth();
  const location = useLocation();

  // 1. Handle loading state: Show a loading indicator while Auth0 is determining the authentication status.
  // This prevents content flickering and informs the user that something is happening.
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
        <div className="flex flex-col items-center text-white text-lg">
          {/* Simple SVG spinner for a better user experience */}
          <svg className="animate-spin h-8 w-8 text-white mb-3" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading authentication...
        </div>
      </div>
    );
  }

  // 2. Handle authentication errors: If an error occurs during Auth0's process (e.g., network issues, misconfiguration).
  // This provides immediate feedback to the user and prevents being stuck or redirected incorrectly.
  if (error) {
    console.error("Auth0 authentication error:", error); // Log the error for debugging
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-800 text-white text-lg p-4 text-center">
        Authentication Error: {error.message || "Failed to load authentication. Please try again."}
        <p className="mt-2 text-sm">Please check your internet connection or contact support.</p>
      </div>
    );
  }

  // 3. If not authenticated: Redirect the user to the login page.
  // The `state` prop is used to store the original location, so the user can be redirected back
  // to the protected route after successful login. `replace` prevents adding to the history stack.
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 4. If authenticated: Render the protected content.
  // It conditionally renders `children` (if the component wraps elements directly)
  // or `Outlet` (for nested routes defined in react-router-dom).
  return children ? <>{children}</> : <Outlet />;
};

export default Auth0ProtectedRoute;