'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components';
import { Goal } from '@/types';

interface DailyIntentionModalProps {
  goals: Goal[];
  onConfirm: () => void;
}

export function DailyIntentionModal({ goals, onConfirm }: DailyIntentionModalProps) {
  const [acknowledgedGoals, setAcknowledgedGoals] = useState<Set<string>>(new Set());
  const allAcknowledged = goals.length > 0 && acknowledgedGoals.size === goals.length;
  
  // Check if already acknowledged today
  const [alreadyConfirmed, setAlreadyConfirmed] = useState(false);
  
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const lastConfirmed = localStorage.getItem('tpf_intention_date');
    if (lastConfirmed === today) {
      setAlreadyConfirmed(true);
      onConfirm();
    }
  }, [onConfirm]);
  
  const toggleGoal = (goalId: string) => {
    setAcknowledgedGoals(prev => {
      const next = new Set(prev);
      if (next.has(goalId)) {
        next.delete(goalId);
      } else {
        next.add(goalId);
      }
      return next;
    });
  };
  
  const handleConfirm = () => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('tpf_intention_date', today);
    onConfirm();
  };
  
  if (alreadyConfirmed) {
    return null;
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
      <div className="bg-[var(--surface)] rounded-xl shadow-lg max-w-md w-full p-6 animate-fade-in">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🌅</div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            What are you working toward today?
          </h2>
          <p className="text-[var(--text-secondary)] mt-2 text-sm">
            Acknowledge each goal to begin your session
          </p>
        </div>
        
        {goals.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-[var(--text-muted)] mb-4">
              You haven&apos;t chosen any goals yet.
            </p>
            <Button onClick={() => window.location.href = '/goals'}>
              Choose a Goal
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2 mb-6 max-h-[300px] overflow-y-auto">
              {goals.map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => toggleGoal(goal.id)}
                  className={`w-full p-4 rounded-lg border text-left transition-all ${
                    acknowledgedGoals.has(goal.id)
                      ? 'border-[var(--primary)] bg-[rgba(107,155,209,0.1)]'
                      : 'border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--background)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      acknowledgedGoals.has(goal.id)
                        ? 'border-[var(--primary)] bg-[var(--primary)]'
                        : 'border-[var(--border)]'
                    }`}>
                      {acknowledgedGoals.has(goal.id) && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                          <polyline points="20,6 9,17 4,12" />
                        </svg>
                      )}
                    </div>
                    <span className="font-medium text-[var(--text-primary)]">
                      {goal.title}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            
            <Button
              onClick={handleConfirm}
              className="w-full"
              disabled={!allAcknowledged}
            >
              {allAcknowledged ? "Let's Begin" : `Acknowledge all ${goals.length} goals`}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
