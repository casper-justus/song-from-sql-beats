import React, { useState } from 'react';
import { sendPasswordResetEmail } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

export function PasswordResetForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const { error: resetError } = await sendPasswordResetEmail(email);
    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      toast({
        title: "Error Sending Reset Email",
        description: resetError.message,
        variant: "destructive",
      });
    } else {
      setMessage('If an account exists for this email, a password reset link has been sent. Please check your inbox.');
      toast({
        title: "Password Reset Email Sent",
        description: "If an account exists, you'll receive a reset link shortly.",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-red-500">{error}</p>}
      {message && <p className="text-green-500">{message}</p>}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Sending...' : 'Send Password Reset Email'}
      </Button>
    </form>
  );
}
