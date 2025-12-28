'use client';

import React, { useState, useEffect } from 'react';
import { TimerBar } from '@/components';
import { DailyIntentionModal } from '@/components/features/DailyIntentionModal';
import { MethodsGrid } from '@/components/features/MethodsGrid';
import { useSessionTimer } from '@/lib/hooks/useSessionTimer';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Goal, Method } from '@/types';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/src/lib/firebase/config';

interface MethodsByGoal {
  goal: Goal;
  methods: Method[];
}

export default function DashboardPage() {
  const { user, userData, isLoading: authLoading, logout } = useAuth();
  const { minutes, seconds, isPaused, isExpired } = useSessionTimer();
  
  const [showIntention, setShowIntention] = useState(true);
  const [chosenGoals, setChosenGoals] = useState<Goal[]>([]);
  const [methodsByGoal, setMethodsByGoal] = useState<MethodsByGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/login';
    }
  }, [authLoading, user]);
  
  // Fetch user's chosen goals and methods
  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      try {
        // Fetch chosen goals
        const chosenGoalsRef = collection(db, 'users', user.uid, 'chosenGoals');
        const chosenGoalsSnap = await getDocs(chosenGoalsRef);
        const goalIds = chosenGoalsSnap.docs.map(doc => doc.id);
        
        if (goalIds.length === 0) {
          setChosenGoals([]);
          setMethodsByGoal([]);
          setIsLoading(false);
          return;
        }
        
        // Fetch goal details
        const goalsRef = collection(db, 'goals');
        const goalsSnap = await getDocs(goalsRef);
        const goals = goalsSnap.docs
          .filter(doc => goalIds.includes(doc.id))
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
          })) as Goal[];
        
        setChosenGoals(goals);
        
        // Fetch chosen methods
        const chosenMethodsRef = collection(db, 'users', user.uid, 'chosenMethods');
        const chosenMethodsSnap = await getDocs(query(chosenMethodsRef, where('status', '==', 'active')));
        const methodIds = chosenMethodsSnap.docs.map(doc => doc.id);
        
        if (methodIds.length === 0) {
          setMethodsByGoal(goals.map(goal => ({ goal, methods: [] })));
          setIsLoading(false);
          return;
        }
        
        // Fetch method details
        const methodsRef = collection(db, 'methods');
        const methodsSnap = await getDocs(methodsRef);
        const methods = methodsSnap.docs
          .filter(doc => methodIds.includes(doc.id))
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
          })) as Method[];
        
        // Group methods by goal
        const grouped = goals.map(goal => ({
          goal,
          methods: methods.filter(m => m.goalId === goal.id),
        }));
        
        setMethodsByGoal(grouped);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [user]);
  
  const handleWriteReview = (methodId: string) => {
    window.location.href = `/methods/${methodId}/review`;
  };
  
  const handleViewResources = (methodId: string) => {
    window.location.href = `/methods/${methodId}`;
  };
  
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-[var(--text-muted)]">Loading...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Daily Intention Modal */}
      {showIntention && (
        <DailyIntentionModal
          goals={chosenGoals}
          onConfirm={() => setShowIntention(false)}
        />
      )}
      
      {/* Time Expired Overlay */}
      {isExpired && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-40">
          <div className="bg-[var(--surface)] rounded-xl shadow-lg max-w-md w-full p-8 text-center animate-fade-in">
            <div className="text-6xl mb-4">⏰</div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
              Time&apos;s Up!
            </h2>
            <p className="text-[var(--text-secondary)] mb-4">
              You&apos;ve used your 21 minutes for today. Go try your methods!
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              Timer resets at 3:20 AM
            </p>
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-30">
        <div className="container py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            🧭 True Path Finder
          </h1>
          
          <div className="flex items-center gap-4">
            <TimerBar minutes={minutes} seconds={seconds} isPaused={isPaused} />
            
            <nav className="flex items-center gap-2">
              <a
                href="/goals"
                className="btn btn-ghost text-sm"
              >
                Goals
              </a>
              <button
                onClick={logout}
                className="btn btn-ghost text-sm"
              >
                Logout
              </button>
            </nav>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
            Welcome back{userData?.email ? `, ${userData.email.split('@')[0]}` : ''}
          </h2>
          <p className="text-[var(--text-secondary)]">
            Here are the methods you&apos;re currently trying
          </p>
        </div>
        
        <MethodsGrid
          methodsByGoal={methodsByGoal}
          onWriteReview={handleWriteReview}
          onViewResources={handleViewResources}
        />
      </main>
    </div>
  );
}
