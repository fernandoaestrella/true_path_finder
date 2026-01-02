'use client';

import React from 'react';
import { InfoTooltip } from './InfoTooltip';

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
  
  const tooltipContent = (
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
  );

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
      <InfoTooltip content={tooltipContent} />
    </div>
  );
}
