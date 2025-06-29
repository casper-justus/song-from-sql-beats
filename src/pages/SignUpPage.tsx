
import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { ClerkSignUpForm } from '@/components/auth/ClerkSignUpForm';

export default function SignUpPage() {
  const { isSignedIn, isLoaded } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate('/');
    }
  }, [isSignedIn, isLoaded, navigate]);

  if (!isLoaded || isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen charcoal-bg">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 charcoal-bg wave-bg">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-white">Music Stream</h1>
      </div>

      <div className="w-full max-w-md">
        <ClerkSignUpForm />
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-400 mb-4">Already have an account?</p>
        <Link 
          to="/login"
          className="inline-block px-6 py-3 bg-transparent border-2 border-gray-500 text-white hover:border-white hover:bg-white/10 rounded-full font-semibold text-base transition-all"
        >
          Log In Here
        </Link>
      </div>

      <div className="mt-8 text-center">
        <p className="text-xs text-gray-400 text-center mt-4 px-2">
          By clicking on sign-up, you agree to Music Stream's <Link to="/terms" className="underline hover:text-green-500">Terms and Conditions of Use</Link>.
        </p>
        <p className="text-xs text-gray-400 text-center mt-2 px-2">
          To learn more about how Music Stream collects, uses, shares and protects your personal data, please see Music Stream's <Link to="/privacy" className="underline hover:text-green-500">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
