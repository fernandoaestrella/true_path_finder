import React from 'react';
import { Card, CardContent } from '@/components';
import { Review } from '@/types';

interface ReviewCardProps {
  review: Review;
  onViewJourney?: (userId: string) => void;
  showJourneyAction?: boolean;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ 
  review, 
  onViewJourney,
  showJourneyAction = true
}) => {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
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
                {review.createdAt instanceof Date ? review.createdAt.toLocaleDateString() : new Date(review.createdAt).toLocaleDateString()}
                </span>
                {review.metMinimum && (
                <span className="text-xs px-2 py-0.5 bg-[var(--secondary)] text-white rounded-full">
                    ✓ Verified
                </span>
                )}
            </div>
            {showJourneyAction && onViewJourney && (
                <button 
                    onClick={() => onViewJourney(review.userId)}
                    className="text-xs text-[var(--primary)] hover:underline font-medium cursor-pointer"
                >
                    See Journey
                </button>
            )}
        </div>
        <p className="text-[var(--text-secondary)]">
          {review.content}
        </p>
      </CardContent>
    </Card>
  );
};
