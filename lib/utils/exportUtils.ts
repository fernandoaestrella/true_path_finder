import { db } from '@/src/lib/firebase/config';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Goal, Method, Review, TPFEvent, ChosenGoal, ChosenMethod } from '@/types';

// Helper to escape CSV/Markdown fields if needed
const safeString = (str: string | undefined) => str ? str.replace(/"/g, '""') : '';

interface UserDataExport {
  user: {
    uid: string;
    email: string | null;
  };
  chosenGoals: (Goal & { addedAt?: Date })[];
  chosenMethods: (Method & ChosenMethod)[];
  createdGoals: Goal[];
  createdMethods: Method[];
  myReviews: Review[];
  myEvents: TPFEvent[]; // Events created or joined
}

export async function fetchAllUserData(userId: string, userEmail: string | null): Promise<UserDataExport> {
  const data: UserDataExport = {
    user: { uid: userId, email: userEmail },
    chosenGoals: [],
    chosenMethods: [],
    createdGoals: [],
    createdMethods: [],
    myReviews: [],
    myEvents: [],
  };

  try {
    // 1. Fetch Chosen Goals
    const chosenGoalsRef = collection(db, 'users', userId, 'chosenGoals');
    const chosenGoalsSnap = await getDocs(chosenGoalsRef);
    const chosenGoalIds = chosenGoalsSnap.docs.map(d => d.id);
    const chosenGoalsMap = new Map(chosenGoalsSnap.docs.map(d => [d.id, d.data()]));

    if (chosenGoalIds.length > 0) {
      // In a real app we might batch this, here we might fetch all goals or filter
      // For simplicity let's fetch individual docs if < 10, or query 'in' chunks
      // Actually, let's just use the 'allGoals' approach if possible, but here we want to be standalone.
      // We will loop for now, assuming user doesn't have 1000 goals.
      const goalsPromises = chosenGoalIds.map(gid => getDoc(doc(db, 'goals', gid)));
      const goalsDocs = await Promise.all(goalsPromises);
      data.chosenGoals = goalsDocs
        .filter(d => d.exists())
        .map(d => ({
          id: d.id,
          ...(d.data() as Omit<Goal, 'id'>),
          addedAt: chosenGoalsMap.get(d.id)?.addedAt?.toDate(),
        }));
    }

    // 2. Fetch Chosen Methods
    const chosenMethodsRef = collection(db, 'users', userId, 'chosenMethods');
    const chosenMethodsSnap = await getDocs(chosenMethodsRef);
    const chosenMethodsData = chosenMethodsSnap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as ChosenMethod));
    
    // Fetch details for these methods
    const methodIds = chosenMethodsData.map(m => m.methodId);
    if (methodIds.length > 0) {
       const methodsPromises = methodIds.map(mid => getDoc(doc(db, 'methods', mid)));
       const methodsDocs = await Promise.all(methodsPromises);
       const methodsMap = new Map(methodsDocs.filter(d => d.exists()).map(d => [d.id, d.data() as Omit<Method, 'id'>]));
       
       data.chosenMethods = chosenMethodsData.map(cm => {
         const details = methodsMap.get(cm.methodId);
         return {
           ...cm,
           ...(details || {} as any), // If method deleted, we might have partial data
           id: cm.methodId, // Ensure ID matches method ID
         };
       });
    }

    // 3. Fetch Created Goals
    const createdGoalsQuery = query(collection(db, 'goals'), where('createdBy', '==', userId));
    const createdGoalsSnap = await getDocs(createdGoalsQuery);
    data.createdGoals = createdGoalsSnap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Goal, 'id'>) }));

    // 4. Fetch Created Methods
    const createdMethodsQuery = query(collection(db, 'methods'), where('createdBy', '==', userId));
    const createdMethodsSnap = await getDocs(createdMethodsQuery);
    data.createdMethods = createdMethodsSnap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Method, 'id'>) }));

    // 5. Fetch My Reviews
    const reviewsQuery = query(collection(db, 'reviews'), where('userId', '==', userId));
    const reviewsSnap = await getDocs(reviewsQuery);
    data.myReviews = reviewsSnap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Review, 'id'>) }));

    // 6. Fetch Events (Created or RSVP'd)
    // Created
    const createdEventsQuery = query(collection(db, 'events'), where('createdBy', '==', userId));
    const createdEventsSnap = await getDocs(createdEventsQuery);
    const createdEvents = createdEventsSnap.docs.map(d => ({ id: d.id, ...d.data() } as TPFEvent));
    
    // RSVP'd
    const rsvpsRef = collection(db, 'users', userId, 'rsvps');
    const rsvpsSnap = await getDocs(rsvpsRef);
    const rsvpEventIds = rsvpsSnap.docs.map(d => d.data().eventId);
    
    // Fetch RSVPs details
    let rsvpEvents: TPFEvent[] = [];
    if (rsvpEventIds.length > 0) {
        const uniqueIds = Array.from(new Set(rsvpEventIds.filter(id => !createdEvents.find(e => e.id === id))));
        const rsvpPromises = uniqueIds.map(eid => getDoc(doc(db, 'events', eid)));
        const rsvpDocs = await Promise.all(rsvpPromises);
        rsvpEvents = rsvpDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() } as TPFEvent));
    }

    data.myEvents = [...createdEvents, ...rsvpEvents];

  } catch (error) {
    console.error("Error fetching user data for export", error);
    throw error;
  }

  return data;
}

