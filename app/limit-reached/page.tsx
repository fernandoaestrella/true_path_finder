'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useTimer } from '@/lib/contexts/TimerContext';
import { Button } from '@/components';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase/config';
import { TPFEvent } from '@/types';
import { getNextEventOccurrence } from '@/lib/utils/eventUtils';

function LimitReachedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { logout, user } = useAuth();
  const { resetTimer } = useTimer();
  
  const [showPasswordPrompt, setShowPasswordPrompt] = React.useState(false);
  const [password, setPassword] = React.useState('');
  const [nextEvent, setNextEvent] = useState<TPFEvent | null>(null);
  
  useEffect(() => {
    if (!user) return;
    
    const fetchNextEvent = async () => {
      try {
        const rsvpsRef = collection(db, 'users', user.uid, 'rsvps');
        const rsvpsSnap = await getDocs(rsvpsRef);
        const eventIds = rsvpsSnap.docs.map(doc => doc.data().eventId || doc.id);

        if (eventIds.length > 0) {
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
            
            // Find closest upcoming event
            const upcomingEvents = eventsData
                .map(event => ({ event, next: getNextEventOccurrence(event) }))
                .filter(item => item.next !== null && item.next.getTime() > Date.now())
                .sort((a, b) => a.next!.getTime() - b.next!.getTime());

            if (upcomingEvents.length > 0) {
                setNextEvent(upcomingEvents[0].event);
            }
        }
      } catch (err) {
        console.error('Error fetching next event:', err);
      }
    };
    
    fetchNextEvent();
  }, [user]);
  
  const isDebug = searchParams.get('debug') === 'true';
  
  const handleSignOut = async () => {
    await logout();
    router.push('/login');
  };

  const handleResetClick = () => {
    setShowPasswordPrompt(true);
  };

  const handlePasswordSubmit = () => {
    if (password === 'reset123') {
      resetTimer();
      router.push('/dashboard');
    } else {
      alert('Incorrect password');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4 animate-fade-in-slow">
       {/* Password prompt for timer reset */}
       {showPasswordPrompt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-[var(--surface-subtle)] rounded-2xl shadow-lg max-w-sm w-full p-6 text-left">
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
                  handlePasswordSubmit();
                }
              }}
              autoFocus
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
                onClick={handlePasswordSubmit}
                className="btn btn-primary flex-1"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-md w-full text-center space-y-8">
        
        {/* Icon / Visual */}
        <div className="text-6xl mb-6">
          🌙
        </div>
        
        {/* Main Message */}
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          Time's Up for Today
        </h1>
        
        <p className="text-lg text-[var(--text-secondary)] leading-relaxed">
          You've used your 21 minutes of focus. 
          <br /><br />
          This limit exists to help you prioritize action over planning. Take the rest of the day to embody what you've learned.
        </p>

        {/* Encouragement */}
        <div className="p-6 bg-[var(--surface-subtle)] rounded-[var(--radius-interactive)] mt-8">
          <p className="text-sm font-medium text-[var(--text-primary)] mb-2">
            "Small daily actions build a lifetime of change."
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Your timer will reset at 3:20 AM local time.
          </p>
           <div className="mt-4 pt-4 shadow-[0_-1px_0_var(--surface-emphasis)]">
              <p className="text-sm font-medium text-[var(--primary)]">
                💡 Note: Scheduled Events are exempt from this limit.
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                You can still join community events even if your daily timer is up.
              </p>
              
              {nextEvent && (
                 <div className="mt-4 text-left">
                   <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Next Scheduled Event</p>
                   <div 
                     className="flex items-center justify-between p-3 bg-[var(--background)] rounded-[var(--radius-interactive)] cursor-pointer hover:shadow-md transition-shadow"
                     onClick={() => router.push(`/events/${nextEvent.id}`)}
                   >
                     <div>
                        <p className="font-medium text-[var(--text-primary)] text-sm">{nextEvent.title}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                           {getNextEventOccurrence(nextEvent)?.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                     </div>
                     <span className="text-[var(--primary)] text-sm">→</span>
                  </div>
                </div>
             )}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-8 space-y-4">
           <Button 
            onClick={handleSignOut}
            className="w-full"
            variant="secondary"
          >
            Sign In
          </Button>

          {isDebug && (
            <Button 
              onClick={handleResetClick}
              className="w-full opacity-50 hover:opacity-100"
              variant="secondary"
            >
              🔧 Debug: Reset Timer
            </Button>
          )}
        </div>
        
      </div>
    </div>
  );
}

export default function LimitReachedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
      <LimitReachedContent />
    </Suspense>
  );
}
