import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"; // Removed CardDescription
import { SignUpForm } from '@/components/auth/SignUpForm';
import { SocialLogins } from '@/components/auth/SocialLogins';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export default function SignUpPage() {
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
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6" style={{ backgroundColor: '#121212' }}>
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-white">Your App Name</h1>
      </div>

      <Card className="w-full max-w-md bg-[#282828] border-none shadow-2xl rounded-xl">
        <CardHeader className="text-center pt-8 pb-4">
          <CardTitle className="text-2xl sm:text-3xl font-bold text-white">Sign up to start listening.</CardTitle>
          {/* Intentionally removed CardDescription for a cleaner look, similar to Spotify */}
        </CardHeader>
        <CardContent className="space-y-6 p-6 sm:p-8">
          {/* Social Logins are often prominent on sign-up pages too */}
          <SocialLogins />

          <div className="flex items-center my-6">
            <Separator className="flex-grow bg-gray-600" />
            <span className="mx-4 text-xs font-semibold text-gray-400">OR</span>
            <Separator className="flex-grow bg-gray-600" />
          </div>

          <SignUpForm />

          {/* Optional: Terms and conditions link */}
          <p className="text-xs text-gray-400 text-center mt-4 px-2">
            By clicking on sign-up, you agree to Your App Name's <Link to="/terms" className="underline hover:text-spotifyGreen">Terms and Conditions of Use</Link>.
          </p>
           <p className="text-xs text-gray-400 text-center mt-2 px-2">
            To learn more about how Your App Name collects, uses, shares and protects your personal data, please see Your App Name's <Link to="/privacy" className="underline hover:text-spotifyGreen">Privacy Policy</Link>.
          </p>

        </CardContent>
        <CardFooter className="flex flex-col space-y-4 p-6 sm:p-8 border-t border-gray-700 mt-2">
          <p className="text-sm text-gray-400">Already have an account?</p>
          <Button variant="outline" className="w-full border-gray-500 text-white hover:border-white hover:text-white" asChild>
            <Link to="/login">
              Log In Here
            </Link>
          </Button>
        </CardFooter>
      </Card>

    </div>
  );
}
