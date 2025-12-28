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
      <div className="space-y-4 text-[var(--text-secondary)]">
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
          What if you put your goal first, and derived everything from there?
        </p>
      </div>
    ),
    illustration: (
      <div className="text-8xl text-center mb-8">🌅</div>
    ),
  },
  {
    title: "Goals → Methods → Reviews",
    content: (
      <div className="space-y-4 text-[var(--text-secondary)]">
        <p>True Path Finder is simple:</p>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-bold">1</span>
            <div>
              <span className="font-medium text-[var(--text-primary)]">Choose a Goal</span>
              <span className="text-sm block mt-0.5">What do you genuinely want to achieve?</span>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--secondary)] text-white flex items-center justify-center font-bold">2</span>
            <div>
              <span className="font-medium text-[var(--text-primary)]">Try Methods</span>
              <span className="text-sm block mt-0.5">Discover approaches others have tested</span>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-bold">3</span>
            <div>
              <span className="font-medium text-[var(--text-primary)]">Share Honest Reviews</span>
              <span className="text-sm block mt-0.5">Help others by sharing what actually worked</span>
            </div>
          </li>
        </ul>
        <p className="mt-4">
          No debates, no endless discussions—just trying, learning, and sharing results.
        </p>
      </div>
    ),
    illustration: (
      <div className="text-8xl text-center mb-8">🧭</div>
    ),
  },
  {
    title: "21 minutes keeps you focused",
    content: (
      <div className="space-y-4 text-[var(--text-secondary)]">
        <p>
          You have <span className="font-bold text-[var(--primary)]">21 minutes per day</span> to 
          use this app.
        </p>
        <p>
          This isn't a limitation—it's liberation. The goal is to{' '}
          <span className="font-medium text-[var(--text-primary)]">do the work</span>, not to 
          browse and research endlessly.
        </p>
        <div className="bg-[var(--timer-bg)] rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[var(--primary)]">⏸</span>
            <span>Timer pauses when you switch to other apps</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[var(--primary)]">🌙</span>
            <span>Resets at 3:20 AM your local time</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[var(--primary)]">🎯</span>
            <span>Events don&apos;t count against your limit</span>
          </div>
        </div>
      </div>
    ),
    illustration: (
      <div className="text-8xl text-center mb-8">⏱️</div>
    ),
  },
  {
    title: "Events bring us together",
    content: (
      <div className="space-y-4 text-[var(--text-secondary)]">
        <p>
          Community happens through <span className="font-medium text-[var(--text-primary)]">structured events</span>—not 
          endless chat threads.
        </p>
        <p>Every event has three phases:</p>
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
            <span className="text-2xl">👋</span>
            <div>
              <span className="font-medium text-[var(--text-primary)]">Arrival</span>
              <span className="text-sm block">Introductions, chat open</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
            <span className="text-2xl">🧘</span>
            <div>
              <span className="font-medium text-[var(--text-primary)]">Practice</span>
              <span className="text-sm block">Focused work, chat closed</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
            <span className="text-2xl">🤝</span>
            <div>
              <span className="font-medium text-[var(--text-primary)]">Reflection</span>
              <span className="text-sm block">Sharing insights, chat open</span>
            </div>
          </div>
        </div>
      </div>
    ),
    illustration: (
      <div className="text-8xl text-center mb-8">🤝</div>
    ),
  },
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const step = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;
  
  const handleNext = () => {
    if (isLastStep) {
      // Navigate to signup
      window.location.href = '/signup';
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };
  
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };
  
  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Progress indicator */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-[var(--border)]">
        <div
          className="h-full bg-[var(--primary)] transition-all duration-500"
          style={{ width: `${((currentStep + 1) / onboardingSteps.length) * 100}%` }}
        />
      </div>
      
      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-6 pt-12">
        <div className="w-full max-w-lg animate-fade-in" key={currentStep}>
          {step.illustration}
          
          <h1 className="text-2xl md:text-3xl font-bold text-center mb-6 text-[var(--text-primary)]">
            {step.title}
          </h1>
          
          <div className="text-center md:text-left">
            {step.content}
          </div>
        </div>
      </main>
      
      {/* Navigation */}
      <footer className="p-6 border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            onClick={handleBack}
            className={currentStep === 0 ? 'invisible' : ''}
          >
            ← Back
          </Button>
          
          <div className="flex gap-2">
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
          
          <Button onClick={handleNext}>
            {isLastStep ? 'Get Started' : 'Next →'}
          </Button>
        </div>
      </footer>
    </div>
  );
}
