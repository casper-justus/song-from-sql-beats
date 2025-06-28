
import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Auth0SignUpForm } from '@/components/auth/Auth0SignUpForm';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/Auth0Context';
import { Button } from '@/components/ui/button';

export default function SignUpPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#121212' }}>
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6" style={{ backgroundColor: '#121212' }}>
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-white">Music Stream</h1>
      </div>

      <Card className="w-full max-w-md bg-[#282828] border-none shadow-2xl rounded-xl">
        <CardHeader className="text-center pt-8 pb-4">
          <CardTitle className="text-2xl sm:text-3xl font-bold text-white">Sign up to start listening.</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-6 sm:p-8">
          <Auth0SignUpForm />

          <p className="text-xs text-gray-400 text-center mt-4 px-2">
            By clicking on sign-up, you agree to Music Stream's <Link to="/terms" className="underline hover:text-green-500">Terms and Conditions of Use</Link>.
          </p>
           <p className="text-xs text-gray-400 text-center mt-2 px-2">
            To learn more about how Music Stream collects, uses, shares and protects your personal data, please see Music Stream's <Link to="/privacy" className="underline hover:text-green-500">Privacy Policy</Link>.
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
