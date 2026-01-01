
import { TPFEvent } from '../types';
import { getNextEventOccurrence } from '../lib/utils/eventUtils';

console.log('--- Testing Recurrence Logic ---');

const baseEvent: TPFEvent = {
    id: 'test',
    methodId: 'm1',
    title: 'Test Event',
    description: 'desc',
    links: [],
    phases: { arrival: { durationSeconds: 60 }, practice: { durationSeconds: 60 }, close: { durationSeconds: 60 } },
    startTime: new Date('2025-01-29T10:00:00'), // Starts Jan 29
    maxPerBatch: 10,
    createdBy: 'u1',
    repeatability: { type: 'monthly_date', dayOfMonth: 1, interval: 1, daysOfWeek: [] } as any // Repeats monthly on 1st
};

// Case 1: Monthly Date (Started Jan 29, Repeat Monthly on 1st)
// Expected Next: Feb 1, 2025 (since Jan 29 is past Jan 1, but we look for > Jan 29)
// Actually, if we pass fromDate = Jan 30.
console.log('Test 1: Monthly Date');
const next1 = getNextEventOccurrence(baseEvent, new Date('2025-01-30T10:00:00'));
console.log('Current: Jan 30, 2025. Event Rule: Monthly on 1st (Start Jan 29).');
console.log('Expected: Feb 1, 2025');
console.log('Actual:  ', next1?.toString());

const baseEvent2: TPFEvent = {
    ...baseEvent,
    startTime: new Date('2025-01-01T10:00:00'),
    repeatability: { type: 'monthly_day', weekOfMonth: 3, dayOfWeekForMonthly: 5, interval: 1, daysOfWeek: [] } as any // 3rd Friday
};
// Jan 2025: 1st is Wed. 
// Fri 3, Fri 10, Fri 17. 3rd Friday is Jan 17.
// Feb 2025: 1st is Sat.
// Fri 7, Fri 14, Fri 21. 3rd Friday is Feb 21.

console.log('\nTest 2: Monthly Day (3rd Friday)');
const next2 = getNextEventOccurrence(baseEvent2, new Date('2025-01-20T10:00:00')); // After Jan 17
console.log('Current: Jan 20, 2025. Event Rule: Monthly 3rd Friday');
console.log('Expected: Feb 21, 2025');
console.log('Actual:  ', next2?.toString());
