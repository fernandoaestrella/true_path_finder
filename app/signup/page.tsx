'use client';

import React, { useState } from 'react';
import { Button, Input } from '@/components';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/src/lib/firebase/config';

// Common timezone options
const timezoneOptions = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'Europe/London', label: 'GMT / London' },
  { value: 'Europe/Paris', label: 'Central European Time' },
  { value: 'Asia/Tokyo', label: 'Japan Time' },
  { value: 'Asia/Shanghai', label: 'China Time' },
  { value: 'Australia/Sydney', label: 'Sydney Time' },
];

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validation
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Create auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        timezone,
        createdAt: serverTimestamp(),
        onboardingComplete: true,
      });
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('Signup error:', err);
      if (err instanceof Error) {
        if (err.message.includes('email-already-in-use')) {
          setError('An account with this email already exists. Sign In below.');
        } else if (err.message.includes('invalid-email')) {
          setError('Please enter a valid email address');
        } else {
          setError('Failed to create account. Please try again.');
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
            Create Your Account
          </h1>
          <p className="text-[var(--text-secondary)] mt-2">
            Start your journey to finding what works
          </p>
        </div>
        
        <form onSubmit={handleSignup} className="card space-y-4">
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
            placeholder="At least 6 characters"
            required
          />
          
          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            required
          />
          
          <div className="space-y-1">
            <label className="block text-sm font-medium text-[var(--text-primary)]">
              Timezone
            </label>
            <p className="text-xs text-[var(--text-muted)] mb-2">
              Used for the 3:20 AM daily reset
            </p>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="input"
            >
              {timezoneOptions.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
          
          {error && (
            <div className="p-3 bg-[rgba(212,114,106,0.1)] rounded-lg text-[var(--text-primary)] text-sm">
              {error}
            </div>
          )}
          
          <Button
            type="submit"
            className="w-full"
            isLoading={isLoading}
          >
            Create Account
          </Button>
          
          <p className="text-center text-sm text-[var(--text-muted)]">
            Already have an account?{' '}
            <a href="/login" className="text-[var(--primary)] hover:underline">
              Sign in
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
