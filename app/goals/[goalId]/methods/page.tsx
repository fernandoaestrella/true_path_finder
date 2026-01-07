'use client';

import React, { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Input, Textarea, Card, CardHeader, CardTitle, CardContent, CardFooter, Header } from '@/components';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Method, Goal, Resource, SuggestedMinimum } from '@/types';
import { collection, getDocs, addDoc, setDoc, deleteDoc, doc, getDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/src/lib/firebase/config';

type PageParams = Promise<{ goalId: string }>;

function MethodsPageContent({ params }: { params: PageParams }) {
  const { goalId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  
  // Private mode from query param
  const isPrivateMode = searchParams.get('private') === 'true';
  
  const [goal, setGoal] = useState<Goal | null>(null);
  const [methods, setMethods] = useState<Method[]>([]);
  const [chosenMethodIds, setChosenMethodIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'rating' | 'active' | 'recent'>('rating');
  
  // Create form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newMethod, setNewMethod] = useState({
    title: '',
    description: '',
    resources: [{ title: '', url: '' }] as Resource[],
    suggestedMinimum: { type: 'days', value: 7 } as SuggestedMinimum,
  });
  const [isCreating, setIsCreating] = useState(false);
  
  // Redirect if not authenticated
  // Redirect if not authenticated - REMOVED for Guest Mode
  
  // Fetch goal and methods
  useEffect(() => {
    
    const fetchData = async () => {
      try {
        // Fetch goal details
        const goalDoc = await getDoc(doc(db, 'goals', goalId));
        if (goalDoc.exists()) {
          setGoal({
            id: goalDoc.id,
            ...goalDoc.data(),
            createdAt: goalDoc.data().createdAt?.toDate() || new Date(),
          } as Goal);
        } else {
             // Guest: check local storage
             const localGoals = JSON.parse(localStorage.getItem('guest_createdGoals') || '[]') as Goal[];
             const foundGoal = localGoals.find(g => g.id === goalId);
             if (foundGoal) {
                 setGoal({
                     ...foundGoal,
                     createdAt: new Date(foundGoal.createdAt),
                 });
             }
        }
        
        // Fetch all methods for this goal
        const methodsRef = collection(db, 'methods');
        const methodsSnap = await getDocs(methodsRef);
        let goalMethods = methodsSnap.docs
          .filter(doc => doc.data().goalId === goalId)
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            stats: doc.data().stats || { activeUsers: 0, avgRating: 0, reviewCount: 0 },
          })) as Method[];
        
        if (user) {
            const chosenRef = collection(db, 'users', user.uid, 'chosenMethods');
            const chosenSnap = await getDocs(chosenRef);
            const chosenIds = new Set(chosenSnap.docs.map(doc => doc.id));
            setChosenMethodIds(chosenIds);
        } else {
             // Guest: Add local created methods
             const localCreated = JSON.parse(localStorage.getItem('guest_createdMethods') || '[]') as Method[];
             const myLocalMethods = localCreated.filter(m => m.goalId === goalId);
             goalMethods = [...myLocalMethods, ...goalMethods];
             
             // Guest: Fetch chosen
             const localChosen = JSON.parse(localStorage.getItem('guest_chosenMethods') || '{}');
             setChosenMethodIds(new Set(Object.keys(localChosen)));
        }
        
        setMethods(goalMethods);
        
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [user, goalId]);
  
  // Modal State
  const [isGoalChosen, setIsGoalChosen] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [targetMethodForModal, setTargetMethodForModal] = useState<{id: string, title: string} | null>(null);
  const [isGoalModalLoading, setIsGoalModalLoading] = useState(false);

  useEffect(() => {
     if (user) {
         getDoc(doc(db, 'users', user.uid, 'chosenGoals', goalId)).then(doc => {
             setIsGoalChosen(doc.exists());
         });
     } else {
         const localChosenGoals = JSON.parse(localStorage.getItem('guest_chosenGoals') || '[]');
         setIsGoalChosen(localChosenGoals.includes(goalId));
     }
  }, [user, goalId]);

  const toggleMethodLogic = async (methodId: string) => {
    const isChosen = chosenMethodIds.has(methodId);
    
    // Optimistic UI updates
    setChosenMethodIds(prev => {
       const next = new Set(prev);
       if (isChosen) next.delete(methodId);
       else next.add(methodId);
       return next;
    });
    
    setMethods(prev => prev.map(m => 
        m.id === methodId ? { ...m, stats: { ...m.stats, activeUsers: m.stats.activeUsers + (isChosen ? -1 : 1) } } : m
    ));

    if (user) {
         const chosenRef = doc(db, 'users', user.uid, 'chosenMethods', methodId);
         const methodRef = doc(db, 'methods', methodId);
         try {
             if (isChosen) {
               await deleteDoc(chosenRef);
               await updateDoc(methodRef, { 'stats.activeUsers': increment(-1) });
             } else {
               await setDoc(chosenRef, {
                addedAt: serverTimestamp(),
                attempts: [],
                status: 'active',
              });
              await updateDoc(methodRef, { 'stats.activeUsers': increment(1) });
             }
         } catch (err) {
             console.error("Error toggling method", err);
         }
    } else {
         // Guest Logic
         const localMethods = JSON.parse(localStorage.getItem('guest_chosenMethods') || '{}');
         if (isChosen) {
             delete localMethods[methodId];
         } else {
             localMethods[methodId] = { status: 'active', addedAt: new Date().toISOString() };
         }
         localStorage.setItem('guest_chosenMethods', JSON.stringify(localMethods));
    }
  };

  const handleToggleMethod = async (methodId: string) => {
    const isChosen = chosenMethodIds.has(methodId);
    
    // If we are stopping trying, we don't need to check user goal status
    if (isChosen) {
        await toggleMethodLogic(methodId);
        return;
    }

    // If we are starting to try, check if goal is chosen
    if (!isGoalChosen) {
        const method = methods.find(m => m.id === methodId);
        if (method) {
            setTargetMethodForModal({ id: method.id, title: method.title });
            setShowGoalModal(true);
        }
        return;
    }

    await toggleMethodLogic(methodId);
  };

  const handleAcceptReferenceGoal = async () => {
      if (!targetMethodForModal) return;
      setIsGoalModalLoading(true);
      try {
          if (user) {
              const goalRef = doc(db, 'users', user.uid, 'chosenGoals', goalId);
              await setDoc(goalRef, { addedAt: serverTimestamp() });
          } else {
              const localGoals = JSON.parse(localStorage.getItem('guest_chosenGoals') || '[]');
              if (!localGoals.includes(goalId)) {
                  localGoals.push(goalId);
                  localStorage.setItem('guest_chosenGoals', JSON.stringify(localGoals));
              }
          }
          setIsGoalChosen(true);
          
          await toggleMethodLogic(targetMethodForModal.id);
          setShowGoalModal(false);
          setTargetMethodForModal(null);
      } catch (error) {
          console.error("Error accepting goal", error);
      } finally {
          setIsGoalModalLoading(false);
      }
  };
  
  const addResource = () => {
    setNewMethod(prev => ({
      ...prev,
      resources: [...prev.resources, { title: '', url: '' }],
    }));
  };
  
  const updateResource = (index: number, field: 'title' | 'url', value: string) => {
    setNewMethod(prev => ({
      ...prev,
      resources: prev.resources.map((r, i) => i === index ? { ...r, [field]: value } : r),
    }));
  };
  
  const removeResource = (index: number) => {
    setNewMethod(prev => ({
      ...prev,
      resources: prev.resources.filter((_, i) => i !== index),
    }));
  };
  
  const handleCreateMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMethod.title.trim()) return;
    
    setIsCreating(true);
    
    try {
      // Assign IDs to resources
      const resourcesWithIds = newMethod.resources
        .filter(r => r.title.trim() || r.url.trim())
        .map(r => ({ ...r, id: crypto.randomUUID() }));
      
      if (user) {
          const methodDoc = await addDoc(collection(db, 'methods'), {
            goalId,
            title: newMethod.title.trim(),
            description: newMethod.description.trim(),
            resources: resourcesWithIds,
            suggestedMinimum: newMethod.suggestedMinimum,
            createdBy: user.uid,
            createdAt: serverTimestamp(),
            stats: { activeUsers: 1, avgRating: 0, reviewCount: 0 },
            isPrivate: isPrivateMode,
          });
          
          // Add to local state
          const createdMethod: Method = {
            id: methodDoc.id,
            goalId,
            title: newMethod.title.trim(),
            description: newMethod.description.trim(),
            resources: resourcesWithIds,
            suggestedMinimum: newMethod.suggestedMinimum,
            createdBy: user.uid,
            createdAt: new Date(),
            stats: { activeUsers: 1, avgRating: 0, reviewCount: 0 },
          } as Method;
          
          setMethods(prev => [createdMethod, ...prev]);
          
          // Auto-choose the new method
          // IMPORTANT: Auto-choosing method implies choosing goal too? 
          // Usually create method implies you are working on the goal.
          // Let's ensure goal is chosen if it wasn't.
          if (!isGoalChosen) {
             const goalRef = doc(db, 'users', user.uid, 'chosenGoals', goalId);
             await setDoc(goalRef, { addedAt: serverTimestamp() });
             setIsGoalChosen(true);
          }

          await setDoc(doc(db, 'users', user.uid, 'chosenMethods', methodDoc.id), {
            addedAt: serverTimestamp(),
            attempts: [],
            status: 'active',
          });
          setChosenMethodIds(prev => new Set(prev).add(methodDoc.id));
      } else {
          // Guest Logic
          const newId = crypto.randomUUID();
          const createdMethod: Method = {
            id: newId,
            goalId,
            title: newMethod.title.trim(),
            description: newMethod.description.trim(),
            resources: resourcesWithIds,
            suggestedMinimum: newMethod.suggestedMinimum,
            createdBy: 'guest',
            createdAt: new Date(),
            stats: { activeUsers: 1, avgRating: 0, reviewCount: 0 },
            isPrivate: isPrivateMode,
          } as Method;
          
          // Save locally
          const localCreated = JSON.parse(localStorage.getItem('guest_createdMethods') || '[]') as Method[];
          localCreated.push(createdMethod);
          localStorage.setItem('guest_createdMethods', JSON.stringify(localCreated));
          
          // Auto-choose goal if needed locally
          if (!isGoalChosen) {
             const localGoals = JSON.parse(localStorage.getItem('guest_chosenGoals') || '[]');
             if (!localGoals.includes(goalId)) {
                localGoals.push(goalId);
                localStorage.setItem('guest_chosenGoals', JSON.stringify(localGoals));
             }
             setIsGoalChosen(true);
          }
          
          // Auto-choose locally
          const localChosen = JSON.parse(localStorage.getItem('guest_chosenMethods') || '{}');
          localChosen[newId] = { status: 'active', addedAt: new Date().toISOString() };
          localStorage.setItem('guest_chosenMethods', JSON.stringify(localChosen));
          
          setMethods(prev => [createdMethod, ...prev]);
          setChosenMethodIds(prev => new Set(prev).add(newId));
      }
      
      // Reset form
      setNewMethod({
        title: '',
        description: '',
        resources: [{ title: '', url: '' }],
        suggestedMinimum: { type: 'days', value: 7 },
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating method:', error);
    } finally {
      setIsCreating(false);
    }
  };
  
  // Sort methods
  const sortedMethods = [...methods].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.stats.avgRating - a.stats.avgRating;
      case 'active':
        return b.stats.activeUsers - a.stats.activeUsers;
      case 'recent':
        return b.createdAt.getTime() - a.createdAt.getTime();
      default:
        return 0;
    }
  });
  
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[var(--text-muted)]">Loading...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen">
      <Header currentPage={isPrivateMode ? 'my-cave' : 'other'} />
      
      {/* Main Content */}
      <main className="container py-8">
        {/* Page Title */}
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-6">
          Methods for: {goal?.title || 'Loading...'}
        </h1>
        
        {/* Goal Description */}
        {goal?.description && (
          <div className="mb-6 p-4 bg-[var(--surface-subtle)] rounded-lg">
            <p className="text-[var(--text-secondary)]">{goal.description}</p>
          </div>
        )}
        
        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--text-muted)]">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'rating' | 'active' | 'recent')}
              className="input py-1"
            >
              <option value="rating">Highest Rated</option>
              <option value="active">Most Active</option>
              <option value="recent">Most Recent</option>
            </select>
          </div>
          
          <div className="flex-1" />
          
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            {showCreateForm ? 'Cancel' : '+ Add Method'}
          </Button>
        </div>
        
        {/* Create Form */}
        {showCreateForm && (
          <Card className="mb-8 animate-fade-in">
            <CardHeader>
              <CardTitle>Add a New Method</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateMethod} className="space-y-4">
                <Input
                  label="Method Title"
                  placeholder="e.g., Daily practice routine"
                  value={newMethod.title}
                  onChange={(e) => setNewMethod(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
                
                <Textarea
                  label="Description"
                  placeholder="Describe this method and how it helps achieve the goal"
                  value={newMethod.description}
                  onChange={(e) => setNewMethod(prev => ({ ...prev, description: e.target.value }))}
                />
                
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Resources (optional)
                  </label>
                  <div className="space-y-2">
                    {newMethod.resources.map((resource, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="Title (e.g., Guide)"
                          value={resource.title}
                          onChange={(e) => updateResource(index, 'title', e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          placeholder="URL"
                          type="url"
                          value={resource.url}
                          onChange={(e) => updateResource(index, 'url', e.target.value)}
                          className="flex-1"
                        />
                        {newMethod.resources.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeResource(index)}
                            className="px-2 text-[var(--error)] hover:bg-[var(--background)] rounded"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addResource}
                    className="mt-2 text-sm text-[var(--primary)] hover:underline"
                  >
                    + Add resource
                  </button>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Suggested minimum before reviewing
                  </label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      min="1"
                      value={newMethod.suggestedMinimum.value}
                      onChange={(e) => setNewMethod(prev => ({
                        ...prev,
                        suggestedMinimum: { ...prev.suggestedMinimum, value: parseInt(e.target.value) || 1 }
                      }))}
                      className="w-24"
                    />
                    <select
                      value={newMethod.suggestedMinimum.type}
                      onChange={(e) => setNewMethod(prev => ({
                        ...prev,
                        suggestedMinimum: { ...prev.suggestedMinimum, type: e.target.value as 'hours' | 'days' | 'attempts' }
                      }))}
                      className="input"
                    >
                      <option value="hours">hours</option>
                      <option value="days">days</option>
                      <option value="attempts">attempts</option>
                    </select>
                  </div>
                </div>
                
                <Button type="submit" isLoading={isCreating}>
                  Create & Choose Method
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
        
        {/* Methods List */}
        {sortedMethods.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
              No methods yet
            </h3>
            <p className="text-[var(--text-secondary)]">
              Be the first to share a method for this goal!
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {sortedMethods.map((method) => {
              const isChosen = chosenMethodIds.has(method.id);
              return (
                <Card
                  key={method.id}
                  className={isChosen ? 'border-[var(--primary)] bg-[rgba(107,155,209,0.05)]' : ''}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle as="h4" className="text-base">
                        {method.title}
                      </CardTitle>
                      <button
                        onClick={() => handleToggleMethod(method.id)}
                        className={`px-3 py-1 text-xs rounded-full transition-all cursor-pointer ${
                          isChosen
                            ? 'bg-[var(--primary)] text-white'
                            : 'bg-[var(--background)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
                        }`}
                      >
                        {isChosen ? '✓ Trying' : 'Try This'}
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-3">
                      {method.description || 'No description'}
                    </p>
                    
                    <div className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
                      <div className="flex items-center gap-1">
                        <span>{method.stats.avgRating > 0 ? method.stats.avgRating.toFixed(2) : '–'}</span>
                        <span className="text-xs">({method.stats.reviewCount})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>{method.stats.activeUsers} trying</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <span>Try {method.suggestedMinimum.value} {method.suggestedMinimum.type}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <div className="flex gap-2">
                      <Link
                        href={`/methods/${method.id}${isPrivateMode ? '?private=true' : ''}`}
                        className="flex-1 btn btn-secondary text-sm py-2 text-center"
                      >
                        View Details
                      </Link>
                      <button
                        className="px-3 py-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
                        title="Flag method (coming soon)"
                        disabled
                      >
                        Flag
                      </button>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Goal Prerequisite Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 z-[100] bg-[var(--background)] flex items-center justify-center p-6 animate-fade-in">
             <div className="max-w-xl w-full text-center">
                 <p className="text-xl text-[var(--text-primary)] mb-8 leading-relaxed font-medium">
                     In order to try a method, you must be trying the corresponding goal it belongs to. 
                     <br />
                     When you click Accept, we will set the goal as being tried.
                 </p>
                 
                 <div className="bg-[var(--surface-subtle)] p-8 rounded-[var(--radius-lg)] mb-10 mx-auto text-left w-full max-w-md shadow-sm">
                     <div className="mb-6">
                         <span className="font-bold text-[var(--text-secondary)] uppercase tracking-wide text-xs block mb-2">Goal</span>
                         <span className="text-[var(--primary)] font-bold text-2xl block">{goal?.title}</span>
                     </div>
                     
                     <div>
                         <span className="font-bold text-[var(--text-secondary)] uppercase tracking-wide text-xs block mb-2">Method</span>
                         <span className="text-[var(--primary)] font-bold text-2xl block">{targetMethodForModal?.title}</span>
                     </div>
                 </div>
                 
                 <div className="flex gap-4 justify-center max-w-md mx-auto">
                     <Button 
                         variant="ghost" 
                         onClick={() => {
                             setShowGoalModal(false);
                             setTargetMethodForModal(null);
                         }}
                         className="flex-1 py-4 text-base"
                         disabled={isGoalModalLoading}
                     >
                         Cancel
                     </Button>
                     <Button 
                         onClick={handleAcceptReferenceGoal}
                         className="flex-1 py-4 text-base"
                         isLoading={isGoalModalLoading}
                     >
                         Accept
                     </Button>
                 </div>
             </div>
        </div>
      )}
    </div>
  );
}

export default function MethodsPage({ params }: { params: PageParams }) {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <MethodsPageContent params={params} />
    </Suspense>
  );
}
