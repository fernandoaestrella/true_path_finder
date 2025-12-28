'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/src/lib/firebase/config';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { TimerBar, LogoutIcon } from '@/components';
import { useSessionTimer } from '@/lib/hooks/useSessionTimer';

interface PhaseConfig {
  hours: number;
  minutes: number;
  seconds: number;
}

interface EventFormData {
  title: string;
  description: string;
  methodId: string;
  links: { title: string; url: string }[];
  arrival: PhaseConfig;
  practice: PhaseConfig;
  close: PhaseConfig;
  startTime: string; // datetime-local format
  maxPerBatch: number;
}

const InfoTooltip = ({ content }: { content: string }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div className="relative inline-block ml-2">
      <button
        type="button"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className="w-5 h-5 rounded-full bg-[var(--primary)] text-white text-sm flex items-center justify-center cursor-help hover:bg-[var(--primary-dark)] transition-colors"
        aria-label="More information"
      >
        i
      </button>
      {showTooltip && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-[var(--text-primary)] text-white text-sm rounded-lg shadow-lg z-10">
          {content}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[var(--text-primary)]"></div>
        </div>
      )}
    </div>
  );
};

const PhaseInput = ({ 
  label, 
  tooltip, 
  value, 
  onChange 
}: { 
  label: string; 
  tooltip: string; 
  value: PhaseConfig; 
  onChange: (config: PhaseConfig) => void;
}) => {
  return (
    <div className="mb-6">
      <label className="flex items-center text-lg font-medium text-[var(--text-primary)] mb-3">
        {label}
        <InfoTooltip content={tooltip} />
      </label>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Hours</label>
          <Input
            type="number"
            min="0"
            value={value.hours}
            onChange={(e) => onChange({ ...value, hours: parseInt(e.target.value) || 0 })}
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Minutes</label>
          <Input
            type="number"
            min="0"
            max="59"
            value={value.minutes}
            onChange={(e) => onChange({ ...value, minutes: parseInt(e.target.value) || 0 })}
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Seconds</label>
          <Input
            type="number"
            min="0"
            max="59"
            value={value.seconds}
            onChange={(e) => onChange({ ...value, seconds: parseInt(e.target.value) || 0 })}
            placeholder="0"
          />
        </div>
      </div>
    </div>
  );
};

