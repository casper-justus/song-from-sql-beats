
import React, { createContext, useContext, ReactNode } from 'react';

// Define a basic interface for Auth0 context without importing the package
interface CustomAuthContextInterface {
  loginWithRedirect: (options?: any) => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
}

// Create the context
const Auth0Context = createContext<CustomAuthContextInterface | undefined>(undefined);

// Basic Auth0Provider that doesn't use the actual Auth0 SDK
export const Auth0Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const contextValue: CustomAuthContextInterface = {
    loginWithRedirect: async (options?: any) => {
      console.warn('Auth0 is not properly configured. Please install @auth0/auth0-react if you want to use Auth0.');
      console.log('Login options:', options);
    },
    isLoading: false,
    isAuthenticated: false,
    error: null,
  };

  return (
    <Auth0Context.Provider value={contextValue}>
      {children}
    </Auth0Context.Provider>
  );
};

// Custom useAuth hook
export const useAuth = () => {
  const context = useContext(Auth0Context);
  if (context === undefined) {
    throw new Error('useAuth must be used within an Auth0Provider');
  }
  return context;
};
