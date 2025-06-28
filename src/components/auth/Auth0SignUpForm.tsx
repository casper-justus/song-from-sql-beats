import React from 'react';
import { useAuth } from '@/contexts/Auth0Context'; // Assuming this imports your custom context
import { Button } from '@/components/ui/button';

export function Auth0SignUpForm() {
  // Destructure loginWithRedirect, isLoading, and error from your Auth0 context.
  // Ensure your Auth0Context (src/contexts/Auth0Context.tsx) exposes an 'error' property
  // from the underlying @auth0/auth0-react's useAuth0 hook.
  const { loginWithRedirect, isLoading, error } = useAuth();

  const handleSignUp = async () => {
    try {
      // The loginWithRedirect function from @auth0/auth0-react (and thus typically your useAuth)
      // expects an object as its argument for configuration like 'authorizationParams'.
      await loginWithRedirect({
        authorizationParams: {
          screen_hint: 'signup', // This parameter tells Auth0 to show the signup screen
        },
      });
    } catch (err) {
      // Catch any errors that occur before the redirect, e.g., network issues or misconfiguration.
      console.error('Auth0 Sign Up Error:', err);
      // You can add more user-friendly feedback here, like a toast notification or a visible error message.
      // For example: alert('Failed to initiate sign-up. Please try again.');
    }
  };

  return (
    <div className="space-y-5">
      <Button
        onClick={handleSignUp}
        disabled={isLoading} // Disable the button while authentication is loading
        className="w-full text-black font-bold py-3 text-base hover:scale-105 transform transition-transform duration-200 bg-green-500 hover:bg-green-400"
      >
        {isLoading ? 'Loading...' : 'Sign Up with Auth0'}
      </Button>

      {/* Display a generic error message if an Auth0 error is present */}
      {error && (
        <p className="text-red-500 text-sm text-center mt-2">
          An error occurred: {error.message || 'Please try again.'}
        </p>
      )}

      <div className="text-center">
        <p className="text-sm text-gray-400">
          Create your account securely with Auth0
        </p>
      </div>
    </div>
  );
}