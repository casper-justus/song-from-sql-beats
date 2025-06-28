// src/contexts/Auth0Context.tsx

import React, { createContext, useContext, ReactNode } from 'react';
import {
  useAuth0,
  Auth0ContextInterface,
  Auth0ProviderOptions, // Import Auth0ProviderOptions for type safety
  Auth0Provider as Auth0ProviderFromSDK // Rename the SDK's provider to avoid conflict
} from '@auth0/auth0-react';

// 1. Define the interface for your custom Auth0 context's properties.
//    This extends the SDK's interface, ensuring all standard properties are included.
interface CustomAuthContextInterface extends Auth0ContextInterface {
  // Add any custom properties/methods you might want to expose via your useAuth hook here
}

// 2. Define the props for YOUR custom Auth0Provider component.
//    It should accept all the standard Auth0ProviderOptions from the SDK, plus children.
interface CustomAuth0ProviderProps extends Auth0ProviderOptions {
  children: ReactNode;
}

// 3. Create the context that your `useAuth` hook will consume.
//    Its value will be of type CustomAuthContextInterface.
const Auth0Context = createContext<CustomAuthContextInterface | undefined>(undefined);

// 4. YOUR custom Auth0Provider component.
//    This component will act as a wrapper. It receives the Auth0 configuration
//    props and passes them directly to the Auth0Provider from the SDK.
export const Auth0Provider: React.FC<CustomAuth0ProviderProps> = ({ children, ...auth0ProviderOptions }) => {
  return (
    // Render the Auth0Provider from the SDK, passing all its options.
    // This is where the domain, clientId, authorizationParams, etc., are actually consumed.
    <Auth0ProviderFromSDK {...auth0ProviderOptions}>
      {/*
        Now, within the scope of the SDK's Auth0Provider, we can create our internal context.
        The `useAuth0()` hook (called inside Auth0InternalContextProvider) will now correctly
        have access to the Auth0 state and functions.
      */}
      <Auth0InternalContextProvider>
        {children}
      </Auth0InternalContextProvider>
    </Auth0ProviderFromSDK>
  );
};

// 5. Internal component to provide the context value for your `useAuth` hook.
//    This component exists solely to call `useAuth0()` within the correct scope
//    (i.e., as a child of Auth0ProviderFromSDK) and provide its result to your custom context.
const Auth0InternalContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const auth0 = useAuth0(); // This call must be inside Auth0ProviderFromSDK's children
  return (
    <Auth0Context.Provider value={auth0 as CustomAuthContextInterface}>
      {children}
    </Auth0Context.Provider>
  );
};

// 6. Your custom `useAuth` hook to consume the context.
export const useAuth = () => {
  const context = useContext(Auth0Context);
  if (context === undefined) {
    throw new Error('useAuth must be used within an Auth0Provider'); // Refers to YOUR custom Auth0Provider
  }
  return context;
};