'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header, EventCard } from '@/components';
import { MethodsGrid } from '@/components/features/MethodsGrid';
import { useSessionTimer } from '@/lib/hooks/useSessionTimer';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Goal, Method, TPFEvent } from '@/types';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase/config';
import { getNextEventOccurrence } from '@/lib/utils/eventUtils';

interface MethodsByGoal {
  goal: Goal;
  methods: Method[];
}

function DashboardContent() {
  const { user, isLoading: authLoading } = useAuth();
  const { resetTimer } = useSessionTimer();
  const searchParams = useSearchParams();
  
  const isDebug = searchParams.get('debug') === 'true';
  
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState('');
  const [chosenGoals, setChosenGoals] = useState<Goal[]>([]);
  const [methodsByGoal, setMethodsByGoal] = useState<MethodsByGoal[]>([]);
  const [myEvents, setMyEvents] = useState<TPFEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Check for daily intention completion

  
  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/login';
    }
  }, [authLoading, user]);

  // Fetch data
  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      try {
        // 1. Fetch chosen goals
        const chosenGoalsRef = collection(db, 'users', user.uid, 'chosenGoals');
        const chosenGoalsSnap = await getDocs(chosenGoalsRef);
        const goalIds = chosenGoalsSnap.docs.map(doc => doc.id);

        // Check for daily intention - only if user has goals
        const today = new Date().toDateString();
        const completed = localStorage.getItem('dailyIntentionCompleted');
        
        if (goalIds.length > 0 && completed !== today) {
          window.location.href = '/intention';
          return;
        }
        
        let fetchedGoals: Goal[] = [];
        
        if (goalIds.length > 0) {
          const goalsRef = collection(db, 'goals'); // Ideally fetch by ID, but simplified: fetch all and filter
          const goalsSnap = await getDocs(goalsRef);
          fetchedGoals = goalsSnap.docs
            .filter(doc => goalIds.includes(doc.id))
            .map(doc => ({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate() || new Date(),
            })) as Goal[];
          
          setChosenGoals(fetchedGoals);
        } else {
             setChosenGoals([]);
        }
        
        // 2. Fetch chosen methods
        const chosenMethodsRef = collection(db, 'users', user.uid, 'chosenMethods');
        const chosenMethodsSnap = await getDocs(query(chosenMethodsRef, where('status', '==', 'active')));
        const methodIds = chosenMethodsSnap.docs.map(doc => doc.id);
        
        if (methodIds.length > 0) {
           const methodsRef = collection(db, 'methods');
           const methodsSnap = await getDocs(methodsRef);
           const methods = methodsSnap.docs
             .filter(doc => methodIds.includes(doc.id))
             .map(doc => ({
               id: doc.id,
               ...doc.data(),
               createdAt: doc.data().createdAt?.toDate() || new Date(),
               stats: doc.data().stats || { activeUsers: 0, avgRating: 0, reviewCount: 0 }
             })) as Method[];
             
           const grouped = fetchedGoals.map(goal => ({
             goal,
             methods: methods.filter(m => m.goalId === goal.id),
           }));
           setMethodsByGoal(grouped);
        } else {
            setMethodsByGoal(fetchedGoals.map(goal => ({ goal, methods: [] })));
        }

        // 3. Fetch User's RSVPd Events
        const rsvpsRef = collection(db, 'users', user.uid, 'rsvps');
        const rsvpsSnap = await getDocs(rsvpsRef);
        const eventIds = rsvpsSnap.docs.map(doc => doc.data().eventId || doc.id); // handle legacy or structure

        if (eventIds.length > 0) {
            // Fetch events one by one or query. For now one by one.
            const eventsData: TPFEvent[] = [];
            for (const eid of eventIds) {
                const eventDoc = await getDoc(doc(db, 'events', eid));
                if (eventDoc.exists()) {
                    const data = eventDoc.data();
                    eventsData.push({
                        id: eventDoc.id,
                        methodId: data.methodId,
                        title: data.title,
                        description: data.description,
                        links: data.links || [],
                        phases: data.phases,
                        startTime: data.startTime?.toDate() || new Date(),
                        maxPerBatch: data.maxPerBatch,
                        repeatability: data.repeatability,
                        createdBy: data.createdBy,
                    } as TPFEvent);
                }
            }
            // Sort by next occurrence
            eventsData.sort((a, b) => {
                const nextA = getNextEventOccurrence(a)?.getTime() || 0;
                const nextB = getNextEventOccurrence(b)?.getTime() || 0;
                return nextA - nextB;
            });
            // Filter out events that won't occur anymore
            setMyEvents(eventsData.filter(e => getNextEventOccurrence(e) !== null));
        } else {
            setMyEvents([]);
        }

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

  const handleRsvpRefresh = () => {
     // Simple refresh logic: reload page or refetch?
     // For improved UX we would refetch just events. 
     // Since this adds/removes, we can just reload.
     window.location.reload(); 
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
              methodsByGoal={methodsByGoal}
              onWriteReview={handleWriteReview}
              onViewResources={handleViewResources}
            />
        </section>

        {/* My Upcoming Events Section */}
        {myEvents.length > 0 && (
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
                   {myEvents.map((event) => (
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
