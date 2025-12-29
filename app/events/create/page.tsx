'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/src/lib/firebase/config';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Button, Input, Card, Header } from '@/components';
import { APP_CONFIG } from '@/lib/config';
import { RepeatabilityConfig } from '@/types';
import { useLocalStorage } from '@/lib/hooks/useLocalStorage';
import { useUnsavedChanges } from '@/lib/hooks/useUnsavedChanges';

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
  repeatability: RepeatabilityConfig;
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
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-[var(--text-primary)] text-white text-sm rounded-[var(--radius-interactive)] shadow-lg z-10">
          {content}
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

function CreateEventContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get methodId from URL
  const methodIdFromUrl = searchParams.get('methodId') || '';
  
  // Initial state for form
  const initialFormState: EventFormData = {
    title: '',
    description: '',
    methodId: methodIdFromUrl,
    links: [{ title: '', url: '' }],
    arrival: { hours: 0, minutes: 5, seconds: 0 },
    practice: { hours: 0, minutes: 20, seconds: 0 },
    close: { hours: 0, minutes: 5, seconds: 0 },
    startTime: '',
    maxPerBatch: APP_CONFIG.MAX_PARTICIPANTS_PER_BATCH,
    repeatability: {
      type: 'none',
      interval: 1,
      daysOfWeek: [],
    },
  };

  const [formData, setFormData, clearFormData, isLoaded] = useLocalStorage<EventFormData>('create_event_draft', initialFormState);

  // Check if form is dirty for unsaved changes warning
  // We can consider it dirty if it doesn't match initial empty state (ignoring methodId which comes from URL)
  // Or simpler: just always warn if there is data in storage?
  // Let's implement a simple check: if title or description has content.
  const isDirty = (formData.title !== '' || formData.description !== '');
  
  useUnsavedChanges(isDirty);
  
  // Update methodId when URL param changes
  useEffect(() => {
    if (methodIdFromUrl && isLoaded) {
       // Only update if it's different to avoid loops, and ensure we respect the URL source of truth for ID
       if (formData.methodId !== methodIdFromUrl) {
         setFormData(prev => ({ ...prev, methodId: methodIdFromUrl }));
       }
    }
  }, [methodIdFromUrl, isLoaded, formData.methodId, setFormData]);

  // ... rest of component


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
        repeatability: formData.repeatability,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'events'), eventData);
      
      // Clear persistence
      clearFormData();

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
      <Header />

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
                className="w-full px-4 py-3 bg-[var(--surface-subtle)] rounded-[var(--radius-interactive)] focus:bg-[var(--surface-muted)] focus:outline-none transition-colors resize-none"
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

            <div className="mb-6">
              <label className="flex items-center text-lg font-medium text-[var(--text-primary)] mb-2">
                Max Participants per Batch
                <InfoTooltip content={`Batches are limited to ${APP_CONFIG.MAX_PARTICIPANTS_PER_BATCH} participants to ensure meaningful connection. If a new batch would have ${APP_CONFIG.BATCH_OVERFLOW_THRESHOLD} or fewer people, they will be distributed among other batches even if they are 'full'.`} />
              </label>
              <Input
                 type="number"
                 value={formData.maxPerBatch}
                 disabled
                 className="bg-[var(--surface-muted)] text-[var(--text-muted)] cursor-not-allowed"
              />
              <p className="text-sm text-[var(--text-muted)] mt-1">Fixed at {APP_CONFIG.MAX_PARTICIPANTS_PER_BATCH} for optimal group dynamics.</p>
            </div>

            <div className="mb-6">
              <label className="block text-lg font-medium text-[var(--text-primary)] mb-2">
                Repeatability
              </label>
              <div className="space-y-4">
                <select
                  value={formData.repeatability.type}
                  onChange={(e) => setFormData({
                    ...formData,
                    repeatability: {
                      ...formData.repeatability,
                      type: e.target.value as RepeatabilityConfig['type'],
                      daysOfWeek: e.target.value === 'weekly' ? formData.repeatability.daysOfWeek : [],
                    }
                  })}
                  className="w-full px-4 py-3 bg-[var(--surface-subtle)] rounded-[var(--radius-interactive)] focus:bg-[var(--surface-muted)] focus:outline-none"
                >
                  <option value="none">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly_date">Monthly (on date)</option>
                  <option value="monthly_day">Monthly (on day)</option>
                </select>

                {formData.repeatability.type !== 'none' && (
                  <div className="space-y-4 p-4 bg-[var(--surface-subtle)] rounded-[var(--radius-interactive)]">
                    <div className="flex items-center gap-2">
                      <span>Repeat every</span>
                      <Input
                        type="number"
                        min="1"
                        value={formData.repeatability.interval}
                        onChange={(e) => setFormData({
                          ...formData,
                          repeatability: {
                            ...formData.repeatability,
                            interval: parseInt(e.target.value) || 1
                          }
                        })}
                        className="w-20"
                      />
                      <span>
                        {formData.repeatability.type === 'daily' && 'day(s)'}
                        {formData.repeatability.type === 'weekly' && 'week(s)'}
                        {formData.repeatability.type.startsWith('monthly') && 'month(s)'}
                      </span>
                    </div>

                    {formData.repeatability.type === 'weekly' && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Days of Week</label>
                        <div className="flex flex-wrap gap-2">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                            <button
                              key={day}
                              type="button"
                              onClick={() => {
                                const currentDays = formData.repeatability.daysOfWeek;
                                const newDays = currentDays.includes(index)
                                  ? currentDays.filter(d => d !== index)
                                  : [...currentDays, index];
                                setFormData({
                                  ...formData,
                                  repeatability: { ...formData.repeatability, daysOfWeek: newDays }
                                });
                              }}
                              className={`px-3 py-1 rounded-full text-sm ${
                                formData.repeatability.daysOfWeek.includes(index)
                                  ? 'bg-[var(--primary)] text-white'
                                  : 'bg-[var(--surface-muted)] text-[var(--text-secondary)]'
                              }`}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {formData.repeatability.type === 'monthly_date' && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Day of Month</label>
                         <Input
                          type="number"
                          min="1"
                          max="31"
                          value={formData.repeatability.dayOfMonth || 1}
                          onChange={(e) => setFormData({
                            ...formData,
                            repeatability: {
                              ...formData.repeatability,
                              dayOfMonth: parseInt(e.target.value) || 1
                            }
                          })}
                          className="w-full"
                        />
                      </div>
                    )}

                    {formData.repeatability.type === 'monthly_day' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Week</label>
                          <select
                            value={formData.repeatability.weekOfMonth || 1}
                            onChange={(e) => setFormData({
                              ...formData,
                              repeatability: {
                                ...formData.repeatability,
                                weekOfMonth: parseInt(e.target.value)
                              }
                            })}
                            className="w-full px-4 py-2 bg-[var(--background)] rounded-[var(--radius-interactive)]"
                          >
                            <option value={1}>First</option>
                            <option value={2}>Second</option>
                            <option value={3}>Third</option>
                            <option value={4}>Fourth</option>
                            <option value={-1}>Last</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Day</label>
                          <select
                            value={formData.repeatability.dayOfWeekForMonthly || 0}
                            onChange={(e) => setFormData({
                              ...formData,
                              repeatability: {
                                ...formData.repeatability,
                                dayOfWeekForMonthly: parseInt(e.target.value)
                              }
                            })}
                            className="w-full px-4 py-2 bg-[var(--background)] rounded-[var(--radius-interactive)]"
                          >
                            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => (
                              <option key={day} value={index}>{day}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
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
              <div key={index} className="mb-4 p-4 bg-[var(--surface-subtle)] rounded-[var(--radius-interactive)]">
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

export default function CreateEventPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)] flex items-center justify-center"><p>Loading...</p></div>}>
      <CreateEventContent />
    </Suspense>
  );
}
