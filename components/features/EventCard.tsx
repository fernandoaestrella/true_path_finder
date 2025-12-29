import React from 'react';
import { useRouter } from 'next/navigation';
import { TPFEvent } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AddToCalendarButton } from 'add-to-calendar-button-react';
import { getNextEventOccurrence, getEventDurationSeconds } from '@/lib/utils/eventUtils';
import { useAuth } from '@/lib/contexts/AuthContext';
import { doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase/config';

interface EventCardProps {
  event: TPFEvent;
  onRsvpChange?: () => void; // Callback to refresh parent list
}

export default function EventCard({ event, onRsvpChange }: EventCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isRsvped, setIsRsvped] = React.useState(false);
  const [isLoadingRsvp, setIsLoadingRsvp] = React.useState(false);
  
  // Calculate next occurrence
  const nextOccurrence = getNextEventOccurrence(event);
  const durationSeconds = getEventDurationSeconds(event);
  
  // Check RSVP status
  React.useEffect(() => {
    if (!user) return;
    const checkRsvp = async () => {
      try {
        const rsvpDoc = await getDoc(doc(db, 'users', user.uid, 'rsvps', event.id));
        setIsRsvped(rsvpDoc.exists());
      } catch (err) {
        console.error('Error checking RSVP:', err);
      }
    };
    checkRsvp();
  }, [user, event.id]);

  const handleRsvp = async () => {
    if (!user) return;
    setIsLoadingRsvp(true);
    try {
      const rsvpRef = doc(db, 'users', user.uid, 'rsvps', event.id);
      if (isRsvped) {
        await deleteDoc(rsvpRef);
        setIsRsvped(false);
      } else {
        await setDoc(rsvpRef, {
          eventId: event.id,
          addedAt: new Date(),
          nextOccurrence: nextOccurrence // Store for sorting
        });
        setIsRsvped(true);
      }
      if (onRsvpChange) onRsvpChange();
    } catch (err) {
      console.error('Error toggling RSVP:', err);
    } finally {
      setIsLoadingRsvp(false);
    }
  };

  const getTimeUntilEvent = (): string => {
    if (!nextOccurrence) return 'Event Ended';
    
    const now = new Date();
    const diffMs = nextOccurrence.getTime() - now.getTime();
    
    // Check if live
    const end = new Date(nextOccurrence.getTime() + durationSeconds * 1000);
    if (now >= nextOccurrence && now <= end) {
      return 'In Progress';
    }
    
    if (diffMs < 0) return 'Ended'; // Should be handled by recurrence logic but safe fallback
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `In ${days} day${days !== 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `In ${hours} hour${hours !== 1 ? 's' : ''}, ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      return `In ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
  };
  
  const formatDateTime = (date: Date): string => {
    return new Date(date).toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  const getTotalDuration = (): string => {
    const hours = Math.floor(durationSeconds / 3600);
    const minutes = Math.floor((durationSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };
  
  const isEventLive = (): boolean => {
    if (!nextOccurrence) return false;
    const now = new Date();
    const end = new Date(nextOccurrence.getTime() + durationSeconds * 1000);
    return now >= nextOccurrence && now <= end;
  };

  const handleJoinEvent = () => {
    router.push(`/events/${event.id}`);
  };

  if (!nextOccurrence) return null; // Don't show ended events?

  return (
    <Card className="hover:shadow-lg transition-shadow bg-white h-full flex flex-col">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-charcoal mb-1">
            {event.title}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-2">{event.description}</p>
        </div>
        
        {isEventLive() && (
          <span className="ml-4 px-3 py-1 bg-red-500 text-white text-sm font-semibold rounded-full animate-pulse whitespace-nowrap">
            LIVE
          </span>
        )}
      </div>
      
      <div className="space-y-2 mb-4 flex-1">
        <div className="flex items-center text-gray-700">
          <span className="text-sm font-medium text-[var(--text-muted)] w-12">TIME</span>
          <span>{formatDateTime(nextOccurrence)}</span>
        </div>
        
        <div className="flex items-center text-gray-700">
          <span className="text-sm font-medium text-[var(--text-muted)] w-12">DUR</span>
          <span>{getTotalDuration()}</span>
        </div>
        
        {event.repeatability && event.repeatability.type !== 'none' && (
           <div className="flex items-center text-gray-700">
              <span className="text-sm font-medium text-[var(--text-muted)] w-12">RPT</span>
              <span className="text-sm bg-gray-100 px-2 py-0.5 rounded capitalize">{event.repeatability.type.replace('_', ' ')}</span>
           </div>
        )}
      </div>
      
      {!isEventLive() && (
        <div className="mb-4 p-3 bg-[var(--primary-light)] rounded-[var(--radius-interactive)]">
          <div className="text-[var(--primary-dark)] font-bold text-center">
            {getTimeUntilEvent()}
          </div>
        </div>
      )}
      
      <div className="mt-auto space-y-2">
         {/* Calendar Button */}
         <div className="flex justify-center">
            <AddToCalendarButton
               name={event.title}
               description={`${event.description}\n\nFrom True Path Finder ${typeof window !== 'undefined' ? window.location.origin : ''}`}
               options={['Google', 'Apple', 'Outlook.com']}
               location={`${typeof window !== 'undefined' ? window.location.origin : ''}/events/${event.id}`}
               startDate={nextOccurrence.toISOString().split('T')[0]}
               endDate={nextOccurrence.toISOString().split('T')[0]}
               startTime={nextOccurrence.toTimeString().slice(0, 5)}
               endTime={new Date(nextOccurrence.getTime() + durationSeconds * 1000).toTimeString().slice(0, 5)}
               timeZone="currentBrowser"
               buttonStyle="round" // or 'default'
               size="1" // small
            />
         </div>

         <div className="flex gap-2">
            <Button
              onClick={handleRsvp}
              variant="secondary"
              className={`flex-1 ${isRsvped ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' : ''}`}
              disabled={isLoadingRsvp}
            >
              {isLoadingRsvp ? 'Updating...' : (isRsvped ? '✓ Signed Up' : '+ Sign Up')}
            </Button>
            <Button
              onClick={handleJoinEvent}
              className="flex-1"
              variant={isEventLive() ? 'primary' : 'secondary'}
            >
              {isEventLive() ? 'Join Now' : 'Details'}
            </Button>
         </div>
      </div>
    </Card>
  );
}
