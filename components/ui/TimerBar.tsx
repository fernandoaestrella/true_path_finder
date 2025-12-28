'use client';

import React from 'react';

interface TimerBarProps {
  minutes: number;
  seconds: number;
  isPaused?: boolean;
  className?: string;
}

export function TimerBar({ minutes, seconds, isPaused = false, className = '' }: TimerBarProps) {
  // Determine timer state
  const totalMinutes = minutes + seconds / 60;
  const isLow = totalMinutes <= 5 && totalMinutes > 2;
  const isCritical = totalMinutes <= 2;
  
  const stateClass = isCritical ? 'timer-critical' : isLow ? 'timer-low' : '';
  
  // Format time
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  return (
    <div className={`timer-bar ${stateClass} ${className}`}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12,6 12,12 16,14" />
      </svg>
      <span className={isPaused ? 'animate-pulse-soft' : ''}>
        {formattedTime}
      </span>
      {isPaused && (
        <span className="text-xs opacity-70">(paused)</span>
      )}
      <InfoTooltip />
    </div>
  );
}

function InfoTooltip() {
  const [isOpen, setIsOpen] = React.useState(false);
  
  return (
    <div className="relative inline-block">
      <button
        type="button"
        className="ml-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Timer information"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 p-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg z-50 text-sm animate-fade-in">
          <ul className="space-y-2 text-[var(--text-secondary)]">
            <li className="flex items-start gap-2">
              <span className="text-[var(--primary)]">•</span>
              <span>Pauses when window is inactive</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--primary)]">•</span>
              <span>Resets at 3:20 AM your local time</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--primary)]">•</span>
              <span>Events don&apos;t count against limit</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
