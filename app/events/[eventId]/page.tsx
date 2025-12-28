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
        setElapsedSeconds(0);
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

  // Auto-join batch on arrival phase
  useEffect(() => {
    const autoJoin = async () => {
      if (!user || !event || selectedBatch !== null || currentPhase !== 'arrival') return;
      const nextBatch = getNextAvailableBatch();
      await handleJoinBatch(nextBatch);
    };
    autoJoin();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, event, currentPhase, selectedBatch]);

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
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">{event.title}</h1>
          <p className="text-[var(--text-secondary)]">{event.description}</p>
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

        {/* Batch Info */}
        {selectedBatch && currentPhase !== 'ended' && (
          <Card className="mb-6">
            <p className="text-[var(--text-secondary)]">
              You are in <span className="font-semibold">Batch {selectedBatch}</span>
            </p>
          </Card>
        )}

        {/* Chat Panel - Hidden during practice */}
        {selectedBatch && currentPhase === 'arrival' && (
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
