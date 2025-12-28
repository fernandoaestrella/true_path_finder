'use client';

import React, { useState, useEffect, use } from 'react';
import { Button, Input, Textarea, Card, CardHeader, CardTitle, CardContent, CardFooter, TimerBar } from '@/components';
import { useSessionTimer } from '@/lib/hooks/useSessionTimer';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Method, Goal, Resource, SuggestedMinimum } from '@/types';
import { collection, getDocs, addDoc, setDoc, deleteDoc, doc, getDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/src/lib/firebase/config';

type PageParams = Promise<{ goalId: string }>;

export default function MethodsPage({ params }: { params: PageParams }) {
  const { goalId } = use(params);
  const { user, isLoading: authLoading, logout } = useAuth();
  const { minutes, seconds, isPaused } = useSessionTimer();
  
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
  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/login';
    }
  }, [authLoading, user]);
  
  // Fetch goal and methods
  useEffect(() => {
    if (!user) return;
    
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
        }
        
        // Fetch all methods for this goal
        const methodsRef = collection(db, 'methods');
        const methodsSnap = await getDocs(methodsRef);
        const goalMethods = methodsSnap.docs
          .filter(doc => doc.data().goalId === goalId)
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            stats: doc.data().stats || { activeUsers: 0, avgRating: 0, reviewCount: 0 },
          })) as Method[];
        
        setMethods(goalMethods);
        
        // Fetch user's chosen methods
        const chosenRef = collection(db, 'users', user.uid, 'chosenMethods');
        const chosenSnap = await getDocs(chosenRef);
        const chosenIds = new Set(chosenSnap.docs.map(doc => doc.id));
        setChosenMethodIds(chosenIds);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [user, goalId]);
  
  const handleToggleMethod = async (methodId: string) => {
    if (!user) return;
    
    const chosenRef = doc(db, 'users', user.uid, 'chosenMethods', methodId);
    const methodRef = doc(db, 'methods', methodId);
    
    if (chosenMethodIds.has(methodId)) {
      // Unchoose
      await deleteDoc(chosenRef);
      await updateDoc(methodRef, { 'stats.activeUsers': increment(-1) });
      setChosenMethodIds(prev => {
        const next = new Set(prev);
        next.delete(methodId);
        return next;
      });
      setMethods(prev => prev.map(m => 
        m.id === methodId ? { ...m, stats: { ...m.stats, activeUsers: m.stats.activeUsers - 1 } } : m
      ));
    } else {
      // Choose
      await setDoc(chosenRef, {
        addedAt: serverTimestamp(),
        attempts: [],
        status: 'active',
      });
      await updateDoc(methodRef, { 'stats.activeUsers': increment(1) });
      setChosenMethodIds(prev => new Set(prev).add(methodId));
      setMethods(prev => prev.map(m => 
        m.id === methodId ? { ...m, stats: { ...m.stats, activeUsers: m.stats.activeUsers + 1 } } : m
      ));
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
    if (!user || !newMethod.title.trim()) return;
    
    setIsCreating(true);
    
    try {
      const validResources = newMethod.resources.filter(r => r.title.trim() || r.url.trim());
      
      const methodDoc = await addDoc(collection(db, 'methods'), {
        goalId,
        title: newMethod.title.trim(),
        description: newMethod.description.trim(),
        resources: validResources,
        suggestedMinimum: newMethod.suggestedMinimum,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        stats: { activeUsers: 1, avgRating: 0, reviewCount: 0 },
      });
      
      // Add to local state
      const createdMethod: Method = {
        id: methodDoc.id,
        goalId,
        title: newMethod.title.trim(),
        description: newMethod.description.trim(),
        resources: validResources,
        suggestedMinimum: newMethod.suggestedMinimum,
        createdBy: user.uid,
        createdAt: new Date(),
        stats: { activeUsers: 1, avgRating: 0, reviewCount: 0 },
      };
      
      setMethods(prev => [createdMethod, ...prev]);
      
      // Auto-choose the new method
      await setDoc(doc(db, 'users', user.uid, 'chosenMethods', methodDoc.id), {
        addedAt: serverTimestamp(),
        attempts: [],
        status: 'active',
      });
      setChosenMethodIds(prev => new Set(prev).add(methodDoc.id));
      
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
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-[var(--text-muted)]">Loading...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-30">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/goals" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              ← Goals
            </a>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Methods for: {goal?.title || 'Loading...'}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <TimerBar minutes={minutes} seconds={seconds} isPaused={isPaused} />
            <button onClick={logout} className="btn btn-ghost text-sm">
              Logout
            </button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container py-8">
        {/* Goal Description */}
        {goal?.description && (
          <div className="mb-6 p-4 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
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
                  placeholder="e.g., Morning meditation practice"
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
            <div className="text-6xl mb-4">🔬</div>
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
                        className={`px-3 py-1 text-xs rounded-full transition-all ${
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
                        <span>⭐</span>
                        <span>{method.stats.avgRating > 0 ? method.stats.avgRating.toFixed(1) : '–'}</span>
                        <span className="text-xs">({method.stats.reviewCount})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>👥</span>
                        <span>{method.stats.activeUsers} trying</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <span>⏱️</span>
                        <span>{method.suggestedMinimum.value} {method.suggestedMinimum.type}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <div className="flex gap-2">
                      <a
                        href={`/methods/${method.id}`}
                        className="flex-1 btn btn-secondary text-sm py-2"
                      >
                        View Details
                      </a>
                      <button
                        className="px-3 py-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                        title="Flag method (coming soon)"
                        disabled
                      >
                        🚩
                      </button>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
