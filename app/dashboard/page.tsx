'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header, EventCard } from '@/components';
import { MethodsGrid } from '@/components/features/MethodsGrid';
import { useSessionTimer } from '@/lib/hooks/useSessionTimer';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useUserData } from '@/lib/contexts/UserDataContext';

function DashboardContent() {
  const { user, isLoading: authLoading } = useAuth();
  const { methodsByGoal, myEvents, isLoading: dataLoading, refreshUserData, chosenGoals } = useUserData();
  const { resetTimer } = useSessionTimer();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const isDebug = searchParams.get('debug') === 'true';
  
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState('');
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  // Check for daily intention logic
  useEffect(() => {
    // Only check once data is loaded and if we have goals
    if (!dataLoading && chosenGoals.length > 0) {
      const today = new Date().toDateString();
      const completed = localStorage.getItem('dailyIntentionCompleted');
      
      if (completed !== today) {
        router.push('/intention');
      }
    }
  }, [dataLoading, chosenGoals, router]);
  
  const handleWriteReview = (methodId: string) => {
    router.push(`/methods/${methodId}?tab=reviews`);
  };
  
  const handleViewResources = (methodId: string) => {
    router.push(`/methods/${methodId}`);
  };

  const handleRsvpRefresh = async () => {
     await refreshUserData();
  };

  // Filter out private content for public dashboard
  const publicMethodsByGoal = methodsByGoal
    .map(group => ({
      goal: group.goal,
      methods: group.methods.filter(m => m.isPrivate !== true)
    }))
    .filter(group => group.goal.isPrivate !== true && group.methods.length > 0);

  const publicEvents = myEvents.filter(e => e.isPrivate !== true);
  
  // Show loading state only during initial auth check or if data is loading AND we have no data yet
  if (authLoading || (dataLoading && methodsByGoal.length === 0)) {
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-[var(--surface-subtle)] rounded-2xl shadow-lg max-w-sm w-full p-6">
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
          isDebug ? (
            <button
              onClick={() => setShowPasswordPrompt(true)}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] px-2 py-1 cursor-pointer"
              title="Reset timer (debug)"
            >
              Reset
            </button>
          ) : null
        }
      />
      
      {/* Main Content */}
      <main className="container py-12 space-y-12">
        <section>
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
                Methods you're trying
              </h2>
            </div>
            
            <MethodsGrid
              methodsByGoal={publicMethodsByGoal}
              onWriteReview={handleWriteReview}
              onViewResources={handleViewResources}
            />
        </section>

        {/* My Upcoming Events Section */}
        {publicEvents.length > 0 && (
             <section className="animate-fade-in">
                <div className="mb-8 text-center border-t pt-12 border-[var(--border)]">
                   <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
                     Your Upcoming Events
                   </h2>
                   <p className="text-[var(--text-secondary)] mt-2">
                     Events you have signed up for
                   </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {publicEvents.map((event) => (
                      <EventCard 
                         key={event.id} 
                         event={event} 
                         onRsvpChange={handleRsvpRefresh}
                      />
                   ))}
                </div>
             </section>
        )}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
      <DashboardContent />
    </Suspense>
  );
}
