'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components';
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
  const { minutes, seconds, isPaused, isExpired, resetTimer } = useSessionTimer();
  
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState('');
  const [chosenGoals, setChosenGoals] = useState<Goal[]>([]);
  const [methodsByGoal, setMethodsByGoal] = useState<MethodsByGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Check for daily intention completion
  useEffect(() => {
    const today = new Date().toDateString();
    const completed = localStorage.getItem('dailyIntentionCompleted');
    if (completed !== today && !authLoading && user) {
      window.location.href = '/intention';
    }
  }, [authLoading, user]);
  
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
    window.location.href = `/methods/${methodId}?tab=reviews`;
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
      {/* Password prompt for timer reset */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-50">
          <div className="bg-[var(--surface)] rounded-lg shadow-lg max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              Reset Timer
            </h3>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="input w-full mb-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (password === 'reset123') {
                    if (typeof resetTimer === 'function') resetTimer();
                    setShowPasswordPrompt(false);
                    setPassword('');
                  } else {
                    alert('Incorrect password');
                  }
                }
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowPasswordPrompt(false);
                  setPassword('');
                }}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (password === 'reset123') {
                    if (typeof resetTimer === 'function') resetTimer();
                    setShowPasswordPrompt(false);
                    setPassword('');
                  } else {
                    alert('Incorrect password');
                  }
                }}
                className="btn btn-primary flex-1"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
      
      <Header 
        currentPage="dashboard" 
        timerExtra={
          <button
            onClick={() => setShowPasswordPrompt(true)}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] px-2 py-1 cursor-pointer"
            title="Reset timer (debug)"
          >
            Reset
          </button>
        }
      />
      
      {/* Main Content */}
      <main className="container py-12">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
            Methods you're trying
          </h2>
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
