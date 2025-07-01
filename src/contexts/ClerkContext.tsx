
import React, { createContext, useContext, ReactNode } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';

interface ClerkContextInterface {
  user: any;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => void;
}

const ClerkContext = createContext<ClerkContextInterface | undefined>(undefined);

export const ClerkProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  const contextValue = {
    user,
    isAuthenticated: !!user,
    isLoading: !isLoaded,
    logout: () => signOut(),
  };

  return (
    <ClerkContext.Provider value={contextValue}>
      {children}
    </ClerkContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(ClerkContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a ClerkProvider');
  }
  return context;
};
