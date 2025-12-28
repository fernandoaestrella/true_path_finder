'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, getDocs, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/src/lib/firebase/config';
import { useAuth } from '@/lib/contexts/AuthContext';
import { TPFEvent, EventBatch } from '@/types';
import PhaseIndicator from '@/components/features/PhaseIndicator';
import ChatPanel from '@/components/features/ChatPanel';
import { Button, Card, Header } from '@/components';

const getOrdinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

type Phase = 'arrival' | 'practice' | 'close' | 'ended';

export default function EventPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const eventId = params.eventId as string;
  
  const [event, setEvent] = useState<TPFEvent | null>(null);
  const [batches, setBatches] = useState<EventBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null);
  const [currentPhase, setCurrentPhase] = useState<Phase>('arrival');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);

  // Load event data
  useEffect(() => {
    const loadEvent = async () => {
      try {
        const eventDoc = await getDoc(doc(db, 'events', eventId));
        if (eventDoc.exists()) {
          const data = eventDoc.data();
          setEvent({
            id: eventDoc.id,
            methodId: data.methodId,
            title: data.title,
            description: data.description,
            links: data.links || [],
            phases: data.phases,
            startTime: data.startTime.toDate(),
            maxPerBatch: data.maxPerBatch,
            repeatability: data.repeatability,
            createdBy: data.createdBy,
          });
        }
      } catch (error) {
        console.error('Error loading event:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadEvent();
  }, [eventId]);

  // Load batches
  useEffect(() => {
    const loadBatches = async () => {
      try {
        const batchesRef = collection(db, 'events', eventId, 'batches');
        const batchesSnapshot = await getDocs(batchesRef);
        const batchList: EventBatch[] = [];
        
        batchesSnapshot.forEach((doc) => {
          batchList.push({
            batchNumber: parseInt(doc.id),
            participants: doc.data().participants || [],
          });
        });
        
        // Sort by batch number
        batchList.sort((a, b) => a.batchNumber - b.batchNumber);
        setBatches(batchList);
        
        // Check if user already joined a batch
        if (user) {
          const userBatch = batchList.find((b) => b.participants.includes(user.uid));
          if (userBatch) {
            setSelectedBatch(userBatch.batchNumber);
          }
        }
      } catch (error) {
        console.error('Error loading batches:', error);
      }
    };

    if (eventId) {
      loadBatches();
      // Refresh batches every 10 seconds
      const interval = setInterval(loadBatches, 10000);
      return () => clearInterval(interval);
    }
  }, [eventId, user]);

  // Calculate current phase and elapsed time
  useEffect(() => {
    if (!event) return;

    const updatePhase = () => {
      const now = new Date();
      const start = new Date(event.startTime);
      const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000);
      
      // Event hasn't started yet
      if (elapsed < 0) {
        setCurrentPhase('arrival');
        setElapsedSeconds(elapsed);
        return;
      }
      
      setElapsedSeconds(elapsed);
      
      const arrivalEnd = event.phases.arrival.durationSeconds;
      const practiceEnd = arrivalEnd + event.phases.practice.durationSeconds;
      const closeEnd = practiceEnd + event.phases.close.durationSeconds;
      
      if (elapsed < arrivalEnd) {
        setCurrentPhase('arrival');
      } else if (elapsed < practiceEnd) {
        setCurrentPhase('practice');
      } else if (elapsed < closeEnd) {
        setCurrentPhase('close');
      } else {
        setCurrentPhase('ended');
      }
    };

    updatePhase();
    const interval = setInterval(updatePhase, 1000);
    return () => clearInterval(interval);
  }, [event]);

  const handleJoinBatch = async (batchNumber: number) => {
    if (!user || !event) return;

    setIsJoining(true);
    try {
      const batchRef = doc(db, 'events', eventId, 'batches', batchNumber.toString());
      const batchDoc = await getDoc(batchRef);
      
      if (batchDoc.exists()) {
        // Update existing batch
        await updateDoc(batchRef, {
          participants: arrayUnion(user.uid),
        });
      } else {
        // Create new batch
        await setDoc(batchRef, {
          participants: [user.uid],
        });
      }
      
      setSelectedBatch(batchNumber);
    } catch (error) {
      console.error('Error joining batch:', error);
      alert('Failed to join batch. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const getNextAvailableBatch = (): number => {
    if (batches.length === 0) return 1;
    
    // Find first batch with space
    const availableBatch = batches.find((b) => b.participants.length < (event?.maxPerBatch || 21));
    if (availableBatch) return availableBatch.batchNumber;
    
    // All batches full, create new one
    return Math.max(...batches.map((b) => b.batchNumber)) + 1;
  };

  // Auto-join removed in favor of manual batch selection
  // useEffect(() => { ... }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-xl text-[var(--text-secondary)]">Loading event...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <Card className="max-w-md">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Event Not Found</h1>
          <p className="text-[var(--text-secondary)] mb-6">This event does not exist or has been deleted.</p>
          <Button onClick={() => router.push('/dashboard')}>
            Return to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const isChatEnabled = currentPhase === 'arrival' || currentPhase === 'close';

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Header />

      <div className="container py-8">
        {/* Event Header */}
        <div className="mb-6">
          <div className="flex justify-between items-start">
             <div>
                <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">{event.title}</h1>
                 {event.repeatability && event.repeatability.type !== 'none' && (
                  <div className="inline-block bg-[var(--surface-subtle)] px-3 py-1 rounded-full text-sm text-[var(--text-secondary)] mb-4">
                    🔁 {
                      event.repeatability.type === 'daily' ? `Repeats every ${event.repeatability.interval} day(s)` :
                      event.repeatability.type === 'weekly' ? `Repeats every ${event.repeatability.interval} week(s) on ${event.repeatability.daysOfWeek.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}` :
                      event.repeatability.type === 'monthly_date' ? `Repeats monthly on the ${getOrdinal(event.repeatability.dayOfMonth || 1)}` :
                      event.repeatability.type === 'monthly_day' ? `Repeats monthly on the ${event.repeatability.weekOfMonth === -1 ? 'last' : getOrdinal(event.repeatability.weekOfMonth || 1)} ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][event.repeatability.dayOfWeekForMonthly || 0]}` :
                      'Repeats'
                    }
                  </div>
                )}
             </div>
          </div>
          <p className="text-[var(--text-secondary)]">{event.description}</p>
          
          {elapsedSeconds < 0 && (
            <div className="mt-4 p-3 bg-[var(--surface-subtle)] rounded-[var(--radius-interactive)] inline-block">
              <span className="font-semibold text-[var(--primary)]">
                Event starts in {
                  (() => {
                    const diff = Math.abs(elapsedSeconds);
                    const hours = Math.floor(diff / 3600);
                    const minutes = Math.floor((diff % 3600) / 60);
                    const seconds = diff % 60;
                    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
                    if (minutes > 0) return `${minutes}m ${seconds}s`;
                    return `${seconds}s`;
                  })()
                }
              </span>
            </div>
          )}
        </div>

        {/* Event Links */}
        {event.links.length > 0 && (
          <Card className="mb-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Event Resources</h3>
            <div className="space-y-2">
              {event.links.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-[var(--primary)] hover:underline cursor-pointer"
                >
                  {link.title}
                </a>
              ))}
            </div>
          </Card>
        )}

        {/* Phase Indicator */}
        {currentPhase !== 'ended' && (
          <PhaseIndicator
            currentPhase={currentPhase as 'arrival' | 'practice' | 'close'}
            phases={event.phases}
            elapsedSeconds={elapsedSeconds}
            isEventStarted={elapsedSeconds >= 0}
          />
        )}

        {/* Event Ended */}
        {currentPhase === 'ended' && (
          <Card className="mb-6 text-center py-12">
            <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Event Ended</h2>
            <p className="text-[var(--text-secondary)] mb-6">
              Thank you for participating!
            </p>
            <Button onClick={() => router.push('/dashboard')}>
              Return to Dashboard
            </Button>
          </Card>
        )}

        {/* Batch Selection */}
        {currentPhase !== 'ended' && !selectedBatch && (
           <Card className="mb-6">
             <h3 className="text-xl font-semibold mb-4 text-[var(--text-primary)]">Join a Batch</h3>
             
             {elapsedSeconds < 0 ? (
               <div className="text-center py-8 bg-[var(--surface-subtle)] rounded-[var(--radius-interactive)] border border-dashed border-[var(--text-muted)]">
                 <p className="text-[var(--text-secondary)] mb-2 font-medium">Event hasn't started yet</p>
                 <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
                   Batches will open for joining when the event begins. <br/>
                   <span className="italic">Groups are limited to {event.maxPerBatch} people to ensure meaningful practice.</span>
                 </p>
               </div>
             ) : (
               <>
                 <p className="text-[var(--text-secondary)] mb-6">
                   Select a batch to join the conversation.
                 </p>
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {batches.map((batch) => (
                      <button
                        key={batch.batchNumber}
                        onClick={() => handleJoinBatch(batch.batchNumber)}
                        disabled={isJoining || (batch.participants.length >= event.maxPerBatch && !(batches.every(b => b.participants.length >= event.maxPerBatch) && batch.participants.length <= 5))} 
                        /* 
                          Logic for disabling: 
                          Generally disabled if full. 
                          Exception (Overflow Rule): If ALL batches are full, and this batch has <= 5 people (contradiction? No, wait).
                          The rule is: "If a batch would have 5 or less people AND all others batches are full, temporarily allow those 5 or less people to join any other batch"
                          This means if I am the 22nd person, and I would be in a new batch alone... 
                          Actually, the rule says "allow those 5 or less people to join ANY OTHER batch".
                          So if I am in a 'overflow' state?
                          Let's stick to the visual representation first.
                        */
                        className={`
                          p-4 rounded-[var(--radius-interactive)] border transition-all text-left
                          ${batch.participants.length >= event.maxPerBatch
                            ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-60'
                            : 'bg-white border-[var(--surface-emphasis)] hover:border-[var(--primary)] hover:shadow-md'
                          }
                        `}
                      >
                        <div className="font-semibold text-lg mb-1">Batch {batch.batchNumber}</div>
                        <div className="text-sm text-[var(--text-secondary)]">
                          {batch.participants.length} / {event.maxPerBatch} participants
                        </div>
                      </button>
                    ))}
                    
                    {/* 
                      Automatic Batch Creation UI:
                      If the last batch is full (or if there are no batches), show the next available batch option.
                    */}
                    {(batches.length === 0 || batches[batches.length - 1].participants.length >= event.maxPerBatch) && (
                      <button
                      onClick={() => handleJoinBatch(batches.length + 1)}
                      disabled={isJoining}
                      className="p-4 rounded-[var(--radius-interactive)] border border-dashed border-[var(--text-muted)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-[var(--surface-subtle)] transition-all flex items-center justify-center flex-col"
                    >
                      <span className="font-medium">
                        {batches.length === 0 ? 'Start Batch 1' : `Start Batch ${batches.length + 1}`}
                      </span>
                    </button>
                    )}
                  </div>
                  <div className="mt-4 flex items-start gap-2 text-sm text-[var(--text-muted)] bg-[var(--surface-subtle)] p-3 rounded-[var(--radius-interactive)]">
                    <span className="text-lg">ℹ️</span>
                    <p>
                      Batches are limited to {event.maxPerBatch} participants. 
                      <span className="block mt-1 italic">
                        Special Rule: If a new batch would have 5 or less people and all other batches are full, you may be allowed to join full batches to avoid isolation.
                      </span>
                    </p>
                  </div>
               </>
             )}
           </Card>
        )}

        {/* Batch Info */}
        {selectedBatch && currentPhase !== 'ended' && (
          <Card className="mb-6">
            <p className="text-[var(--text-secondary)]">
              You are in <span className="font-semibold">Batch {selectedBatch}</span>
            </p>
          </Card>
        )}

        {/* Chat Panel - Hidden during practice, and only if batch selected */}
        {selectedBatch && elapsedSeconds >= 0 && currentPhase === 'arrival' && (
          <ChatPanel
            eventId={eventId}
            batchNumber={selectedBatch}
            isEnabled={true}
          />
        )}
        
        {selectedBatch && currentPhase === 'practice' && (
          <Card className="mb-6 text-center py-8">
            <p className="text-[var(--text-secondary)]">
              Chat is disabled during practice. Focus on your work.
            </p>
          </Card>
        )}
        
        {selectedBatch && currentPhase === 'close' && (
          <ChatPanel
            eventId={eventId}
            batchNumber={selectedBatch}
            isEnabled={true}
          />
        )}
      </div>
    </div>
  );
}
