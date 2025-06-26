import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from '@/components/auth/LoginForm';
import { SocialLogins } from '@/components/auth/SocialLogins';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button'; // Import Button to potentially override styles

// Example: Spotify-like green color
const spotifyGreen = "#1DB954";

export default function LoginPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) {
      navigate('/'); // Redirect to home if already logged in
    }
  }, [session, loading, navigate]);

  if (loading || session) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#121212' }}>
        {/* Optional: A themed loading spinner */}
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6" style={{ backgroundColor: '#121212' }}>
      {/* Optional: App Logo or Name */}
      <div className="mb-8 text-center">
        {/* Replace with your actual logo component or SVG if you have one */}
        <h1 className="text-4xl font-bold text-white">Your App Name</h1>
      </div>

      <Card className="w-full max-w-md bg-[#282828] border-none shadow-2xl rounded-xl">
        <CardHeader className="text-center pt-8 pb-4">
          <CardTitle className="text-2xl sm:text-3xl font-bold text-white">Log in to continue.</CardTitle>
          {/* <CardDescription className="text-gray-400">Access your account</CardDescription> */}
        </CardHeader>
        <CardContent className="space-y-6 p-6 sm:p-8">
          {/* Social Logins First (Spotify often does this) */}
          <SocialLogins />

          <div className="flex items-center my-6">
            <Separator className="flex-grow bg-gray-600" />
            <span className="mx-4 text-xs font-semibold text-gray-400">OR</span>
            <Separator className="flex-grow bg-gray-600" />
          </div>

          <LoginForm />

          <div className="text-center mt-6">
            <Link to="/password-reset" className="text-sm text-gray-400 hover:text-white hover:underline">
              Forgot your password?
            </Link>
          </div>

        </CardContent>
        <CardFooter className="flex flex-col space-y-4 p-6 sm:p-8 border-t border-gray-700 mt-2">
          <p className="text-sm text-gray-400">Don't have an account?</p>
          <Button variant="outline" className="w-full border-gray-500 text-white hover:border-white hover:text-white" asChild>
            <Link to="/signup">
              Sign Up Here
            </Link>
          </Button>
        </CardFooter>
      </Card>

      {/* Optional: Footer text */}
      <p className="mt-8 text-xs text-gray-500 text-center">
        If you click "Log in with Google" and are not a user, you will be registered and you agree to our Terms & Conditions and Privacy Policy.
      </p>
    </div>
  );
}
