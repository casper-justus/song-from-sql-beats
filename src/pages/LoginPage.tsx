
import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Auth0LoginForm } from '@/components/auth/Auth0LoginForm';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/Auth0Context';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen charcoal-bg">
        <div className="bg-black/20 backdrop-blur-lg rounded-full px-8 py-4 border border-white/20">
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 charcoal-bg">
      {/* App Logo */}
      <div className="mb-12 text-center">
        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-2xl">
          <span className="text-2xl font-bold text-black">♪</span>
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">Music Stream</h1>
        <p className="text-gray-400 text-lg">Millions of songs. Free on Music Stream.</p>
      </div>

      <Card className="w-full max-w-md bg-black/40 border border-white/20 backdrop-blur-xl rounded-3xl shadow-2xl">
        <CardHeader className="text-center pt-10 pb-6">
          <CardTitle className="text-3xl font-bold text-white mb-2">Log in to Music Stream</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6 px-8 pb-8">
          <Auth0LoginForm />
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-6 px-8 pb-10 border-t border-gray-700/50 mt-4">
          <p className="text-sm text-gray-400 text-center">Don't have an account?</p>
          <Button 
            variant="outline" 
            className="w-full h-12 rounded-full border-2 border-gray-500 text-white hover:border-white hover:bg-white/10 hover:text-white font-semibold text-base transition-all" 
            asChild
          >
            <Link to="/signup">
              Sign up for Music Stream
            </Link>
          </Button>
        </CardFooter>
      </Card>

      <p className="mt-8 text-xs text-gray-500 text-center max-w-md leading-relaxed">
        This site is protected by Auth0 and the Google Privacy Policy and Terms of Service apply.
      </p>
    </div>
  );
}
