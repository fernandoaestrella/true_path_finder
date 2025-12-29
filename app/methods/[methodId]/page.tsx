'use client';

import React, { useState, useEffect, use, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, Textarea, Card, CardHeader, CardTitle, CardContent, Header } from '@/components';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Method, Review, TPFEvent } from '@/types';
import { collection, getDocs, addDoc, doc, getDoc, serverTimestamp, updateDoc, query, where, orderBy, setDoc, deleteDoc, increment } from 'firebase/firestore';
import { db } from '@/src/lib/firebase/config';
import { EventCard } from '@/components';
import { getNextEventOccurrence } from '@/lib/utils/eventUtils';

type PageParams = Promise<{ methodId: string }>;

function MethodDetailContent({ params }: { params: PageParams }) {
  const { methodId } = use(params);
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  
  const [method, setMethod] = useState<Method | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [events, setEvents] = useState<TPFEvent[]>([]);
  const [isTrying, setIsTrying] = useState(false);
  
  // Initialize active tab from URL param
  const tabParam = searchParams.get('tab');
  const initialTab = tabParam === 'reviews' ? 'reviews' : tabParam === 'events' ? 'events' : 'resources';
  const [activeTab, setActiveTab] = useState<'resources' | 'reviews' | 'events'>(initialTab);
  const [isLoading, setIsLoading] = useState(true);
  
  // Review form
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewScore, setReviewScore] = useState(0);
  const [reviewContent, setReviewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/login';
    }
  }, [authLoading, user]);
  
  // Fetch method and reviews
  useEffect(() => {
    if (!user) return;
    
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
          } as Method);
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
        
        setReviews(methodReviews);
        
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
        const chosenRef = doc(db, 'users', user.uid, 'chosenMethods', methodId);
        const chosenDoc = await getDoc(chosenRef);
        setIsTrying(chosenDoc.exists());

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [user, methodId]);

  const handleToggleTrying = async () => {
    if (!user || !method) return;

    try {
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
          alert("You must be working on the parent goal to try this method. Go to Goals to add it.");
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
    } catch (error) {
      console.error('Error toggling trying status:', error);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !reviewContent.trim()) return;
    
    setIsSubmitting(true);
    
    try {
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
  
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-[var(--text-muted)]">Loading...</div>
      </div>
    );
  }
  
  if (!method) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Method not found</h2>
          <a href="/goals" className="text-[var(--primary)] hover:underline mt-4 inline-block">
            ← Back to Goals
          </a>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Header />
      
      {/* Content */}
      <main className="container py-8">
        {/* Method Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
            {method.title}
          </h1>
          <p className="text-[var(--text-secondary)] mb-4">
            {method.description}
          </p>
          
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
        
        {/* Tabs */}
        <div className="flex gap-2 mb-8 p-1 bg-[var(--surface-subtle)] rounded-[var(--radius-interactive)]">
          <button
            onClick={() => setActiveTab('resources')}
            className={`flex-1 py-3 px-6 text-base font-medium rounded-[var(--radius-interactive)] transition-all cursor-pointer ${
              activeTab === 'resources'
                ? 'bg-white shadow-sm text-[var(--primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]'
            }`}
          >
            Resources
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`flex-1 py-3 px-6 text-base font-medium rounded-[var(--radius-interactive)] transition-all cursor-pointer ${
              activeTab === 'reviews'
                ? 'bg-white shadow-sm text-[var(--primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]'
            }`}
          >
            Reviews ({reviews.length})
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`flex-1 py-3 px-6 text-base font-medium rounded-[var(--radius-interactive)] transition-all cursor-pointer ${
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
                <div className="text-5xl mb-4">📚</div>
                <p className="text-[var(--text-muted)]">No resources added yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {method.resources.map((resource, index) => (
                  <a
                    key={index}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 bg-[var(--surface-subtle)] rounded-xl hover:bg-[var(--surface-muted)] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🔗</span>
                      <div>
                        <h4 className="font-medium text-[var(--text-primary)]">
                          {resource.title || 'Resource'}
                        </h4>
                        <p className="text-sm text-[var(--text-muted)] truncate">
                          {resource.url}
                        </p>
                      </div>
                    </div>
                  </a>
                ))}
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
                  <CardTitle>Write Your Review</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitReview} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        Your Rating
                      </label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((score) => (
                          <button
                            key={score}
                            type="button"
                            onClick={() => setReviewScore(score)}
                            className={`w-12 h-12 rounded-[var(--radius-interactive)] text-2xl transition-all flex items-center justify-center cursor-pointer ${
                              score <= reviewScore
                                ? 'bg-[var(--accent)] text-white shadow-sm'
                                : 'bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:bg-[var(--accent-muted)] hover:text-[var(--accent)]'
                            }`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
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
                      Submit Review
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
            
            {/* Reviews List */}
            {reviews.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">💬</div>
                <p className="text-[var(--text-muted)]">No reviews yet. Be the first!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((score) => (
                            <span
                              key={score}
                              className={score <= review.score ? 'text-[var(--accent)]' : 'text-[var(--surface-hover)]'}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                        <span className="text-sm text-[var(--text-muted)]">
                          {review.createdAt.toLocaleDateString()}
                        </span>
                        {review.metMinimum && (
                          <span className="text-xs px-2 py-0.5 bg-[var(--secondary)] text-white rounded-full">
                            ✓ Verified
                          </span>
                        )}
                      </div>
                      <p className="text-[var(--text-secondary)]">
                        {review.content}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'events' && (
          <div className="animate-fade-in">
            {/* Create Event Button */}
            <div className="mb-6">
              <Button onClick={() => window.location.href = `/events/create?methodId=${methodId}`}>
                ➕ Create Event
              </Button>
            </div>
            
            {/* Events List */}
            {events.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">📅</div>
                <p className="text-[var(--text-muted)] mb-4">No upcoming events</p>
                <Button onClick={() => window.location.href = `/events/create?methodId=${methodId}`}>
                  Create the First Event
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function MethodDetailPage({ params }: { params: PageParams }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)] flex items-center justify-center"><div className="text-[var(--text-muted)]">Loading...</div></div>}>
      <MethodDetailContent params={params} />
    </Suspense>
  );
}
