'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@/components';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/src/lib/firebase/config';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      if (err instanceof Error) {
        if (err.message.includes('user-not-found') || err.message.includes('wrong-password')) {
          setError('Invalid email or password');
        } else if (err.message.includes('too-many-requests')) {
          setError('Too many attempts. Please try again later.');
        } else {
          setError('Failed to sign in. Please try again.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Welcome Back
          </h1>
          <p className="text-[var(--text-secondary)] mt-2">
            Continue your journey
          </p>
        </div>
        
        <form onSubmit={handleLogin} className="card space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
          />
          
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            required
          />
          
          {error && (
            <div className="p-3 bg-[rgba(212,114,106,0.1)] rounded-lg text-[var(--error)] text-sm">
              {error}
            </div>
          )}
          
          <Button
            type="submit"
            className="w-full"
            isLoading={isLoading}
          >
            Sign In
          </Button>
          
        <p className="text-center text-sm text-[var(--text-muted)]">
            Don&apos;t have an account?{' '}
            <Link href="/onboarding" className="text-[var(--primary)] hover:underline">
              Get started
            </Link>
          </p>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[var(--border)]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[var(--background)] px-2 text-[var(--text-muted)]">
                Or
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => router.push('/dashboard')}
          >
            Continue as Guest
          </Button>
        </form>
      </div>
    </div>
  );
}
