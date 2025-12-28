'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { TPFEvent } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface EventCardProps {
  event: TPFEvent;
}

export default function EventCard({ event }: EventCardProps) {
  const router = useRouter();
  
  const getTimeUntilEvent = (): string => {
    const now = new Date();
    const start = new Date(event.startTime);
    const diffMs = start.getTime() - now.getTime();
    
    if (diffMs < 0) {
      return 'In Progress';
    }
    
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
    const totalSeconds = 
      event.phases.arrival.durationSeconds +
      event.phases.practice.durationSeconds +
      event.phases.close.durationSeconds;
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };
  
  const isEventLive = (): boolean => {
    const now = new Date();
    const start = new Date(event.startTime);
    const totalDuration = 
      event.phases.arrival.durationSeconds +
      event.phases.practice.durationSeconds +
      event.phases.close.durationSeconds;
    const end = new Date(start.getTime() + totalDuration * 1000);
    
    return now >= start && now <= end;
  };

  const handleJoinEvent = () => {
    router.push(`/events/${event.id}`);
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-charcoal mb-1">
            {event.title}
          </h3>
          <p className="text-sm text-gray-600">{event.description}</p>
        </div>
        
        {isEventLive() && (
          <span className="ml-4 px-3 py-1 bg-red-500 text-white text-sm font-semibold rounded-full animate-pulse">
            LIVE
          </span>
        )}
      </div>
      
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-gray-700">
          <span className="text-sm font-medium text-[var(--text-muted)] w-12">TIME</span>
          <span>{formatDateTime(event.startTime)}</span>
        </div>
        
        <div className="flex items-center text-gray-700">
          <span className="text-sm font-medium text-[var(--text-muted)] w-12">DUR</span>
          <span>{getTotalDuration()}</span>
        </div>
      </div>
      
      {!isEventLive() && (
        <div className="mb-4 p-3 bg-[var(--primary-light)] rounded-[var(--radius-interactive)]">
          <div className="text-[var(--primary-dark)] font-bold text-center">
            {getTimeUntilEvent()}
          </div>
        </div>
      )}
      
      {event.links && event.links.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-600 mb-2">Resources:</p>
          <div className="space-y-1">
            {event.links.map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-soft-blue hover:underline"
              >
                🔗 {link.title}
              </a>
            ))}
          </div>
        </div>
      )}
      
      <Button
        onClick={handleJoinEvent}
        className="w-full"
        variant={isEventLive() ? 'primary' : 'secondary'}
      >
        {isEventLive() ? 'Join Now' : 'View Details'}
      </Button>
    </Card>
  );
}
