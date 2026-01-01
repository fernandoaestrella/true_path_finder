'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingFlow } from '@/components/features/OnboardingFlow';

export default function PhilosophyPage() {
  const router = useRouter();
  
  const handleExit = () => {
    router.push('/profile');
  };

  return (
    <OnboardingFlow 
      onComplete={handleExit}
      onExit={handleExit}
      actionLabel="Return to Profile"
    />
  );
}
