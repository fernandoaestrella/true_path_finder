import { TPFEvent } from '@/types';

export function getNextEventOccurrence(event: TPFEvent, fromDate: Date = new Date()): Date | null {
  const start = new Date(event.startTime);
  const durationSeconds = 
    (event.phases.arrival.durationSeconds || 0) + 
    (event.phases.practice.durationSeconds || 0) + 
    (event.phases.close.durationSeconds || 0);
  const end = new Date(start.getTime() + durationSeconds * 1000);

  // If strict end time is in the past and no recurrence, it's done.
  if (!event.repeatability || event.repeatability.type === 'none') {
    return end > fromDate ? start : null;
  }

  // Handle Recurrence
  let nextStart = new Date(start);
  
  // If the original start is in the future, that's the next occurrence
  if (nextStart > fromDate) {
    return nextStart;
  }

  // Otherwise, calculate the next one based on interval
  // We need to iterate until we find one > fromDate (or just one that hasn't finished yet)
  // For simplicity, let's look for one that Ends after fromDate.
  
  // Create a safety break
  let safety = 0;
  while (new Date(nextStart.getTime() + durationSeconds * 1000) <= fromDate) {
    safety++;
    if (safety > 1000) break; // Avoid infinite loops if interval is weird

    switch (event.repeatability.type) {
      case 'daily':
        nextStart.setDate(nextStart.getDate() + (event.repeatability.interval || 1));
        break;
      case 'weekly':
        nextStart.setDate(nextStart.getDate() + (event.repeatability.interval || 1) * 7);
        // Note: Simple weekly logic assumes start day is the day. 
        // If daysOfWeek is complex (e.g. Mon AND Wed), we need better logic.
        // For MVP, assuming the repeat type implies the pattern starts from startTime.
        // If the user picked "Weekly on Mon, Wed", and startTime was Mon...
        // We probably need to check the daysOfWeek array.
        // Let's implement simpler logic for now matching the creation form capabilities often seen.
        break;
      case 'monthly_date':
        nextStart.setMonth(nextStart.getMonth() + 1);
        break;
      case 'monthly_day':
        nextStart.setMonth(nextStart.getMonth() + 1);
        // Complex calculation for "3rd Friday" etc would go here
        break;
      default:
        return null;
    }
  }

  return nextStart;
}

export function isEventLive(event: TPFEvent): boolean {
  const now = new Date();
  const nextStart = getNextEventOccurrence(event, now);
  if (!nextStart) return false;
  
  const durationSeconds = 
    (event.phases.arrival.durationSeconds || 0) + 
    (event.phases.practice.durationSeconds || 0) + 
    (event.phases.close.durationSeconds || 0);
    
  // If next occurrence starts in past (meaning it started recently) and ends in future
  const nextEnd = new Date(nextStart.getTime() + durationSeconds * 1000);
  
  // However, getNextEventOccurrence returns the *next valid* one. 
  // If we use logic `while (end <= fromDate)`, then `nextStart` will be the current one if we are in the middle of it.
  
  return nextStart <= now && nextEnd >= now;
}

export function getEventDurationSeconds(event: TPFEvent) {
  return (event.phases.arrival.durationSeconds || 0) + 
         (event.phases.practice.durationSeconds || 0) + 
         (event.phases.close.durationSeconds || 0);
}
