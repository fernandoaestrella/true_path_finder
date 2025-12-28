'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input, Textarea, Card, CardHeader, CardTitle, CardContent, Header } from '@/components';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Goal } from '@/types';
import { collection, getDocs, addDoc, setDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/src/lib/firebase/config';

export default function GoalsPage() {
  const { user, isLoading: authLoading } = useAuth();
  
  const [goals, setGoals] = useState<Goal[]>([]);
  const [chosenGoalIds, setChosenGoalIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDescription, setNewGoalDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/login';
    }
  }, [authLoading, user]);
  
  // Fetch goals
  useEffect(() => {
    if (!user) return;
    
    const fetchGoals = async () => {
      try {
        // Fetch all goals
        const goalsRef = collection(db, 'goals');
        const goalsSnap = await getDocs(goalsRef);
        const allGoals = goalsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        })) as Goal[];
        
        setGoals(allGoals);
        
        // Fetch user's chosen goals
        const chosenRef = collection(db, 'users', user.uid, 'chosenGoals');
        const chosenSnap = await getDocs(chosenRef);
        const chosenIds = new Set(chosenSnap.docs.map(doc => doc.id));
        setChosenGoalIds(chosenIds);
      } catch (error) {
        console.error('Error fetching goals:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchGoals();
  }, [user]);
  
  const handleToggleGoal = async (goalId: string) => {
    if (!user) return;
    
    const chosenRef = doc(db, 'users', user.uid, 'chosenGoals', goalId);
    
    if (chosenGoalIds.has(goalId)) {
      // Unchoose
      await deleteDoc(chosenRef);
      setChosenGoalIds(prev => {
        const next = new Set(prev);
        next.delete(goalId);
        return next;
      });
    } else {
      // Choose
      await setDoc(chosenRef, { addedAt: serverTimestamp() });
      setChosenGoalIds(prev => new Set(prev).add(goalId));
    }
  };
  
  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newGoalTitle.trim()) return;
    
    setIsCreating(true);
    
    try {
      const goalDoc = await addDoc(collection(db, 'goals'), {
        title: newGoalTitle.trim(),
        description: newGoalDescription.trim(),
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        groupId: 'general',
      });
      
      // Add to local state
      const newGoal: Goal = {
        id: goalDoc.id,
        title: newGoalTitle.trim(),
        description: newGoalDescription.trim(),
        createdBy: user.uid,
        createdAt: new Date(),
        groupId: 'general',
      };
      
      setGoals(prev => [newGoal, ...prev]);
      
      // Auto-choose the new goal
      await setDoc(doc(db, 'users', user.uid, 'chosenGoals', goalDoc.id), {
        addedAt: serverTimestamp(),
      });
      setChosenGoalIds(prev => new Set(prev).add(goalDoc.id));
      
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
  const filteredGoals = goals.filter(goal =>
    goal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    goal.description.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-[var(--text-muted)]">Loading...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Header currentPage="goals" />
      
      {/* Main Content */}
      <main className="container py-8">
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
          <div className="mb-6 p-4 bg-[rgba(107,155,209,0.1)] rounded-lg">
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
                    isChosen ? 'border-[var(--primary)] bg-[rgba(107,155,209,0.05)]' : ''
                  }`}
                  onClick={() => handleToggleGoal(goal.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle as="h4" className="text-base">
                        {goal.title}
                      </CardTitle>
                      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                        isChosen
                          ? 'border-[var(--primary)] bg-[var(--primary)]'
                          : 'border-[var(--border)]'
                      }`}>
                        {isChosen && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                            <polyline points="20,6 9,17 4,12" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                      {goal.description || 'No description'}
                    </p>
                    <div className="mt-4">
                      <a
                        href={`/goals/${goal.id}/methods`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm text-[var(--primary)] hover:underline"
                      >
                        View methods →
                      </a>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        
        {/* Related Goals Placeholder */}
        <div className="mt-12 p-6 border border-dashed border-[var(--border)] rounded-lg">
          <div className="coming-soon mb-2">Coming Soon</div>
          <h4 className="text-[var(--text-muted)] italic">
            Related Goals — See goals similar to the ones you&apos;re exploring
          </h4>
        </div>
      </main>
    </div>
  );
}
