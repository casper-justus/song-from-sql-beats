// src/contexts/Auth0Context.tsx

import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth0, Auth0ContextInterface } from '@auth0/auth0-react';
// Make sure you have @auth0/auth0-react installed and updated:
// npm install @auth0/auth0-react@latest

// 1. Define the interface for your custom Auth0 context's properties.
//    Crucially, we're extending Auth0ContextInterface from @auth0/auth0-react
//    to ensure all the standard properties (like isAuthenticated, isLoading, loginWithRedirect, error)
//    are correctly included.
interface Auth0ContextProps extends Auth0ContextInterface {
  // If you add any custom properties to your context beyond what useAuth0 provides, define them here.
  // For example:
  // myCustomFunction: () => void;
}

// 2. Create the context with an initial undefined value.
const Auth0Context = createContext<Auth0ContextProps | undefined>(undefined);

// 3. Create the provider component that will wrap your application.
export const Auth0Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Use the useAuth0 hook from @auth0/auth0-react
  // This hook provides all the necessary authentication state and functions.
  const auth0 = useAuth0();

  // The value provided to the context should be the entire object returned by useAuth0.
  // This ensures that all properties and methods (including 'error' and the correctly typed 'loginWithRedirect')
  // are available to consumers of your custom context.
  return (
    <Auth0Context.Provider value={auth0 as Auth0ContextProps}>
      {children}
    </Auth0Context.Provider>
  );
};

// 4. Create the custom hook to consume the context.
export const useAuth = () => {
  const context = useContext(Auth0Context);
  if (context === undefined) {
    throw new Error('useAuth must be used within an Auth0Provider');
  }
  return context;
};