export function generateJsonExport(data: UserDataExport): string {
  return JSON.stringify(data, null, 2);
}

export function generateMarkdownExport(data: UserDataExport): string {
  let md = `# User Data Export for ${data.user.email || data.user.uid}\n\n`;
  md += `Export Date: ${new Date().toLocaleString()}\n\n`;

  md += `## 1. My Goals (Chosen)\n`;
  if (data.chosenGoals.length === 0) md += `*No goals chosen.*\n`;
  data.chosenGoals.forEach(g => {
    md += `### ${g.title}\n`;
    md += `- **Description**: ${g.description}\n`;
    md += `- **Added**: ${g.addedAt ? new Date(g.addedAt).toLocaleDateString() : 'N/A'}\n\n`;
  });

  md += `\n## 2. My Methods (Chosen)\n`;
  if (data.chosenMethods.length === 0) md += `*No methods chosen.*\n`;
  data.chosenMethods.forEach(m => {
    md += `### ${m.title}\n`;
    md += `- **Description**: ${m.description}\n`;
    md += `- **Status**: ${m.status}\n`;
    md += `- **Attempts**: ${m.attempts?.length || 0}\n\n`;
  });

  md += `\n## 3. Reviews Written\n`;
  if (data.myReviews.length === 0) md += `*No reviews written.*\n`;
  data.myReviews.forEach(r => {
    md += `- **Method ID**: ${r.methodId}\n`; // Ideally we'd map this to title, but keeping it simple
    md += `- **Score**: ${r.score}/5\n`;
    md += `- **Content**: ${r.content}\n`;
    md += `- **Date**: ${r.createdAt ? new Date(r.createdAt as any).toLocaleDateString() : 'N/A'}\n\n`;
  });

  md += `\n## 4. Created Content\n`;
  md += `### Goals Created: ${data.createdGoals.length}\n`;
  data.createdGoals.forEach(g => md += `- ${g.title}\n`);
  
  md += `### Methods Created: ${data.createdMethods.length}\n`;
  data.createdMethods.forEach(m => md += `- ${m.title}\n`);

  md += `\n## 5. Events\n`;
  if (data.myEvents.length === 0) md += `*No events.*\n`;
  data.myEvents.forEach(e => {
    md += `### ${e.title}\n`;
    md += `- **Start**: ${e.startTime ? new Date(e.startTime as any).toLocaleString() : 'N/A'}\n`;
    md += `- **Role**: ${e.createdBy === data.user.uid ? 'Creator' : 'Participant'}\n\n`;
  });

  return md;
}

export function downloadFile(content: string, filename: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
