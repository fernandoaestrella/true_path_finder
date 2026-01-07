'use client';

import React, { useState } from 'react';
import { Button } from '@/components';

interface OnboardingStep {
  title: string;
  content: React.ReactNode;
  illustration?: React.ReactNode;
}

const onboardingSteps: OnboardingStep[] = [
  {
    title: "We're all seeking happiness",
    content: (
      <div className="space-y-4 md:space-y-6 text-[var(--text-secondary)]">
        <p>
          Every piece of content ever created—every book, video, course, practice—is 
          ultimately an answer to one question:
        </p>
        <p className="text-xl font-medium text-[var(--text-primary)] italic">
          "How can I be happier?"
        </p>
        <p>
          Yet we often consume without purpose, scroll without intention, and wonder 
          why nothing changes.
        </p>
        <p className="text-[var(--primary)] font-medium">
          What if you put your goal first?
        </p>
      </div>
    ),
  },
  {
    title: "Goals → Methods → Reviews",
    content: (
      <div className="space-y-4 md:space-y-6 text-[var(--text-secondary)]">
        <ul className="space-y-2 md:space-y-4">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-bold text-sm">1</span>
            <div>
              <span className="font-medium text-[var(--text-primary)]">Choose a Goal</span>
              <span className="text-sm block mt-0.5">What do you genuinely want to achieve?</span>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-bold text-sm">2</span>
            <div>
              <span className="font-medium text-[var(--text-primary)]">Try Methods</span>
              <span className="text-sm block mt-0.5">Discover approaches others have tested</span>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-bold text-sm">3</span>
            <div>
              <span className="font-medium text-[var(--text-primary)]">Share Reviews</span>
              <span className="text-sm block mt-0.5">Help others by sharing what actually worked</span>
            </div>
          </li>
        </ul>
      </div>
    ),
  },
  {
    title: "21 minutes keeps you focused",
    content: (
      <div className="space-y-4 md:space-y-6 text-[var(--text-secondary)]">
        <p>
          You have <span className="font-semibold text-[var(--text-primary)]">21 minutes per day</span> to 
          use this app.
        </p>
        <p>
          This isn't a limitation—it's liberation. The goal is to{' '}
          <span className="font-medium text-[var(--text-primary)]">do the work</span>, not to 
          browse endlessly.
        </p>
        <div className="bg-[var(--surface-subtle)] rounded-lg p-4 space-y-3 border border-[var(--border)]">
          <div className="flex items-start gap-3">
            <span className="text-[var(--primary)]">•</span>
            <span>Timer pauses when you switch apps</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-[var(--primary)]">•</span>
            <span>Resets at 3:20 AM local time</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-[var(--primary)]">•</span>
            <span>Events don't count against your limit</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Events bring us together",
    content: (
      <div className="space-y-4 md:space-y-6 text-[var(--text-secondary)]">
        <p>
          Community happens through <span className="font-medium text-[var(--text-primary)]">timed, structured events</span>, not endless debate, in batches of 7 to 21 people.
        </p>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-[var(--surface-subtle)] rounded-lg">
            <div>
              <span className="font-medium text-[var(--text-primary)]">Arrival</span>
              <span className="text-sm block">Introductions, questions, text chat open</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-[var(--surface-subtle)] rounded-lg">
            <div>
              <span className="font-medium text-[var(--text-primary)]">Practice</span>
              <span className="text-sm block">Focused work, text chat closed</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-[var(--surface-subtle)] rounded-lg">
            <div>
              <span className="font-medium text-[var(--text-primary)]">Reflection</span>
              <span className="text-sm block">Sharing insights, text chat open</span>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Choose your path",
    content: (
      <div className="space-y-6 text-[var(--text-secondary)]">
        <p>
          You're ready to start. How would you like to begin?
        </p>
        
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)]">
            <h3 className="font-semibold text-[var(--text-primary)] mb-1">Continue as Guest</h3>
            <p className="text-sm mb-3">Try public goals, methods and view all content. Create private goals, methods and reviews. Data is saved to this device only.</p>
            <div className="text-xs text-[var(--text-muted)] mt-2">
              ⚠️ Note: Guest data will NOT transfer if you create an account later.
              Guests cannot RSVP to public events or participate in their chat.
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[var(--primary)] bg-[rgba(var(--primary-rgb),0.05)]">
            <h3 className="font-semibold text-[var(--text-primary)] mb-1">Create an Account</h3>
            <p className="text-sm mb-3">Everything a Guest account can do, plus join group text chat in events, and post public reviews.</p>
          </div>
        </div>
      </div>
    ),
  },
];

interface OnboardingFlowProps {
  onComplete: (mode?: 'signup' | 'guest') => void;
  actionLabel?: string;
  onExit?: () => void;
}

export function OnboardingFlow({ onComplete, actionLabel = 'Get Started', onExit }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;
  
  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };
  
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else if (onExit) {
      onExit();
    }
  };
  
  return (
    <div className="h-[100dvh] overflow-hidden bg-[var(--background)] flex flex-col">
      {/* Progress indicator */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-[var(--border)]">
        <div
          className="h-full bg-[var(--primary)] transition-all duration-500"
          style={{ width: `${((currentStep + 1) / onboardingSteps.length) * 100}%` }}
        />
      </div>
      
      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-6">
        <div className="w-full max-w-lg animate-fade-in" key={currentStep}>
          {step.illustration}
          
          <h1 className="text-2xl md:text-3xl font-bold text-center mb-4 md:mb-6 text-[var(--text-primary)]">
            {step.title}
          </h1>
          
          <div className="text-center md:text-left">
            {step.content}
          </div>
        </div>
      </main>
      
      {/* Navigation */}
      <footer className="px-6 py-4">
        <div className="max-w-lg mx-auto grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="justify-self-start">
            <Button
              variant="ghost"
              onClick={handleBack}
              className={currentStep === 0 && !onExit ? 'invisible' : ''}
            >
              ← Back
            </Button>
          </div>
          
          <div className="flex gap-2 justify-self-center">
            {onboardingSteps.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-[var(--primary)] w-6'
                    : index < currentStep
                    ? 'bg-[var(--primary)] opacity-50'
                    : 'bg-[var(--border)]'
                }`}
                onClick={() => setCurrentStep(index)}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>
          
          <div className="justify-self-end flex gap-2">
            {isLastStep ? (
              <>
                 <Button 
                   variant="secondary" 
                   onClick={() => onComplete('guest')}
                 >
                   Guest
                 </Button>
                 <Button 
                   onClick={() => onComplete('signup')}
                 >
                   Create Account
                 </Button>
              </>
            ) : (
                <Button onClick={handleNext}>
                  Next →
                </Button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
