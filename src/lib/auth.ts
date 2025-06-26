import { supabase } from '@/integrations/supabase/client';
import type { Provider } from '@supabase/supabase-js';

export const signInWithEmailPassword = async (email, password) => {
  return supabase.auth.signInWithPassword({ email, password });
};

export const signUpWithEmailPassword = async (email, password) => {
  // Supabase automatically sends a confirmation email if email confirmation is enabled in your project settings.
  return supabase.auth.signUp({ email, password });
};

export const signOut = async () => {
  return supabase.auth.signOut();
};

export const sendPasswordResetEmail = async (email) => {
  // Note: Ensure your Supabase project has an email template for password resets.
  // The user will be redirected to the URL specified in your Supabase project's email template settings.
  // This URL should point to your app's password update page (e.g., /update-password).
  const redirectUrl = `${window.location.origin}/update-password`;
  return supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
};

export const updateUserPassword = async (newPassword) => {
  // This function should be called on the /update-password page after the user has clicked the link in their email.
  // Supabase handles the session and token from the URL.
  return supabase.auth.updateUser({ password: newPassword });
};

export const signInWithGoogle = async () => {
  // Note: Ensure you have configured Google as an OAuth provider in your Supabase project settings.
  // Also, ensure the redirect URL in Supabase matches your application's URL.
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/`, // Redirect to home page after Google login
    },
  });
};

// Function to get the current user session
export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
};

// Function to get the current user
export const getUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
};

// Listen to auth state changes
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange(callback);
};
