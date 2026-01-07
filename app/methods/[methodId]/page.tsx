'use client';

import React, { useState, useEffect, use, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Textarea, Card, CardHeader, CardTitle, CardContent, Header, ResourceCard, Input, InfoTooltip } from '@/components';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Method, Review, TPFEvent } from '@/types';
import { collection, getDocs, addDoc, doc, getDoc, serverTimestamp, updateDoc, query, where, orderBy, setDoc, deleteDoc, increment } from 'firebase/firestore';
import { db } from '@/src/lib/firebase/config';
import { EventCard } from '@/components';
import { ReviewTrends } from '@/components/features/ReviewTrends';
import { ReviewCard } from '@/components/features/ReviewCard';
import { StarRatingInput } from '@/components/ui/StarRatingInput';
import { getNextEventOccurrence } from '@/lib/utils/eventUtils';

type PageParams = Promise<{ methodId: string }>;



function MethodDetailContent({ params }: { params: PageParams }) {
  const { methodId } = use(params);
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  const [method, setMethod] = useState<Method | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [events, setEvents] = useState<TPFEvent[]>([]);
  const [isTrying, setIsTrying] = useState(false);
  const [savedShortcut, setSavedShortcut] = useState<string | null>(null);
  const [shortcutMode, setShortcutMode] = useState(false);
  const [selectedShortcutUi, setSelectedShortcutUi] = useState<string | null>(null);
  
  // Initialize active tab from URL param
  const tabParam = searchParams.get('tab');
  const isPrivateMode = searchParams.get('private') === 'true';
  const initialTab = tabParam === 'reviews' ? 'reviews' : tabParam === 'events' ? 'events' : tabParam === 'trends' ? 'trends' : 'resources';
  const [activeTab, setActiveTab] = useState<'resources' | 'reviews' | 'events' | 'trends'>(initialTab as any);
  const [isLoading, setIsLoading] = useState(true);
  
  // Journey Modal
  const [journeyUserId, setJourneyUserId] = useState<string | null>(null);
  
  // Review form
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewScore, setReviewScore] = useState(0);
  const [reviewContent, setReviewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Mode
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Method>>({});
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Redirect if not authenticated
  // Redirect if not authenticated - REMOVED for Guest Mode
  // Guests can view methods. Protected actions are handled individually.
  
  // Fetch method and reviews
  // Fetch method and reviews
  useEffect(() => {
    
    const fetchData = async () => {
      try {
        // Fetch method details
        const methodDoc = await getDoc(doc(db, 'methods', methodId));
        if (methodDoc.exists()) {
          setMethod({
            id: methodDoc.id,
            ...methodDoc.data(),
            createdAt: methodDoc.data().createdAt?.toDate() || new Date(),
            stats: methodDoc.data().stats || { activeUsers: 0, avgRating: 0, reviewCount: 0 },
            suggestedMinimum: methodDoc.data().suggestedMinimum || { type: 'days', value: 7 },
          } as Method);
        } else {
             // Check local storage for guest created methods
             const localCreated = JSON.parse(localStorage.getItem('guest_createdMethods') || '[]') as Method[];
             const found = localCreated.find(m => m.id === methodId);
             if (found) {
                 setMethod({
                     ...found,
                     createdAt: new Date(found.createdAt),
                 });
             }
        }
        
        // Fetch reviews
        const reviewsRef = collection(db, 'reviews');
        const reviewsQuery = query(
          reviewsRef,
          where('methodId', '==', methodId),
          orderBy('createdAt', 'desc')
        );
        const reviewsSnap = await getDocs(reviewsQuery);
        const methodReviews = reviewsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        })) as Review[];
        
        // Fetch guest reviews for this method
        if (!user) {
            const localReviews = JSON.parse(localStorage.getItem('guest_reviews') || '[]') as Review[];
            const myLocalReviews = localReviews.filter(r => r.methodId === methodId);
            setReviews([...myLocalReviews, ...methodReviews]);
        } else {
            setReviews(methodReviews);
        }
        
        // Fetch events
        const eventsRef = collection(db, 'events');
        const eventsQuery = query(
          eventsRef,
          where('methodId', '==', methodId),
          orderBy('startTime', 'asc')
        );
        const eventsSnap = await getDocs(eventsQuery);
        const methodEvents = eventsSnap.docs
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              methodId: data.methodId,
              title: data.title,
              description: data.description,
              links: data.links || [],
              phases: data.phases,
              startTime: data.startTime?.toDate() || new Date(),
              maxPerBatch: data.maxPerBatch || 21,
              repeatability: data.repeatability,
              createdBy: data.createdBy,
            } as TPFEvent;
          })
          .filter(event => {
            // Only show upcoming events or events happening now (handling recurrence)
            return getNextEventOccurrence(event) !== null;
          })
          .sort((a, b) => {
             const nextA = getNextEventOccurrence(a)?.getTime() || 0;
             const nextB = getNextEventOccurrence(b)?.getTime() || 0;
             return nextA - nextB;
          });
        
        
        setEvents(methodEvents);

        // Check if user is trying this method
        if (user) {
            const chosenRef = doc(db, 'users', user.uid, 'chosenMethods', methodId);
            const chosenDoc = await getDoc(chosenRef);
            if (chosenDoc.exists()) {
               setIsTrying(true);
               setSavedShortcut(chosenDoc.data().shortcutResourceId || null);
            } else {
               setIsTrying(false);
               setSavedShortcut(null);
            }
        } else {
            // Guest Mode
            const guestMethods = JSON.parse(localStorage.getItem('guest_chosenMethods') || '{}');
            if (guestMethods[methodId]) {
                setIsTrying(true);
                setSavedShortcut(guestMethods[methodId].shortcutResourceId || null);
            } else {
                setIsTrying(false);
                setSavedShortcut(null);
            }
        }

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [user, methodId]);

  // Modal State
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [targetGoalTitle, setTargetGoalTitle] = useState<string | null>(null);
  const [isGoalModalLoading, setIsGoalModalLoading] = useState(false);

  const handleToggleTrying = async () => {
    if (!method) return;

    try {
      if (user) {
        const chosenRef = doc(db, 'users', user.uid, 'chosenMethods', methodId);
        const methodRef = doc(db, 'methods', methodId);
  
        if (isTrying) {
          // Stop trying
          await deleteDoc(chosenRef);
          await updateDoc(methodRef, { 'stats.activeUsers': increment(-1) });
          setIsTrying(false);
          setMethod(prev => prev ? { ...prev, stats: { ...prev.stats, activeUsers: prev.stats.activeUsers - 1 } } : null);
        } else {
          // Start trying
          // Check if user has chosen the goal
          const goalRef = doc(db, 'users', user.uid, 'chosenGoals', method.goalId);
          const goalDoc = await getDoc(goalRef);
          
          if (!goalDoc.exists()) {
            // Fetch goal title for the modal
            const methodGoalRef = doc(db, 'goals', method.goalId);
            const methodGoalDoc = await getDoc(methodGoalRef);
            const goalTitle = methodGoalDoc.exists() ? methodGoalDoc.data().title : 'Unknown Goal';
            
            setTargetGoalTitle(goalTitle);
            setShowGoalModal(true);
            return;
          }
  
          await setDoc(chosenRef, {
            addedAt: serverTimestamp(),
            attempts: [],
            status: 'active',
          });
          await updateDoc(methodRef, { 'stats.activeUsers': increment(1) });
          setIsTrying(true);
          setMethod(prev => prev ? { ...prev, stats: { ...prev.stats, activeUsers: prev.stats.activeUsers + 1 } } : null);
        }
      } else {
        // Guest Logic
        const localMethods = JSON.parse(localStorage.getItem('guest_chosenMethods') || '{}');
        
        if (isTrying) {
           delete localMethods[methodId];
           setIsTrying(false);
           // Optional: Decrement local counter display (reverts previous increment)
           setMethod(prev => prev ? { ...prev, stats: { ...prev.stats, activeUsers: Math.max(0, prev.stats.activeUsers - 1) } } : null);
        } else {
           // Guest Check for Goal Prerequisite
           const localGoals = JSON.parse(localStorage.getItem('guest_chosenGoals') || '[]') as string[];
           if (!localGoals.includes(method.goalId)) {
                // Fetch goal title for the modal
                // Since we are likely offline or guest, we try to find it in "local created goals" OR just fetch from firestore if possible?
                // Actually, guest might be viewing a public goal from firestore. So we should fetch it.
                // We reuse the same logic as user -> fetch goal doc to get title.
                
                try {
                    const methodGoalRef = doc(db, 'goals', method.goalId);
                    const methodGoalDoc = await getDoc(methodGoalRef);
                    // If not found in firestore, maybe check local created goals?
                    let goalTitle = methodGoalDoc.exists() ? methodGoalDoc.data().title : null;
                    
                    if (!goalTitle) {
                         const localCreatedGoals = JSON.parse(localStorage.getItem('guest_createdGoals') || '[]') as any[];
                         const found = localCreatedGoals.find(g => g.id === method.goalId);
                         goalTitle = found ? found.title : 'Unknown Goal';
                    }
                    
                    setTargetGoalTitle(goalTitle || 'Unknown Goal');
                    setShowGoalModal(true);
                    return;
                } catch (e) {
                     // Fallback if fetch fails
                     setTargetGoalTitle('this Goal');
                     setShowGoalModal(true);
                     return;
                }
           }
           
           localMethods[methodId] = {
               status: 'active',
               addedAt: new Date().toISOString()
           };
           setIsTrying(true);
           setMethod(prev => prev ? { ...prev, stats: { ...prev.stats, activeUsers: prev.stats.activeUsers + 1 } } : null);
        }
        localStorage.setItem('guest_chosenMethods', JSON.stringify(localMethods));
      }
    } catch (error) {
      console.error('Error toggling trying status:', error);
    }
  };

  const handleAcceptReferenceGoal = async () => {
    if (!method) return;
    
    setIsGoalModalLoading(true);
    try {
        if (user) {
            // 1. Join Goal
            const goalRef = doc(db, 'users', user.uid, 'chosenGoals', method.goalId);
            await setDoc(goalRef, {
                 addedAt: serverTimestamp(),
            });
            
            // 2. Join Method
            const chosenRef = doc(db, 'users', user.uid, 'chosenMethods', methodId);
            const methodRef = doc(db, 'methods', methodId);
    
            await setDoc(chosenRef, {
                 addedAt: serverTimestamp(),
                 attempts: [],
                 status: 'active',
            });
            
            await updateDoc(methodRef, { 'stats.activeUsers': increment(1) });
               
            setIsTrying(true);
            setMethod(prev => prev ? { ...prev, stats: { ...prev.stats, activeUsers: prev.stats.activeUsers + 1 } } : null);
        } else {
            // Guest Logic
            
            // 1. Join Goal
             const localGoals = JSON.parse(localStorage.getItem('guest_chosenGoals') || '[]') as string[];
             if (!localGoals.includes(method.goalId)) {
                localGoals.push(method.goalId);
                localStorage.setItem('guest_chosenGoals', JSON.stringify(localGoals));
             }
             
            // 2. Join Method
             const localMethods = JSON.parse(localStorage.getItem('guest_chosenMethods') || '{}');
             localMethods[methodId] = {
                   status: 'active',
                   addedAt: new Date().toISOString()
             };
             localStorage.setItem('guest_chosenMethods', JSON.stringify(localMethods));
             
             setIsTrying(true);
             setMethod(prev => prev ? { ...prev, stats: { ...prev.stats, activeUsers: prev.stats.activeUsers + 1 } } : null);
        }

        setShowGoalModal(false);
    } catch (error) {
        console.error("Error accepting goal and method:", error);
        alert("Something went wrong. Please try again.");
    } finally {
        setIsGoalModalLoading(false);
    }
  };

  const handleEnterShortcutMode = () => {
       // Default to saved or first resource unique key
       const firstResourceKey = method?.resources[0] ? (method.resources[0].id || method.resources[0].url) : null;
       setSelectedShortcutUi(savedShortcut || firstResourceKey);
       setShortcutMode(true);
  };

  const handleSaveShortcut = async () => {
       try {
           if (selectedShortcutUi) {
               if (user) {
                    const chosenRef = doc(db, 'users', user.uid, 'chosenMethods', methodId);
                    await updateDoc(chosenRef, { shortcutResourceId: selectedShortcutUi });
               } else {
                   // Guest Logic
                   const localMethods = JSON.parse(localStorage.getItem('guest_chosenMethods') || '{}');
                   if (localMethods[methodId]) {
                       localMethods[methodId].shortcutResourceId = selectedShortcutUi;
                       localStorage.setItem('guest_chosenMethods', JSON.stringify(localMethods));
                   }
               }
               setSavedShortcut(selectedShortcutUi);
           }
       } catch (error) {
           console.error('Error saving shortcut:', error);
           alert('Failed to save shortcut');
       }
       setShortcutMode(false);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewContent.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      if (user) {
          const reviewData = {
            methodId,
            userId: user.uid,
            score: Number(reviewScore), // Ensure it's a number
            content: reviewContent.trim(),
            attemptsSummary: { count: 0, totalDurationMinutes: 0 },
            metMinimum: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          
          const reviewDoc = await addDoc(collection(db, 'reviews'), reviewData);
          
          // Update method stats
          const newReviewCount = (method?.stats.reviewCount || 0) + 1;
          const currentTotal = (method?.stats.avgRating || 0) * (method?.stats.reviewCount || 0);
          const newAvgRating = (currentTotal + reviewScore) / newReviewCount;
          
          await updateDoc(doc(db, 'methods', methodId), {
            'stats.reviewCount': newReviewCount,
            'stats.avgRating': newAvgRating,
          });
          
          // Add to local state
          const newReview: Review = {
            id: reviewDoc.id,
            methodId,
            userId: user.uid,
            score: reviewScore,
            content: reviewContent.trim(),
            attemptsSummary: { count: 0, totalDurationMinutes: 0 },
            metMinimum: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          setReviews(prev => [newReview, ...prev]);
          setMethod(prev => prev ? {
            ...prev,
            stats: { ...prev.stats, reviewCount: newReviewCount, avgRating: newAvgRating }
          } : null);
      } else {
          // Guest Logic
          const newReview: Review = {
            id: crypto.randomUUID(),
            methodId,
            userId: 'guest',
            score: reviewScore,
            content: reviewContent.trim(),
            attemptsSummary: { count: 0, totalDurationMinutes: 0 },
            metMinimum: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          const localReviews = JSON.parse(localStorage.getItem('guest_reviews') || '[]') as Review[];
          localReviews.push(newReview);
          localStorage.setItem('guest_reviews', JSON.stringify(localReviews));
          
          // Update local state and stats
          const newReviewCount = (method?.stats.reviewCount || 0) + 1;
          const currentTotal = (method?.stats.avgRating || 0) * (method?.stats.reviewCount || 0);
          const newAvgRating = (currentTotal + reviewScore) / newReviewCount;

          setReviews(prev => [newReview, ...prev]);
          setMethod(prev => prev ? {
            ...prev,
            stats: { ...prev.stats, reviewCount: newReviewCount, avgRating: newAvgRating }
          } : null);
      }
      
      // Reset form
      setReviewContent('');
      setReviewScore(0);
      setShowReviewForm(false);
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = () => {
    if (method) {
      setEditData({
        title: method.title,
        description: method.description,
        resources: [...method.resources],
        suggestedMinimum: { ...method.suggestedMinimum }
      });
      setIsEditing(true);
    }
  };

  const handleUpdateMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !method || !editData.title?.trim()) return;

    setIsUpdating(true);
    try {
       // Filter empty resources and ensure IDs
       const updatedResources = (editData.resources || [])
         .filter(r => r.title.trim() || r.url.trim())
         .map(r => ({ ...r, id: r.id || crypto.randomUUID() }));

       const updates = {
         title: editData.title.trim(),
         description: editData.description?.trim() || '',
         resources: updatedResources,
         suggestedMinimum: editData.suggestedMinimum || method.suggestedMinimum,
       };

       await updateDoc(doc(db, 'methods', methodId), updates);
       
       setMethod({ ...method, ...updates });
       setIsEditing(false);
    } catch (error) {
       console.error("Error updating method:", error);
       alert("Failed to update method.");
    } finally {
       setIsUpdating(false);
    }
  };

  const updateEditResource = (index: number, field: 'title' | 'url', value: string) => {
    setEditData(prev => {
        if (!prev.resources) return prev;
        const newResources = [...prev.resources];
        newResources[index] = { ...newResources[index], [field]: value };
        return { ...prev, resources: newResources };
    });
  };

  const addEditResource = () => {
     setEditData(prev => ({
        ...prev,
        resources: [...(prev.resources || []), { title: '', url: '', id: crypto.randomUUID() }]
     }));
  };

  const removeEditResource = (index: number) => {
     setEditData(prev => ({
        ...prev,
        resources: (prev.resources || []).filter((_, i) => i !== index)
     }));
  };
  
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[var(--text-muted)]">Loading...</div>
      </div>
    );
  }
  
  if (!method) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">?</div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Method not found</h2>
          <Link href="/goals" className="text-[var(--primary)] hover:underline mt-4 inline-block">
            ← Back to Goals
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen">
      <Header currentPage={isPrivateMode ? 'my-cave' : 'other'} />
      
      {/* Content */}
      <main className="container py-8">
        {/* Method Header */}
        {/* Method Header / Edit Form */}
        {isEditing ? (
           <Card className="mb-8">
             <CardContent className="pt-6">
                <form onSubmit={handleUpdateMethod} className="space-y-4">
                  <Input
                    label="Method Title"
                    value={editData.title || ''}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                    required
                  />
                  <Textarea
                    label="Description"
                    value={editData.description || ''}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  />
                  
                  <div>
                      <div className="flex items-center gap-2 mb-2">
                          <label className="block text-sm font-medium text-[var(--text-primary)]">
                            Resources
                          </label>
                          <InfoTooltip content="The first resource in this list will be the default shortcut button on the Goals Dashboard. Users can customize this for themselves later." />
                      </div>
                      <div className="space-y-2">
                        {editData.resources?.map((resource, index) => (
                           <div key={index} className="flex gap-2 relative">
                              {index === 0 && (
                                <div className="absolute -top-2 right-8 z-10 bg-[var(--surface-emphasis)] text-[var(--text-primary)] text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider border border-[var(--border-subtle)]">
                                  Default Shortcut
                                </div>
                              )}
                              <Input
                                placeholder="Title"
                                value={resource.title}
                                onChange={(e) => updateEditResource(index, 'title', e.target.value)}
                                className="flex-1"
                              />
                              <Input
                                placeholder="URL"
                                value={resource.url}
                                onChange={(e) => updateEditResource(index, 'url', e.target.value)}
                                className="flex-1"
                              />
                              <button type="button" onClick={() => removeEditResource(index)} className="text-red-500 px-2">✕</button>
                           </div>
                        ))}
                        <button type="button" onClick={addEditResource} className="text-primary text-sm hover:underline">+ Add resource</button>
                      </div>
                  </div>

                  <div>
                     <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Type</label>
                     <div className="flex gap-2">
                        <Input
                           type="number"
                           min="1"
                           value={editData.suggestedMinimum?.value || 1}
                           onChange={(e) => setEditData({
                               ...editData, 
                               suggestedMinimum: { ...editData.suggestedMinimum!, value: parseInt(e.target.value) || 1 } 
                           })}
                           className="w-24"
                        />
                        <select
                           value={editData.suggestedMinimum?.type || 'days'}
                           onChange={(e) => setEditData({
                               ...editData,
                               suggestedMinimum: { ...editData.suggestedMinimum!, type: e.target.value as any }
                           })}
                           className="input"
                        >
                           <option value="hours">hours</option>
                           <option value="days">days</option>
                           <option value="attempts">attempts</option>
                        </select>
                     </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                     <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
                     <Button type="submit" isLoading={isUpdating}>Save Changes</Button>
                  </div>
                </form>
             </CardContent>
           </Card>
        ) : (
        <div className="mb-8 relative group">
          <div className="flex justify-between items-start">
             <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                  {method.title}
                </h1>
                <p className="text-[var(--text-secondary)] mb-4">
                  {method.description}
                </p>
             </div>
             {user?.uid === method.createdBy && (
               <Button variant="secondary" onClick={handleEditClick} className="ml-4">
                 Edit
               </Button>
             )}
          </div>
          
          <div className="mb-4">
            <button
              onClick={handleToggleTrying}
              className={`px-4 py-2 rounded-full font-medium transition-all cursor-pointer ${
                isTrying
                  ? 'bg-[var(--primary)] text-white shadow-md'
                  : 'bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]'
              }`}
            >
              {isTrying ? '✓ Trying' : '+ Try This Method'}
            </button>
          </div>
          
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-1">
              <span className="font-medium">{method.stats.avgRating > 0 ? method.stats.avgRating.toFixed(2) : '–'}</span>
              <span className="text-[var(--text-muted)]">({method.stats.reviewCount} reviews)</span>
            </div>
            <div className="flex items-center gap-1">
              <span>{method.stats.activeUsers} trying</span>
            </div>
            <div className="flex items-center gap-1 text-[var(--text-muted)]">
              <span>Try for {method.suggestedMinimum.value} {method.suggestedMinimum.type}</span>
            </div>
          </div>
        </div>
        )}
        
        {/* Tabs */}
        <div className="flex gap-2 mb-8 p-1 bg-[var(--surface-subtle)] rounded-[var(--radius-interactive)] overflow-x-auto">
          <button
            onClick={() => setActiveTab('resources')}
            className={`flex-1 py-3 px-6 text-base font-medium rounded-[var(--radius-interactive)] transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'resources'
                ? 'bg-white shadow-sm text-[var(--primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]'
            }`}
          >
            Resources
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`flex-1 py-3 px-6 text-base font-medium rounded-[var(--radius-interactive)] transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'reviews'
                ? 'bg-white shadow-sm text-[var(--primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]'
            }`}
          >
            Reviews ({reviews.length})
          </button>
          <button
            onClick={() => setActiveTab('trends')}
            className={`flex-1 py-3 px-6 text-base font-medium rounded-[var(--radius-interactive)] transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'trends'
                ? 'bg-white shadow-sm text-[var(--primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]'
            }`}
          >
            Trends
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`flex-1 py-3 px-6 text-base font-medium rounded-[var(--radius-interactive)] transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'events'
                ? 'bg-white shadow-sm text-[var(--primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]'
            }`}
          >
            Events ({events.length})
          </button>
        </div>
        
        {/* Tab Content */}
        {activeTab === 'resources' && (
          <div className="animate-fade-in">
            {method.resources.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[var(--text-muted)]">No resources added yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {method.resources.map((resource, index) => {
                  // Determine unique identifier for this resource
                  const resourceKey = resource.id;
                  
                  // Calculate if we have a valid saved shortcut in the current list
                  const hasValidShortcut = method.resources.some(r => r.id === savedShortcut);
                  const isSelected = selectedShortcutUi === resourceKey;

                  return (
                    <div key={index} className="flex items-center gap-3">
                       {shortcutMode && (
                          <input 
                              type="radio" 
                              name="shortcut"
                              checked={!!resourceKey && isSelected}
                              onChange={() => resourceKey && setSelectedShortcutUi(resourceKey)}
                              className="w-5 h-5 accent-[var(--primary)] cursor-pointer"
                              disabled={!resourceKey} // Disable if no ID
                          />
                       )}
                       <div className="flex-1 relative">
                          {isSelected && shortcutMode && (
                              <div className="absolute -top-2 -right-2 z-10 bg-[var(--surface-emphasis)] text-[var(--text-primary)] text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm uppercase tracking-wider border border-[var(--primary)]">
                                Selected
                              </div>
                          )}
                          {!shortcutMode && ((savedShortcut === resourceKey) || (!hasValidShortcut && index === 0)) && (
                            <div className="absolute -top-2 -right-2 z-10 bg-[var(--primary)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm uppercase tracking-wider">
                              Shortcut
                            </div>
                          )}
                          <ResourceCard
                            title={resource.title}
                            url={resource.url}
                          />
                       </div>
                    </div>
                  );
                })}
                
                {isTrying && method.resources.length > 1 && (
                   <div className="mt-6 flex items-center gap-2">
                        {!shortcutMode ? (
                             <>
                               <Button onClick={handleEnterShortcutMode} variant="secondary">Select shortcut</Button>
                               <InfoTooltip content="Choose which resource appears as the quick access button on your dashboard card. Only one can be selected. You must save for changes to apply." />
                             </>
                        ) : (
                             <div className="flex gap-2">
                                <Button onClick={handleSaveShortcut}>Save</Button>
                                <Button onClick={() => setShortcutMode(false)} variant="secondary">Cancel</Button>
                             </div>
                        )}
                   </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'reviews' && (
          <div className="animate-fade-in">
            {/* Write Review Button */}
            <div className="mb-6">
              <Button onClick={() => setShowReviewForm(!showReviewForm)}>
                {showReviewForm ? 'Cancel' : 'Write a Review'}
              </Button>
            </div>
            
            {/* Review Form */}
            {showReviewForm && (
              <Card className="mb-6 animate-fade-in">
                <CardHeader>
                  <CardTitle>{user ? 'Write Your Review' : 'Write Private Note (Local Only)'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitReview} className="space-y-4">
                    {!user && (
                        <div className="bg-[var(--surface-subtle)] p-3 rounded-md text-sm text-[var(--text-secondary)] mb-2">
                             Note: This review is private and saved only to this device. <Link href="/signup" className="text-[var(--primary)] hover:underline">Sign Up</Link> to post public reviews.
                        </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        Your Rating
                      </label>
                      <StarRatingInput 
                        value={reviewScore} 
                        onChange={setReviewScore} 
                        size="md"
                      />
                      {reviewScore === 0 && (
                        <p className="text-sm text-red-500 mt-1 italic">Please select a rating</p>
                      )}
                    </div>
                    
                    <Textarea
                      label="Your Experience"
                      placeholder="Describe your experience with this method. What worked? What didn't? Be specific to help others."
                      value={reviewContent}
                      onChange={(e) => setReviewContent(e.target.value)}
                      required
                    />
                    
                    <Button 
                      type="submit" 
                      isLoading={isSubmitting}
                      disabled={reviewScore === 0}
                    >
                      {user ? 'Submit Review' : 'Save Private Note'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
            
            {/* Reviews List */}
            {reviews.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[var(--text-muted)]">No reviews yet. Be the first!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <ReviewCard 
                     key={review.id} 
                     review={review} 
                     onViewJourney={(uid) => setJourneyUserId(uid)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'trends' && (
             <div className="animate-fade-in">
                 {reviews.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-[var(--text-muted)]">Not enough data to calculate trends yet.</p>
                    </div>
                 ) : (
                    <ReviewTrends reviews={reviews} />
                 )}
             </div>
        )}
        
        {activeTab === 'events' && (
          <div className="animate-fade-in">
            {/* Create Event Button */}
            <div className="mb-6">
              <Button onClick={() => {
                  if (user) {
                     router.push(`/events/create?methodId=${methodId}${isPrivateMode ? '&private=true' : ''}`);
                  } else {
                     router.push('/signup');
                  }
              }}>
                + Create Event
              </Button>
            </div>
            
            {/* Events List */}
            {events.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[var(--text-muted)]">No upcoming events</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {events.map((event) => (
                  <EventCard key={event.id} event={event} isPrivateMode={isPrivateMode} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Journey Modal */}
      {journeyUserId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
           <div className="bg-[var(--background)] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
               <div className="p-4 border-b border-[var(--border-subtle)] flex justify-between items-center sticky top-0 bg-[var(--background)] z-10">
                   <h2 className="text-lg font-bold">User Journey</h2>
                   <button onClick={() => setJourneyUserId(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">✕</button>
               </div>
                <div className="p-6">
                    <ReviewTrends reviews={reviews} currentUserId={journeyUserId} />
                </div>
            </div>
        </div>
      )}

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
                         <span className="text-[var(--primary)] font-bold text-2xl block">{targetGoalTitle}</span>
                     </div>
                     
                     <div>
                         <span className="font-bold text-[var(--text-secondary)] uppercase tracking-wide text-xs block mb-2">Method</span>
                         <span className="text-[var(--primary)] font-bold text-2xl block">{method.title}</span>
                     </div>
                 </div>
                 
                 <div className="flex gap-4 justify-center max-w-md mx-auto">
                     <Button 
                         variant="ghost" 
                         onClick={() => setShowGoalModal(false)}
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

export default function MethodDetailPage({ params }: { params: PageParams }) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-[var(--text-muted)]">Loading...</div></div>}>
      <MethodDetailContent params={params} />
    </Suspense>
  );
}
