'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Goal } from '@/types';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/src/lib/firebase/config';

export default function IntentionPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/login';
    }
  }, [authLoading, user]);
  
  useEffect(() => {
    if (!user) return;
    
    const fetchGoals = async () => {
      try {
        const chosenGoalsRef = collection(db, 'users', user.uid, 'chosenGoals');
        const chosenGoalsSnap = await getDocs(chosenGoalsRef);
        const goalIds = chosenGoalsSnap.docs.map(doc => doc.id);
        
        if (goalIds.length === 0) {
          setGoals([]);
          setIsLoading(false);
          return;
        }
        
        const goalsRef = collection(db, 'goals');
        const goalsSnap = await getDocs(goalsRef);
        const userGoals = goalsSnap.docs
          .filter(doc => goalIds.includes(doc.id))
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
          })) as Goal[];
        
        setGoals(userGoals);
      } catch (error) {
        console.error('Error fetching goals:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchGoals();
  }, [user]);
  
  const handleContinue = () => {
    // Store intention completion
    const today = new Date().toDateString();
    localStorage.setItem('dailyIntentionCompleted', today);
    localStorage.setItem('selectedGoalsFocus', JSON.stringify(selectedGoalIds));
    window.location.href = '/dashboard';
  };
  
  const toggleGoal = (goalId: string) => {
    setSelectedGoalIds(prev =>
      prev.includes(goalId)
        ? prev.filter(id => id !== goalId)
        : [...prev, goalId]
    );
  };
  
  if (authLoading || isLoading) {
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
        
        {goals.length === 0 ? (
          <div className="text-center mb-8">
            <p className="text-[var(--text-secondary)] mb-6">
              You haven't chosen any goals yet.
            </p>
            <button
              onClick={() => window.location.href = '/goals'}
              className="btn btn-primary"
            >
              Choose Goals
            </button>
          </div>
        ) : (
          <div className="space-y-3 mb-12">
            {goals.map((goal) => (
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
        
        {goals.length > 0 && (
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
