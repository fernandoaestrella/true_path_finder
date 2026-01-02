'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { doc, getDoc, collection, getDocs, setDoc, updateDoc, deleteDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/src/lib/firebase/config';
import { useAuth } from '@/lib/contexts/AuthContext';
import { TPFEvent, EventBatch } from '@/types';
import PhaseIndicator from '@/components/features/PhaseIndicator';
import ChatPanel from '@/components/features/ChatPanel';
import EventNotes from '@/components/features/EventNotes';
import { Button, Card, InfoCard, Header, ResourceCard, InfoTooltip } from '@/components';
import { AddToCalendarButton } from 'add-to-calendar-button-react';
import { getNextEventOccurrence, getEventDurationSeconds } from '@/lib/utils/eventUtils';
import { formatDuration, formatEventDate } from '@/lib/utils/timeUtils';
import { APP_CONFIG } from '@/lib/config';

const getOrdinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};



const EditButton = ({ eventId, isStarted, isPrivateMode = false }: { eventId: string, isStarted: boolean, isPrivateMode?: boolean }) => {
  const router = useRouter();
  const [showTooltip, setShowTooltip] = useState(false);
  const privateParam = isPrivateMode ? '?private=true' : '';

  if (isStarted) {
    return (
      <div className="relative inline-block">
        <div
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onClick={() => setShowTooltip(!showTooltip)}
          className="inline-block"
        >
          <Button 
            variant="secondary" 
            disabled={true}
            className="text-sm px-3 py-1 h-8 opacity-50 cursor-not-allowed pointer-events-none" // pointer-events-none on button, so wrapper catches events
          >
            Edit
          </Button>
        </div>
        {showTooltip && (
          <div className="absolute right-0 top-full mt-2 w-48 p-2 bg-[var(--text-primary)] text-white text-xs rounded-[var(--radius-interactive)] shadow-lg z-20 text-center">
            Cannot edit an event that is currently live.
          </div>
        )}
      </div>
    );
  }

  return (
    <Button 
      variant="secondary" 
      onClick={() => router.push(`/events/edit/${eventId}${privateParam}`)}
      className="text-sm px-3 py-1 h-8"
    >
      Edit
    </Button>
  );
};

type Phase = 'arrival' | 'practice' | 'close' | 'ended';

function EventPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const eventId = params.eventId as string;
  
  // Private mode from query param
  const isPrivateMode = searchParams.get('private') === 'true';
  
  const lastOccurrenceRef = useRef<number | null>(null);
  
  const [event, setEvent] = useState<TPFEvent | null>(null);
  const [batches, setBatches] = useState<EventBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null);
  const [currentPhase, setCurrentPhase] = useState<Phase>('arrival');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isRsvped, setIsRsvped] = useState(false);
  const [isLoadingRsvp, setIsLoadingRsvp] = useState(false);

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
      
      // Calculate active or next occurrence
      const currentTarget = getNextEventOccurrence(event);
      
      if (!currentTarget) {
         // Non-repeating event ended
         router.push('/dashboard');
         return;
      }
      
      const currentTimestamp = currentTarget.getTime();
      
      // Check for occurrence transition (Detect ending of previous one)
      if (lastOccurrenceRef.current && lastOccurrenceRef.current !== currentTimestamp) {
          router.push('/dashboard');
          return;
      }
      
      lastOccurrenceRef.current = currentTimestamp;
      
      const elapsed = Math.floor((now.getTime() - currentTarget.getTime()) / 1000);
      setElapsedSeconds(elapsed);
      
      if (elapsed < 0) {
        setCurrentPhase('arrival');
        return;
      }
      
      const arrivalEnd = event.phases.arrival.durationSeconds || 0;
      const practiceEnd = arrivalEnd + (event.phases.practice.durationSeconds || 0);
      const closeEnd = practiceEnd + (event.phases.close.durationSeconds || 0);
      
      if (elapsed < arrivalEnd) {
        setCurrentPhase('arrival');
      } else if (elapsed < practiceEnd) {
        setCurrentPhase('practice');
      } else if (elapsed < closeEnd) {
        setCurrentPhase('close');
      } else {
        router.push('/dashboard');
      }
    };

    updatePhase();
    const interval = setInterval(updatePhase, 1000);
    return () => clearInterval(interval);
  }, [event]);

  const handleDeleteEvent = async () => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) return;
    
    try {
      await deleteDoc(doc(db, 'events', eventId));
      router.push('/dashboard');
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event');
    }
  };

  const isCreator = user?.uid === event?.createdBy;

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
    const availableBatch = batches.find((b) => b.participants.length < (event?.maxPerBatch || APP_CONFIG.MAX_PARTICIPANTS_PER_BATCH));
    if (availableBatch) return availableBatch.batchNumber;
    
    // All batches full, create new one
    return Math.max(...batches.map((b) => b.batchNumber)) + 1;
  };

  // Check RSVP status
  useEffect(() => {
    if (!user || !eventId) return;
    const checkRsvp = async () => {
      try {
        const rsvpDoc = await getDoc(doc(db, 'users', user.uid, 'rsvps', eventId));
        setIsRsvped(rsvpDoc.exists());
      } catch (err) {
        console.error('Error checking RSVP:', err);
      }
    };
    checkRsvp();
  }, [user, eventId]);

  const handleRsvp = async () => {
    if (!user || !event) return;
    setIsLoadingRsvp(true);
    try {
      const rsvpRef = doc(db, 'users', user.uid, 'rsvps', eventId);
      if (isRsvped) {
        await deleteDoc(rsvpRef);
        setIsRsvped(false);
      } else {
        const nextOccurrence = getNextEventOccurrence(event);
        if (nextOccurrence) {
            await setDoc(rsvpRef, {
              eventId: event.id,
              addedAt: new Date(),
              nextOccurrence: nextOccurrence
            });
            setIsRsvped(true);
        }
      }
    } catch (err) {
      console.error('Error toggling RSVP:', err);
    } finally {
      setIsLoadingRsvp(false);
    }
  };

  // Auto-join removed in favor of manual batch selection
  // useEffect(() => { ... }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-[var(--text-secondary)]">Loading event...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <InfoCard className="max-w-md">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Event Not Found</h1>
          <p className="text-[var(--text-secondary)] mb-6">This event does not exist or has been deleted.</p>
          <Button onClick={() => router.push('/dashboard')}>
            Return to Dashboard
          </Button>
        </InfoCard>
      </div>
    );
  }

  const isChatEnabled = currentPhase === 'arrival' || currentPhase === 'close';

  return (
    <div className="min-h-screen">
      <Header currentPage={isPrivateMode ? 'my-cave' : 'other'} />

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
             
             {isCreator && (
               <div className="flex gap-2">
                   <EditButton eventId={eventId} isStarted={elapsedSeconds >= 0} isPrivateMode={isPrivateMode} />
                 <Button 
                   variant="secondary" 
                   onClick={handleDeleteEvent}
                   className="text-sm px-3 py-1 h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                 >
                   Delete
                 </Button>
               </div>
             )}
          </div>
          <p className="text-[var(--text-secondary)]">{event.description}</p>
          
          {elapsedSeconds < 0 && (
            <div className="mt-4 flex flex-col items-start gap-4">
               {event && getNextEventOccurrence(event) && (
                 <div className="text-lg font-medium text-[var(--text-primary)]">
                   {formatEventDate(getNextEventOccurrence(event)!)}
                 </div>
               )}
               <div className="p-3 bg-[var(--surface-subtle)] rounded-[var(--radius-interactive)] inline-block">
                  <span className="font-semibold text-[var(--primary)]">
                    Event starts in {formatDuration(elapsedSeconds)}
                  </span>
               </div>
               
               {event && getNextEventOccurrence(event) && (
                 <div className="flex flex-col sm:flex-row gap-4 items-center">
                   <Button
                      onClick={handleRsvp}
                      variant="secondary"
                      className={`min-w-[140px] ${isRsvped ? 'bg-green-100 text-green-700 hover:bg-green-200' : ''}`}
                      disabled={isLoadingRsvp}
                    >
                      {isLoadingRsvp ? 'Updating...' : (isRsvped ? '✓ Signed Up' : '+ Sign Up')}
                    </Button>
                   <AddToCalendarButton
                     name={event.title}
                     description={`${event.description}\n\nFrom True Path Finder ${typeof window !== 'undefined' ? window.location.origin : ''}`}
                     options={['Google', 'Apple', 'Outlook.com']}
                     location={`${typeof window !== 'undefined' ? window.location.origin : ''}/events/${event.id}`}
                     startDate={getNextEventOccurrence(event)!.toISOString().split('T')[0]}
                     endDate={getNextEventOccurrence(event)!.toISOString().split('T')[0]}
                     startTime={getNextEventOccurrence(event)!.toTimeString().slice(0, 5)}
                     endTime={new Date(getNextEventOccurrence(event)!.getTime() + getEventDurationSeconds(event) * 1000).toTimeString().slice(0, 5)}
                     timeZone="currentBrowser"
                     buttonStyle="round"
                   />
                 </div>
               )}
            </div>
          )}
        </div>

        {/* Event Links */}
        {event.links.length > 0 && (
          <InfoCard className="mb-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Event Resources</h3>
            <div className="space-y-3">
              {event.links.map((link, index) => (
                <ResourceCard 
                  key={index}
                  title={link.title}
                  url={link.url}
                />
              ))}
            </div>
          </InfoCard>
        )}

        {/* Phase Indicator */}
        {currentPhase !== 'ended' && (
          <PhaseIndicator
            currentPhase={currentPhase as 'arrival' | 'practice' | 'close'}
            phases={event.phases}
            elapsedSeconds={elapsedSeconds}
            isEventStarted={elapsedSeconds >= 0}
            isPrivateMode={isPrivateMode}
          />
        )}



        {/* Private Mode: Notes instead of batches/chat */}
        {isPrivateMode && currentPhase !== 'ended' && (
          <EventNotes eventId={eventId} />
        )}

        {/* Public Mode: Batch Selection */}
        {!isPrivateMode && currentPhase !== 'ended' && (!selectedBatch || elapsedSeconds < 0) && (
           <InfoCard className="mb-6">
             {elapsedSeconds < 0 ? (
               <>
                 <div className="flex items-center mb-4">
                    <h3 className="text-xl font-semibold text-[var(--text-primary)]">Batch Selection</h3>
                    <InfoTooltip content={`Batches are limited to ${event.maxPerBatch} participants. Special Rule: If a new batch would have ${APP_CONFIG.BATCH_OVERFLOW_THRESHOLD} or less people and all other batches are full, you may be allowed to join full batches to avoid isolation.`} />
                 </div>
                 <div className="text-center py-8 bg-[var(--surface-subtle)] rounded-[var(--radius-interactive)]">
                   <p className="text-[var(--text-secondary)] font-medium">
                     Batches will open for joining when the event starts.
                   </p>
                 </div>
               </>
             ) : (
               <>
                 <h3 className="text-xl font-semibold mb-4 text-[var(--text-primary)]">Join a Batch</h3>
                 <p className="text-[var(--text-secondary)] mb-6">
                   Select a batch to join the conversation.
                 </p>
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {batches.map((batch) => (
                      <button
                        key={batch.batchNumber}
                        onClick={() => handleJoinBatch(batch.batchNumber)}
                        disabled={isJoining || (batch.participants.length >= event.maxPerBatch && !(batches.every(b => b.participants.length >= event.maxPerBatch) && batch.participants.length <= APP_CONFIG.BATCH_OVERFLOW_THRESHOLD))} 
                        className={`
                          p-4 rounded-[var(--radius-interactive)] transition-all text-left shadow-sm
                          ${batch.participants.length >= event.maxPerBatch
                            ? 'bg-gray-100 cursor-not-allowed opacity-60'
                            : 'bg-white hover:shadow-md'
                          }
                        `}
                      >
                        <div className="font-semibold text-lg mb-1">Batch {batch.batchNumber}</div>
                        <div className="text-sm text-[var(--text-secondary)]">
                          {batch.participants.length} / {event.maxPerBatch} participants
                        </div>
                      </button>
                    ))}
                    
                    {(batches.length === 0 || batches[batches.length - 1].participants.length >= event.maxPerBatch) && (
                      <button
                      onClick={() => handleJoinBatch(batches.length + 1)}
                      disabled={isJoining}
                      className="p-4 rounded-[var(--radius-interactive)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--primary)] transition-all flex items-center justify-center flex-col shadow-sm"
                    >
                      <span className="font-medium">
                        {batches.length === 0 ? 'Join Batch 1' : `Join Batch ${batches.length + 1}`}
                      </span>
                    </button>
                    )}
                  </div>
                  <div className="mt-4 flex items-start gap-2 text-sm text-[var(--text-muted)] bg-[var(--surface-subtle)] p-3 rounded-[var(--radius-interactive)]">
                    <span className="text-lg">ℹ️</span>
                    <p>
                      Batches are limited to {event.maxPerBatch} participants. 
                      <span className="block mt-1 italic">
                        Special Rule: If a new batch would have {APP_CONFIG.BATCH_OVERFLOW_THRESHOLD} or less people and all other batches are full, you may be allowed to join full batches to avoid isolation.
                      </span>
                    </p>
                  </div>
               </>
             )}
           </InfoCard>
        )}

        {/* Public Mode: Batch Info */}
        {!isPrivateMode && selectedBatch && currentPhase !== 'ended' && elapsedSeconds >= 0 && (
          <InfoCard className="mb-6">
            <p className="text-[var(--text-secondary)]">
              You are in <span className="font-semibold">Batch {selectedBatch}</span>
            </p>
          </InfoCard>
        )}

        {/* Public Mode: Chat Panel - Hidden during practice, and only if batch selected */}
        {!isPrivateMode && selectedBatch && elapsedSeconds >= 0 && currentPhase === 'arrival' && (
          <ChatPanel
            eventId={eventId}
            batchNumber={selectedBatch}
            isEnabled={true}
          />
        )}
        
        {!isPrivateMode && selectedBatch && currentPhase === 'practice' && (
          <InfoCard className="mb-6 text-center py-8">
            <p className="text-[var(--text-secondary)]">
              Text chat is disabled during practice. Focus on your work.
            </p>
          </InfoCard>
        )}
        
        {!isPrivateMode && selectedBatch && currentPhase === 'close' && (
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

export default function EventPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <EventPageContent />
    </Suspense>
  );
}
