import React, { useState } from 'react';

interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const RATINGS = [
  { value: 1, label: 'Negative/Harmful', emoji: '😖' },
  { value: 2, label: 'No Effect', emoji: '😐' },
  { value: 3, label: 'Helpful', emoji: '🙂' },
  { value: 4, label: 'Significant Improvement', emoji: '😀' },
  { value: 5, label: 'Life Changing', emoji: '🤩' },
];

export const StarRatingInput: React.FC<StarRatingInputProps> = ({ 
  value, 
  onChange, 
  disabled = false,
  size = 'md',
  showLabel = true
}) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const sizeClasses = {
    sm: 'w-8 h-8 text-lg',
    md: 'w-12 h-12 text-2xl',
    lg: 'w-16 h-16 text-3xl',
  };

  const currentLabel = RATINGS.find(r => r.value === (hoverValue || value));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {RATINGS.map((rating) => (
          <button
            key={rating.value}
            type="button"
            onClick={() => !disabled && onChange(rating.value)}
            onMouseEnter={() => !disabled && setHoverValue(rating.value)}
            onMouseLeave={() => !disabled && setHoverValue(null)}
            disabled={disabled}
            className={`${sizeClasses[size]} rounded-[var(--radius-interactive)] transition-all flex items-center justify-center cursor-pointer ${
              rating.value <= (hoverValue || value)
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:bg-[var(--accent-muted)] hover:text-[var(--accent)]'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label={rating.label}
            title={rating.label}
          >
            ★
          </button>
        ))}
      </div>
      {showLabel && (
        <div className="h-6">
            {currentLabel ? (
                <div className="text-sm font-medium text-[var(--accent)] animate-fade-in flex items-center gap-2">
                    <span>{currentLabel.emoji}</span>
                    <span>{currentLabel.label}</span>
                </div>
            ) : (
                <p className="text-sm text-[var(--text-muted)] italic">Select a rating</p>
            )}
        </div>
      )}
    </div>
  );
};
