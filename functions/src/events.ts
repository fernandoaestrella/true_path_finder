/**
 * Cloud Functions for Event Management
 * Handles batch auto-reassignment and event-related operations
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Auto-reassign participants from small batches (≤5 participants) to other batches
 * when all other batches are full
 * 
 * This function runs when a user joins or leaves a batch
 */
export const manageBatchReassignment = functions.firestore
  .document('events/{eventId}/batches/{batchNumber}')
  .onWrite(async (change, context) => {
    const eventId = context.params.eventId;
    const batchNumber = parseInt(context.params.batchNumber as string);

    try {
      // Get the event to know maxPerBatch
      const eventDoc = await db.collection('events').doc(eventId).get();
      if (!eventDoc.exists) {
        console.log('Event not found:', eventId);
        return;
      }

      const eventData = eventDoc.data();
      const maxPerBatch = eventData?.maxPerBatch || 21;

      // Get all batches for this event
      const batchesSnapshot = await db
        .collection('events')
        .doc(eventId)
        .collection('batches')
        .get();

      const batches: { number: number; participants: string[] }[] = [];
      batchesSnapshot.forEach((doc) => {
        batches.push({
          number: parseInt(doc.id),
          participants: doc.data().participants || [],
        });
      });

      // Check if there are any small batches (≤5 participants)
      const smallBatches = batches.filter(
        (b) => b.participants.length > 0 && b.participants.length <= 5
      );

      if (smallBatches.length === 0) {
        // No small batches to reassign
        return;
      }

      // Check if all other batches are full
      const otherBatches = batches.filter(
        (b) => !smallBatches.find((sb) => sb.number === b.number)
      );
      const allOthersFull = otherBatches.every(
        (b) => b.participants.length >= maxPerBatch
      );

      if (!allOthersFull) {
        // There are batches with space, don't reassign
        return;
      }

      // All other batches are full, allow small batch participants to join any batch
      // We'll do this by temporarily increasing the max capacity for these users
      // In the client-side code, we need to check if a user is in a small batch
      // and allow them to join full batches

      // For now, we'll log this situation
      console.log(`Event ${eventId}: Small batches exist but all others are full`);
      console.log('Small batches:', smallBatches.map((b) => b.number));
      
      // Store metadata in the event document to signal client-side logic
      await db.collection('events').doc(eventId).update({
        hasSmallBatchesWithFullOthers: true,
        smallBatchNumbers: smallBatches.map((b) => b.number),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    } catch (error) {
      console.error('Error in manageBatchReassignment:', error);
    }
  });

/**
 * Clean up old events (older than 7 days after end time)
 */
export const cleanupOldEvents = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    try {
      const eventsSnapshot = await db
        .collection('events')
        .where('startTime', '<', sevenDaysAgo)
        .get();

      const batch = db.batch();
      let count = 0;

      for (const eventDoc of eventsSnapshot.docs) {
        const eventData = eventDoc.data();
        const totalDuration =
          (eventData.phases?.arrival?.durationSeconds || 0) +
          (eventData.phases?.practice?.durationSeconds || 0) +
          (eventData.phases?.close?.durationSeconds || 0);

        const endTime = new Date(eventData.startTime.toDate());
        endTime.setSeconds(endTime.getSeconds() + totalDuration);

        if (endTime < sevenDaysAgo) {
          // Delete the event and its subcollections
          batch.delete(eventDoc.ref);
          
          // Delete batches subcollection
          const batchesSnapshot = await eventDoc.ref.collection('batches').get();
          batchesSnapshot.forEach((batchDoc) => {
            batch.delete(batchDoc.ref);
          });

          count++;
        }
      }

      if (count > 0) {
        await batch.commit();
        console.log(`Cleaned up ${count} old events`);
      }

      return null;
    } catch (error) {
      console.error('Error in cleanupOldEvents:', error);
      return null;
    }
  });

/**
 * Send notification when event is about to start (15 minutes before)
 * This is a placeholder for future implementation
 */
export const sendEventReminder = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    const now = new Date();
    const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);

    try {
      const eventsSnapshot = await db
        .collection('events')
        .where('startTime', '>', tenMinutesFromNow)
        .where('startTime', '<', fifteenMinutesFromNow)
        .where('reminderSent', '==', false)
        .get();

      const batch = db.batch();
      let count = 0;

      eventsSnapshot.forEach((eventDoc) => {
        const eventData = eventDoc.data();
        
        // TODO: Send actual notifications to participants
        // For now, just mark as reminder sent
        batch.update(eventDoc.ref, { reminderSent: true });
        
        console.log(`Would send reminder for event: ${eventData.title}`);
        count++;
      });

      if (count > 0) {
        await batch.commit();
        console.log(`Marked ${count} event reminders as sent`);
      }

      return null;
    } catch (error) {
      console.error('Error in sendEventReminder:', error);
      return null;
    }
  });
