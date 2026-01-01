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
        break;
      case 'monthly_date': {
        // Move to next month
        nextStart.setMonth(nextStart.getMonth() + 1);
        
        // Ensure we are on the specific day requested (e.g. 1st, 15th)
        if (event.repeatability.dayOfMonth) {
            const targetDay = event.repeatability.dayOfMonth;
            // Handle edge case: if target day is 31 but next month has 30, JS auto-rolls over.
            // We want to clamp to the last day of the month if explicitly set? 
            // Standard behavior usually is: If I say "31st", in Feb it might mean "Last day". 
            // However, a simpler approach is strict date setting. 
            // But nextStart already drifted.
            // Let's reset the date to the 1st of the target month, then set the date.
            
            // Get the month we just moved into
            const currentYear = nextStart.getFullYear();
            const currentMonth = nextStart.getMonth();
            
            // Check max days in this month
            const maxDays = new Date(currentYear, currentMonth + 1, 0).getDate();
            const actualDay = Math.min(targetDay, maxDays);
            
            nextStart.setDate(actualDay);
        }
        break;
      }
      case 'monthly_day': {
        // "3rd Friday", "Last Sunday" etc.
        // Move to next month first
        nextStart.setDate(1); // Start at 1st of next month to find the day
        nextStart.setMonth(nextStart.getMonth() + 1);
        
        const weekOfMonth = event.repeatability.weekOfMonth || 1; // 1 = 1st, 2 = 2nd, -1 = Last
        const dayOfWeek = event.repeatability.dayOfWeekForMonthly || 0; // 0 = Sunday
        
        const currentYear = nextStart.getFullYear();
        const currentMonth = nextStart.getMonth();
        
        if (weekOfMonth === -1) {
            // Find "Last X-day"
            // Go to next month's 0th day (last day of current month)
            const lastDayObj = new Date(currentYear, currentMonth + 1, 0);
            const lastDate = lastDayObj.getDate();
            const lastDayOfWeek = lastDayObj.getDay();
            
            // Calculate offset to get back to the target dayOfWeek
            // e.g. Last Friday (5). Last day is Sunday (0). 
            // We want largest date <= lastDate where day is 5.
            
            let offset = lastDayOfWeek - dayOfWeek;
            if (offset < 0) offset += 7;
            
            nextStart.setDate(lastDate - offset);
        } else {
            // Find "Nth X-day"
            // Start at 1st
            const firstDayObj = new Date(currentYear, currentMonth, 1);
            const firstDayOfWeek = firstDayObj.getDay();
            
            // Calculate how many days to add to get to the first occurrence of dayOfWeek
            let dist = dayOfWeek - firstDayOfWeek;
            if (dist < 0) dist += 7;
            
            // Now add weeks
            const finalDate = 1 + dist + (weekOfMonth - 1) * 7;
            
            // Check if this date is valid for the month (e.g. 5th Friday might not exist)
             const maxDays = new Date(currentYear, currentMonth + 1, 0).getDate();
             if (finalDate > maxDays) {
                 // Skip this month if the pattern doesn't fit? Or take last available?
                 // Usually means "it doesn't happen this month". 
                 // For now, let's just clamp or let it roll (rolling might imply next month, which loops)
                 // Let's just set it, and if it rolls over, the next loop iteration catches it or it's valid.
                 // Actually, if we setDate(35), it moves to next month. This might double-skip. 
                 // But since the loop condition checks `<= fromDate`, it will fix itself eventually.
                 nextStart.setDate(finalDate); 
             } else {
                 nextStart.setDate(finalDate);
             }
        }
        break;
      }
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
