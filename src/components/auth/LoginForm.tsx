
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailPassword } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await signInWithEmailPassword(email, password);
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      toast({
        title: "Login Failed",
        description: signInError.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "Successfully logged in",
      });
      navigate('/');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-full px-4 py-3">
          <p className="text-red-400 text-sm text-center">{error}</p>
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="email" className="text-sm font-semibold text-white mb-2 block">Email or username</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Email or username"
            className="h-12 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 rounded-full px-6 text-base focus:ring-green-500 focus:border-green-500 backdrop-blur-sm"
          />
        </div>
        
        <div>
          <Label htmlFor="password" className="text-sm font-semibold text-white mb-2 block">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Password"
            className="h-12 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 rounded-full px-6 text-base focus:ring-green-500 focus:border-green-500 backdrop-blur-sm"
          />
        </div>
      </div>
      
      <Button
        type="submit"
        className="w-full h-12 bg-green-500 hover:bg-green-400 text-black font-bold text-base rounded-full transition-all hover:scale-105 transform shadow-lg"
        disabled={loading}
      >
        {loading ? 'Logging in...' : 'Log In'}
      </Button>
    </form>
  );
}
