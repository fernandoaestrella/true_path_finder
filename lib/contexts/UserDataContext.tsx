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
    let fetchedGoals: Goal[] = [];

    try {
      // 0. Fetch all goals (Always needed for guests and users)
      const goalsRef = collection(db, 'goals');
      const goalsSnap = await getDocs(goalsRef);
      const goalsData = goalsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Goal[];
      
      let finalAllGoals = [...goalsData];

      if (!user) {
         // Include locally created guest goals
         const localCreatedGoals = JSON.parse(localStorage.getItem('guest_createdGoals') || '[]') as Goal[];
         finalAllGoals = [...finalAllGoals, ...localCreatedGoals];
      }
      
      setAllGoals(finalAllGoals);

      if (user) {
         // --- AUTHENTICATED LOGIC ---
         
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
          
          if (methodIds.length > 0) {
            const methodsRef = collection(db, 'methods');
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
                  isPrivate: data.isPrivate,
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

      } else {
        // --- GUEST LOGIC ---
        
        // 1. Load chosen goals from localStorage
        const localGoals = JSON.parse(localStorage.getItem('guest_chosenGoals') || '[]');
        if (localGoals.length > 0) {
          fetchedGoals = finalAllGoals.filter(g => localGoals.includes(g.id));
          setChosenGoals(fetchedGoals);
        } else {
          setChosenGoals([]);
        }

        // 2. Load chosen methods from localStorage
        const localMethods = JSON.parse(localStorage.getItem('guest_chosenMethods') || '{}');
        const methodIds = Object.keys(localMethods); // Record<methodId, {status, shortcutResourceId}>
        
        if (methodIds.length > 0) {
            const methodsRef = collection(db, 'methods');
            const methodsSnap = await getDocs(methodsRef);
            let methods = methodsSnap.docs
              .filter(doc => methodIds.includes(doc.id))
              .map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
                stats: doc.data().stats || { activeUsers: 0, avgRating: 0, reviewCount: 0 },
                shortcutResourceId: localMethods[doc.id]?.shortcutResourceId
              })) as (Method & { shortcutResourceId?: string })[];
              
            // Add local created methods that are chosen
            const localCreatedMethods = JSON.parse(localStorage.getItem('guest_createdMethods') || '[]') as Method[];
            const chosenLocalMethods = localCreatedMethods
                .filter(m => methodIds.includes(m.id))
                .map(m => ({
                    ...m,
                    createdAt: new Date(m.createdAt),
                    shortcutResourceId: localMethods[m.id]?.shortcutResourceId
                }));
            
            // Merge unique methods (local ones usually stick out, but handle overlaps if any)
            const combinedMethods = [...methods];
            chosenLocalMethods.forEach(localM => {
                if (!combinedMethods.find(m => m.id === localM.id)) {
                    combinedMethods.push(localM);
                }
            });
              
            const grouped = fetchedGoals.map(goal => ({
              goal,
              methods: combinedMethods.filter(m => m.goalId === goal.id),
            }));
            setMethodsByGoal(grouped);
        } else {
            setMethodsByGoal(fetchedGoals.map(goal => ({ goal, methods: [] })));
        }

        // 3. No Events for Guest
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
      refreshUserData();
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
