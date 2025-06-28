
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { supabase } from '@/integrations/supabase/client';

interface Auth0ContextProps {
  user: any;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithRedirect: () => void;
  logout: () => void;
  getAccessTokenSilently: () => Promise<string>;
}

const Auth0Context = createContext<Auth0ContextProps>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  loginWithRedirect: () => {},
  logout: () => {},
  getAccessTokenSilently: async () => '',
});

interface Auth0ProviderWrapperProps {
  children: React.ReactNode;
}

export const Auth0ProviderWrapper: React.FC<Auth0ProviderWrapperProps> = ({ children }) => {
  const {
    user,
    isAuthenticated,
    isLoading,
    loginWithRedirect,
    logout,
    getAccessTokenSilently,
  } = useAuth0();
  
  const [profileSynced, setProfileSynced] = useState(false);

  // Sync Auth0 user with Supabase profiles table
  useEffect(() => {
    const syncUserProfile = async () => {
      if (isAuthenticated && user && !profileSynced) {
        console.log('Syncing Auth0 user with Supabase:', user);
        
        try {
          // Check if profile exists
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.sub)
            .maybeSingle();

          if (!existingProfile) {
            // Create new profile
            const { error } = await supabase
              .from('profiles')
              .insert({
                id: user.sub,
                full_name: user.name || '',
                username: user.nickname || user.email?.split('@')[0] || '',
                avatar_url: user.picture || '',
              });

            if (error) {
              console.error('Error creating profile:', error);
            } else {
              console.log('Profile created successfully');
            }
          } else {
            // Update existing profile
            const { error } = await supabase
              .from('profiles')
              .update({
                full_name: user.name || existingProfile.full_name,
                username: user.nickname || existingProfile.username,
                avatar_url: user.picture || existingProfile.avatar_url,
                updated_at: new Date().toISOString(),
              })
              .eq('id', user.sub);

            if (error) {
              console.error('Error updating profile:', error);
            } else {
              console.log('Profile updated successfully');
            }
          }
          
          setProfileSynced(true);
        } catch (error) {
          console.error('Error syncing user profile:', error);
        }
      }
    };

    syncUserProfile();
  }, [isAuthenticated, user, profileSynced]);

  const value = {
    user,
    isAuthenticated,
    isLoading,
    loginWithRedirect,
    logout: () => logout({ logoutParams: { returnTo: window.location.origin } }),
    getAccessTokenSilently,
  };

  return (
    <Auth0Context.Provider value={value}>
      {children}
    </Auth0Context.Provider>
  );
};

export const useAuth = () => {
  return useContext(Auth0Context);
};
