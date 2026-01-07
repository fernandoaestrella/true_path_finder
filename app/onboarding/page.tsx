'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingFlow } from '@/components/features/OnboardingFlow';

export default function OnboardingPage() {
  const router = useRouter();
  
  return (
    <OnboardingFlow 
      onComplete={(mode) => {
        if (mode === 'guest') {
          router.push('/dashboard');
        } else {
          router.push('/signup');
        }
      }} 
    />
  );
}