export default function CreateEventPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const { minutes, seconds, isPaused } = useSessionTimer();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get methodId from URL
  const methodIdFromUrl = searchParams.get('methodId') || '';
  
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    methodId: methodIdFromUrl,
    links: [{ title: '', url: '' }],
    arrival: { hours: 0, minutes: 5, seconds: 0 },
    practice: { hours: 0, minutes: 20, seconds: 0 },
    close: { hours: 0, minutes: 5, seconds: 0 },
    startTime: '',
    maxPerBatch: 21,
  });
  
  // Update methodId when URL param changes
  useEffect(() => {
    if (methodIdFromUrl) {
      setFormData(prev => ({ ...prev, methodId: methodIdFromUrl }));
    }
  }, [methodIdFromUrl]);

  const calculatePhaseSeconds = (config: PhaseConfig): number => {
    return config.hours * 3600 + config.minutes * 60 + config.seconds;
  };

  const addLink = (): void => {
    setFormData({
      ...formData,
      links: [...formData.links, { title: '', url: '' }],
    });
  };

  const removeLink = (index: number): void => {
    setFormData({
      ...formData,
      links: formData.links.filter((_, i) => i !== index),
    });
  };

  const updateLink = (index: number, field: 'title' | 'url', value: string): void => {
    const newLinks = [...formData.links];
    newLinks[index][field] = value;
    setFormData({ ...formData, links: newLinks });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      alert('You must be logged in to create an event');
      return;
    }

    setIsSubmitting(true);

    try {
      const eventData = {
        methodId: formData.methodId || 'temp-method-id', // TODO: Handle properly
        title: formData.title,
        description: formData.description,
        links: formData.links.filter(link => link.title && link.url),
        phases: {
          arrival: { durationSeconds: calculatePhaseSeconds(formData.arrival) },
          practice: { durationSeconds: calculatePhaseSeconds(formData.practice) },
          close: { durationSeconds: calculatePhaseSeconds(formData.close) },
        },
        startTime: new Date(formData.startTime),
        maxPerBatch: formData.maxPerBatch,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'events'), eventData);
      
      // Redirect back to method page with events tab
      router.push(`/methods/${formData.methodId}?tab=events`);
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="sticky top-0 z-30 pt-8 pb-6 bg-[var(--background)]">
        <div className="container flex items-center justify-between">
          {/* Back link */}
          <div className="flex-1">
            <a href="/dashboard" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">
              ← Dashboard
            </a>
          </div>
          
          {/* Timer centered */}
          <div className="flex items-center gap-2">
            <TimerBar minutes={minutes} seconds={seconds} isPaused={isPaused} />
          </div>
          
          {/* Logout icon on the right */}
          <div className="flex-1 flex justify-end">
            <button
              onClick={logout}
              className="cursor-pointer hover:text-[var(--primary)] transition-colors text-[var(--text-secondary)]" 
              aria-label="Logout"
              title="Logout"
            >
              <LogoutIcon size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="container py-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Create Event</h1>
        <p className="text-[var(--text-secondary)] mb-8">
          Organize an event to practice this together
        </p>

        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-6">Event Details</h2>
            
            <div className="mb-6">
              <label className="block text-lg font-medium text-[var(--text-primary)] mb-2">
                Event Title
              </label>
              <Input
                type="text"
                value={formData.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Weekly Practice Session"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-lg font-medium text-[var(--text-primary)] mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what participants will do during this event..."
                required
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-soft-blue focus:outline-none transition-colors"
              />
            </div>

            <div className="mb-6">
              <label className="block text-lg font-medium text-[var(--text-primary)] mb-2">
                Start Time
              </label>
              <Input
                type="datetime-local"
                value={formData.startTime}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
            </div>
          </Card>

          <Card className="mb-6">
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-6">Event Phases</h2>
            
            <PhaseInput
              label="Arrival Phase"
              tooltip="Time for participants to join, introduce themselves, and prepare. Chat is enabled during this phase."
              value={formData.arrival}
              onChange={(arrival) => setFormData({ ...formData, arrival })}
            />

            <PhaseInput
              label="Practice Phase"
              tooltip="Focused practice time. Chat is disabled to minimize distractions and allow deep work."
              value={formData.practice}
              onChange={(practice) => setFormData({ ...formData, practice })}
            />

            <PhaseInput
              label="Close Phase"
              tooltip="Time to reflect, share experiences, and say goodbye. Chat is enabled again."
              value={formData.close}
              onChange={(close) => setFormData({ ...formData, close })}
            />
          </Card>

          <Card className="mb-6">
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-6">Resources & Links</h2>
            
            {formData.links.map((link, index) => (
              <div key={index} className="mb-4 p-4 bg-[var(--surface-subtle)] rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-md font-medium text-[var(--text-primary)]">
                    Link {index + 1}
                  </label>
                  {formData.links.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLink(index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
                
                <div className="mb-2">
                  <Input
                    type="text"
                    value={link.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateLink(index, 'title', e.target.value)}
                    placeholder="Link title (e.g., Event Agenda)"
                  />
                </div>
                
                <div>
                  <Input
                    type="url"
                    value={link.url}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateLink(index, 'url', e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>
            ))}

            <Button
              type="button"
              onClick={addLink}
              variant="secondary"
              className="w-full"
            >
              + Add Another Link
            </Button>
          </Card>

          <div className="flex gap-4">
            <Button
              type="button"
              onClick={() => router.back()}
              variant="secondary"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Creating Event...' : 'Create Event'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
