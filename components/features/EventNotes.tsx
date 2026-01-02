'use client';

import React, { useState, useEffect } from 'react';
import { InfoCard } from '@/components';

interface EventNotesProps {
  eventId: string;
}

export default function EventNotes({ eventId }: EventNotesProps) {
  const [notes, setNotes] = useState('');
  
  // Load notes from localStorage
  useEffect(() => {
    const savedNotes = localStorage.getItem(`event-notes-${eventId}`);
    if (savedNotes) {
      setNotes(savedNotes);
    }
  }, [eventId]);
  
  // Auto-save notes to localStorage
  useEffect(() => {
    if (notes) {
      localStorage.setItem(`event-notes-${eventId}`, notes);
    }
  }, [notes, eventId]);

  return (
    <InfoCard className="mb-6">
      <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Notes</h3>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Write your private notes for this event..."
        className="input w-full min-h-[300px] resize-y"
      />
    </InfoCard>
  );
}
