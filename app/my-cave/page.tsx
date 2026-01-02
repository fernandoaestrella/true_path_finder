'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header, EventCard } from '@/components';
import { MethodsGrid } from '@/components/features/MethodsGrid';
import { useSessionTimer } from '@/lib/hooks/useSessionTimer';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useUserData } from '@/lib/contexts/UserDataContext';

function MyCaveContent() {
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

  // Filter to only private content
  const privateMethodsByGoal = methodsByGoal
    .map(group => ({
      goal: group.goal,
      methods: group.methods.filter(m => m.isPrivate === true)
    }))
    .filter(group => group.goal.isPrivate === true || group.methods.length > 0);

  const privateEvents = myEvents.filter(e => e.isPrivate === true);
  
  const handleWriteReview = (methodId: string) => {
    router.push(`/methods/${methodId}?private=true&tab=reviews`);
  };
  
  const handleViewResources = (methodId: string) => {
    router.push(`/methods/${methodId}?private=true`);
  };

  const handleRsvpRefresh = async () => {
     await refreshUserData();
  };
  
  // Show loading state only during initial auth check or if data is loading AND we have no data yet
  if (authLoading || (dataLoading && privateMethodsByGoal.length === 0)) {
    return (
      <div className="min-h-screen cave-mode flex items-center justify-center">
        <div className="text-[var(--text-muted)]">Loading...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen cave-mode">
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
        currentPage="my-cave" 
        isOnMyCaveDashboard={true}
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
        {/* Private indicator banner */}
        <div className="text-center py-4 px-6 bg-[var(--surface-subtle)] rounded-[var(--radius-interactive)]">
          <p className="text-[var(--text-secondary)] flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Everything in My Cave is private - only you can see it
          </p>
        </div>

        <section>
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
                My Private Methods
              </h2>
            </div>
            
            {privateMethodsByGoal.length > 0 ? (
              <MethodsGrid
                methodsByGoal={privateMethodsByGoal}
                onWriteReview={handleWriteReview}
                onViewResources={handleViewResources}
                isPrivateMode={true}
              />
            ) : (
              <div className="text-center py-12 text-[var(--text-muted)]">
                <p>No private methods yet.</p>
                <p className="text-sm mt-2">Create private goals and methods to see them here.</p>
              </div>
            )}
        </section>

        {/* My Private Events Section */}
        {privateEvents.length > 0 && (
             <section className="animate-fade-in">
                <div className="mb-8 text-center border-t pt-12 border-[var(--border)]">
                   <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
                     My Private Events
                   </h2>
                   <p className="text-[var(--text-secondary)] mt-2">
                     Private events only you can see
                   </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {privateEvents.map((event) => (
                      <EventCard 
                         key={event.id} 
                         event={event} 
                         onRsvpChange={handleRsvpRefresh}
                         isPrivateMode={true}
                      />
                   ))}
                </div>
             </section>
        )}
      </main>
    </div>
  );
}

export default function MyCavePage() {
  return (
    <Suspense fallback={<div className="min-h-screen cave-mode" />}>
      <MyCaveContent />
    </Suspense>
  );
}
