'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useUserData } from '@/lib/contexts/UserDataContext';

export default function IntentionPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { chosenGoals, isLoading: dataLoading } = useUserData();
  const router = useRouter();
  
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);
  
  // Redirect if not authenticated - REMOVED for Guest Mode
  
  const handleContinue = () => {
    // Store intention completion
    const today = new Date().toDateString();
    localStorage.setItem('dailyIntentionCompleted', today);
    localStorage.setItem('selectedGoalsFocus', JSON.stringify(selectedGoalIds));
    router.push('/dashboard');
  };
  
  const toggleGoal = (goalId: string) => {
    setSelectedGoalIds(prev =>
      prev.includes(goalId)
        ? prev.filter(id => id !== goalId)
        : [...prev, goalId]
    );
  };
  
  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-[var(--text-muted)]">Loading...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-8">
      <div className="w-full max-w-md animate-fade-in">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] text-center mb-12">
          What will you focus on today?
        </h1>
        
        {chosenGoals.length === 0 ? (
          <div className="text-center mb-8">
            <p className="text-[var(--text-secondary)] mb-6">
              You haven't chosen any goals yet.
            </p>
            <button
              onClick={() => router.push('/goals')}
              className="btn btn-primary"
            >
              Choose Goals
            </button>
          </div>
        ) : (
          <div className="space-y-3 mb-12">
            {chosenGoals.map((goal) => (
              <button
                key={goal.id}
                onClick={() => toggleGoal(goal.id)}
                className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                  selectedGoalIds.includes(goal.id)
                    ? 'border-[var(--primary)] bg-[var(--primary-light)]'
                    : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--secondary)]'
                }`}
              >
                <div className="font-medium text-[var(--text-primary)]">
                  {goal.title}
                </div>
                {goal.description && (
                  <div className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-1">
                    {goal.description}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
        
        {chosenGoals.length > 0 && (
          <button
            onClick={handleContinue}
            disabled={selectedGoalIds.length === 0}
            className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
