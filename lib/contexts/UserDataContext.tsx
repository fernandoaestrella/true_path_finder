'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { db } from '@/src/lib/firebase/config';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Goal, Method, TPFEvent } from '@/types';
import { getNextEventOccurrence } from '@/lib/utils/eventUtils';

interface MethodsByGoal {
  goal: Goal;
  methods: Method[];
}

interface UserDataContextType {
  chosenGoals: Goal[];
  allGoals: Goal[];
  methodsByGoal: MethodsByGoal[];
  myEvents: TPFEvent[];
  isLoading: boolean;
  refreshUserData: () => Promise<void>;
}

const UserDataContext = createContext<UserDataContextType>({
  chosenGoals: [],
  allGoals: [],
  methodsByGoal: [],
  myEvents: [],
  isLoading: true,
  refreshUserData: async () => {},
});

export function useUserData() {
  return useContext(UserDataContext);
}

export function UserDataProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  
  const [chosenGoals, setChosenGoals] = useState<Goal[]>([]);
  const [allGoals, setAllGoals] = useState<Goal[]>([]);
  const [methodsByGoal, setMethodsByGoal] = useState<MethodsByGoal[]>([]);
  const [myEvents, setMyEvents] = useState<TPFEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Define fetch function outside useEffect so it can be exported
  const refreshUserData = useCallback(async () => {
    // If we only have user, proceeding is fine.
    
    let fetchedGoals: Goal[] = [];

    try {
      // 0. Fetch all goals (globally useful)
      // We do this regardless of user to ensure cache is hot for Goals page
      // But for simplicity/security, we assume auth'd user access
      if (user) {
         const goalsRef = collection(db, 'goals');
         const goalsSnap = await getDocs(goalsRef);
         const goalsData = goalsSnap.docs.map(doc => ({
           id: doc.id,
           ...doc.data(),
           createdAt: doc.data().createdAt?.toDate() || new Date(),
         })) as Goal[];
         setAllGoals(goalsData);
         
         // 1. Fetch chosen goals
         const chosenGoalsRef = collection(db, 'users', user.uid, 'chosenGoals');
         const chosenGoalsSnap = await getDocs(chosenGoalsRef);
         const goalIds = chosenGoalsSnap.docs.map(doc => doc.id);
         
          if (goalIds.length > 0) {
            fetchedGoals = goalsData.filter(g => goalIds.includes(g.id));
            setChosenGoals(fetchedGoals);
          } else {
            setChosenGoals([]);
          }
      }

      if (!user) return;

      // 2. Fetch chosen methods
      const chosenMethodsRef = collection(db, 'users', user.uid, 'chosenMethods');
      const chosenMethodsSnap = await getDocs(query(chosenMethodsRef, where('status', '==', 'active')));
      
      const methodShortcuts: Record<string, string> = {};
      chosenMethodsSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.shortcutResourceId) {
          methodShortcuts[doc.id] = data.shortcutResourceId;
        }
      });

      const methodIds = chosenMethodsSnap.docs.map(doc => doc.id);
      
      // Re-access fetchedGoals logic from chosenGoals state or local calculation
      // Since we just set it above inside 'if (user)', and we returned if (!user), 
      // we need to access the chosen goals.
      // Easiest is to retrieve from 'allGoals' via 'chosenGoals' logic again or use the closure variable if lifted.
      
      // Let's lift 'fetchedGoals' to outer scope of try block.

      
      if (methodIds.length > 0) {
        const methodsRef = collection(db, 'methods');
        // Optimization: Fetch only needed methods
        // Firestore 'in' query supports max 10, so if > 10 we might need batches or just fetch all?
        // For now, let's just fetch all methods to be safe/simple, or optimize to fetch by ID list if small.
        // Or better: Fetch all methods to cache them for "Goals -> Methods" page too?
        // Fetching all methods might be too heavy eventually.
        // Let's stick to current logic: fetch all methods?
        // Old logic: fetched all methods.
        const methodsSnap = await getDocs(methodsRef);
        const methods = methodsSnap.docs
          .filter(doc => methodIds.includes(doc.id))
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            stats: doc.data().stats || { activeUsers: 0, avgRating: 0, reviewCount: 0 },
            shortcutResourceId: methodShortcuts[doc.id]
          })) as (Method & { shortcutResourceId?: string })[];
          

        const grouped = fetchedGoals.map(goal => ({
          goal,
          methods: methods.filter(m => m.goalId === goal.id),
        }));
        setMethodsByGoal(grouped);
      } else {
        setMethodsByGoal(fetchedGoals.map(goal => ({ goal, methods: [] })));
      }

      // 3. Fetch User's RSVPd Events
      const rsvpsRef = collection(db, 'users', user.uid, 'rsvps');
      const rsvpsSnap = await getDocs(rsvpsRef);
      const eventIds = rsvpsSnap.docs.map(doc => doc.data().eventId || doc.id);

      if (eventIds.length > 0) {
        const eventsData: TPFEvent[] = [];
        for (const eid of eventIds) {
          const eventDoc = await getDoc(doc(db, 'events', eid));
          if (eventDoc.exists()) {
            const data = eventDoc.data();
            eventsData.push({
              id: eventDoc.id,
              methodId: data.methodId,
              title: data.title,
              description: data.description,
              links: data.links || [],
              phases: data.phases,
              startTime: data.startTime?.toDate() || new Date(),
              maxPerBatch: data.maxPerBatch,
              repeatability: data.repeatability,
              createdBy: data.createdBy,
            } as TPFEvent);
          }
        }
        
        eventsData.sort((a, b) => {
          const nextA = getNextEventOccurrence(a)?.getTime() || 0;
          const nextB = getNextEventOccurrence(b)?.getTime() || 0;
          return nextA - nextB;
        });
        
        setMyEvents(eventsData.filter(e => getNextEventOccurrence(e) !== null));
      } else {
        setMyEvents([]);
      }

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    if (!authLoading) {
      if (user) {
        refreshUserData();
      } else {
        setChosenGoals([]);
        setMethodsByGoal([]);
        setMyEvents([]);
        setIsLoading(false);
      }
    }
  }, [user, authLoading, refreshUserData]);

  return (
    <UserDataContext.Provider value={{ 
      chosenGoals, 
      allGoals,
      methodsByGoal, 
      myEvents, 
      isLoading,
      refreshUserData 
    }}>
      {children}
    </UserDataContext.Provider>
  );
}
