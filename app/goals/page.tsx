'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Input, Textarea, Card, CardHeader, CardTitle, CardContent, Header } from '@/components';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useUserData } from '@/lib/contexts/UserDataContext';
import { Goal } from '@/types';
import { collection, getDocs, addDoc, setDoc, deleteDoc, doc, serverTimestamp, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '@/src/lib/firebase/config';



function GoalsPageContent() {
  const { user, isLoading: authLoading } = useAuth();
  const { chosenGoals, refreshUserData, allGoals, isLoading: contextLoading } = useUserData();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Private mode from query param
  const isPrivateMode = searchParams.get('private') === 'true';
  
  // Filter by private mode first
  const modeFilteredGoals = allGoals.filter(g => 
    isPrivateMode ? g.isPrivate === true : g.isPrivate !== true
  );
  
  // Method counts state
  const [methodCounts, setMethodCounts] = useState<Record<string, number>>({});
  const [chosenGoalIds, setChosenGoalIds] = useState<Set<string>>(new Set());
  
  // Initialize loading state:
  // If we have goals, we are ready.
  // If we don't have goals, we wait for context to finish loading.
  const [isLoading, setIsLoading] = useState(allGoals.length === 0 && contextLoading);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDescription, setNewGoalDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // Redirect if not authenticated
  // Redirect if not authenticated - REMOVED for Guest Mode

  // Sync chosen goals from context
  useEffect(() => {
    if (chosenGoals.length > 0) {
      setChosenGoalIds(new Set(chosenGoals.map(g => g.id)));
    }
  }, [chosenGoals]);

  // Update loading state when context finishes or goals arrive
  useEffect(() => {
      if (modeFilteredGoals.length > 0 || !contextLoading) {
          setIsLoading(false);
      }
  }, [allGoals, contextLoading, isPrivateMode]);
  
  // Fetch method counts in background
  useEffect(() => {
    if (modeFilteredGoals.length === 0) return;
    
    const fetchCounts = async () => {
      try {
        const counts: Record<string, number> = {};
        
        // Prepare local counts if guest
        let localCounts: Record<string, number> = {};
        if (!user) {
            try {
                const localMethods = JSON.parse(localStorage.getItem('guest_createdMethods') || '[]') as any[];
                localMethods.forEach(m => {
                    if (m.goalId) {
                        localCounts[m.goalId] = (localCounts[m.goalId] || 0) + 1;
                    }
                });
            } catch (e) {
                console.error("Error reading local methods", e);
            }
        }

        await Promise.all(modeFilteredGoals.map(async (goal) => {
           // Firestore count
           let firestoreCount = 0;
           // Only query firestore if the goal might be there (optimization, but simple query is fine)
           // If we are guest and goal is private (local), firestore query returns 0 anyway.
           // But if we are offline? Firestore might hang? 
           // Generally fine to query.
           try {
               const methodsRef = collection(db, 'methods');
               const q = query(methodsRef, where('goalId', '==', goal.id));
               const snapshot = await getCountFromServer(q);
               firestoreCount = snapshot.data().count;
           } catch (e) {
               console.warn("Could not fetch firestore count for goal", goal.id, e);
           }
           
           // If guest, add local count
           const localCount = !user ? (localCounts[goal.id] || 0) : 0;
           
           counts[goal.id] = firestoreCount + localCount;
        }));
        
        setMethodCounts(prev => ({ ...prev, ...counts }));
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };
    
    fetchCounts();
  }, [user, allGoals, isPrivateMode]);

  /* 
     If context is completely empty (first load ever), we might need to trigger refresh?
     refreshUserData is called in Layout. 
     So we just wait for allGoals to populate.
  */
  
  const handleToggleGoal = async (goalId: string) => {
    
    // Optimistic update
    const isCurrentlyChosen = chosenGoalIds.has(goalId);
    setChosenGoalIds(prev => {
      const next = new Set(prev);
      if (isCurrentlyChosen) {
        next.delete(goalId);
      } else {
        next.add(goalId);
      }
      return next;
    });

    if (user) {
        const chosenRef = doc(db, 'users', user.uid, 'chosenGoals', goalId);
        try {
          if (isCurrentlyChosen) {
            // Unchoose
            await deleteDoc(chosenRef);
          } else {
            // Choose
            await setDoc(chosenRef, { addedAt: serverTimestamp() });
          }
          // Refresh context in background
          refreshUserData();
        } catch (error) {
           console.error("Error toggling goal", error);
           // Revert on error
           setChosenGoalIds(prev => {
              const next = new Set(prev);
              if (isCurrentlyChosen) {
                next.add(goalId);
              } else {
                next.delete(goalId);
              }
              return next;
           });
        }
    } else {
        // Guest Logic
        try {
            const localGoals = JSON.parse(localStorage.getItem('guest_chosenGoals') || '[]') as string[];
            let newGoals;
            if (localGoals.includes(goalId)) {
                newGoals = localGoals.filter(id => id !== goalId);
            } else {
                newGoals = [...localGoals, goalId];
            }
            localStorage.setItem('guest_chosenGoals', JSON.stringify(newGoals));
            refreshUserData();
        } catch (error) {
            console.error("Error toggling goal locally", error);
             setChosenGoalIds(prev => {
              const next = new Set(prev);
              if (isCurrentlyChosen) {
                next.add(goalId);
              } else {
                next.delete(goalId);
              }
              return next;
           });
        }
    }
  };
  
  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;
    
    setIsCreating(true);
    
    try {
      if (user) {
          const goalDoc = await addDoc(collection(db, 'goals'), {
            title: newGoalTitle.trim(),
            description: newGoalDescription.trim(),
            createdBy: user.uid,
            createdAt: serverTimestamp(),
            groupId: 'general',
            isPrivate: isPrivateMode,
          });
          
          // Auto-choose the new goal
          await setDoc(doc(db, 'users', user.uid, 'chosenGoals', goalDoc.id), {
            addedAt: serverTimestamp(),
          });
          setChosenGoalIds(prev => new Set(prev).add(goalDoc.id));
          
          // Initialize count for new goal
          setMethodCounts(prev => ({ ...prev, [goalDoc.id]: 0 }));
      } else {
          // Guest Logic
          const newId = crypto.randomUUID();
          const newGoal: Goal = {
            id: newId,
            title: newGoalTitle.trim(),
            description: newGoalDescription.trim(),
            createdBy: 'guest',
            createdAt: new Date(),
            groupId: 'general',
            isPrivate: true, // Guest created goals are always private/local effectively
          };
          
          // Save to local created goals
          const localCreated = JSON.parse(localStorage.getItem('guest_createdGoals') || '[]') as Goal[];
          localCreated.push(newGoal);
          localStorage.setItem('guest_createdGoals', JSON.stringify(localCreated));
          
          // Auto-choose
          const localChosen = JSON.parse(localStorage.getItem('guest_chosenGoals') || '[]') as string[];
          if (!localChosen.includes(newId)) {
              localChosen.push(newId);
              localStorage.setItem('guest_chosenGoals', JSON.stringify(localChosen));
          }
          
          setChosenGoalIds(prev => new Set(prev).add(newId));
          setMethodCounts(prev => ({ ...prev, [newId]: 0 }));
      }
      
      refreshUserData();
      
      // Reset form
      setNewGoalTitle('');
      setNewGoalDescription('');
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating goal:', error);
    } finally {
      setIsCreating(false);
    }
  };
  
  // Filter goals by search
  const filteredGoals = modeFilteredGoals.filter(goal =>
    goal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    goal.description.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[var(--text-muted)]">Loading...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen">
      <Header currentPage={isPrivateMode ? 'my-cave' : 'goals'} />
      
      {/* Main Content */}
      <main className="container py-8 mt-8">
        {/* Search and Create */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1">
            <Input
              placeholder="Search goals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            {showCreateForm ? 'Cancel' : '+ Create Goal'}
          </Button>
        </div>
        
        {/* Create Form */}
        {showCreateForm && (
          <Card className="mb-8 animate-fade-in">
            <CardHeader>
              <CardTitle>Create a New Goal</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateGoal} className="space-y-4">
                <Input
                  label="Goal Title"
                  placeholder="e.g., Improve my focus and concentration"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  required
                />
                <Textarea
                  label="Description"
                  placeholder="What does achieving this goal look like?"
                  value={newGoalDescription}
                  onChange={(e) => setNewGoalDescription(e.target.value)}
                  hint="Describe your goal so others understand what you're trying to achieve"
                />
                <Button type="submit" isLoading={isCreating}>
                  Create & Choose Goal
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
        
        {/* Chosen Goals Summary */}
        {chosenGoalIds.size > 0 && (
          <div className="mb-6 p-4 bg-[var(--surface-emphasis)] rounded-[var(--radius-interactive)]">
            <p className="text-sm text-[var(--primary)]">
              <strong>{chosenGoalIds.size}</strong> goal{chosenGoalIds.size !== 1 ? 's' : ''} chosen
            </p>
          </div>
        )}
        
        {/* Goals Grid */}
        {filteredGoals.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
              {searchQuery ? 'No goals match your search' : 'No goals yet'}
            </h3>
            <p className="text-[var(--text-secondary)]">
              {searchQuery ? 'Try a different search term' : 'Be the first to create a goal!'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGoals.map((goal) => {
              const isChosen = chosenGoalIds.has(goal.id);
              return (
                <Card
                  key={goal.id}
                  className={`cursor-pointer transition-all ${
                    isChosen ? 'ring-2 ring-[var(--primary)] shadow-md' : ''
                  }`}
                  onClick={() => handleToggleGoal(goal.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle as="h4" className="text-base">
                        {goal.title}
                      </CardTitle>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center justify-center min-w-[80px] ${
                        isChosen
                          ? 'bg-[var(--primary)] text-white shadow-sm'
                          : 'bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border)]'
                      }`}>
                        {isChosen ? '✓ Trying' : '+ Try Goal'}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                      {goal.description || 'No description'}
                    </p>
                    <div className="mt-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const privateParam = isPrivateMode ? '?private=true' : '';
                          router.push(`/goals/${goal.id}/methods${privateParam}`);
                        }}
                        className="text-sm text-[var(--primary)] hover:underline bg-transparent border-none p-0 cursor-pointer"
                      >
                        Select a method. {methodCounts[goal.id] || 0} exist →
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        
        {/* Related Goals Placeholder */}
        <div className="mt-12 p-8 bg-[var(--surface-subtle)] rounded-[var(--radius-interactive)]">
          <div className="inline-block px-3 py-1 rounded-full bg-[var(--surface-emphasis)] text-[var(--text-muted)] text-xs font-bold mb-3">Coming Soon</div>
          <h4 className="text-[var(--text-muted)] italic">
            Related Goals — See goals similar to the ones you&apos;re exploring
          </h4>
        </div>
      </main>
    </div>
  );
}

export default function GoalsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <GoalsPageContent />
    </Suspense>
  );
}
