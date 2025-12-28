'use client';

import React from 'react';
import { TimerBar, LogoutIcon } from '@/components';
import { useSessionTimer } from '@/lib/hooks/useSessionTimer';
import { useAuth } from '@/lib/contexts/AuthContext';

interface HeaderProps {
  currentPage?: 'dashboard' | 'goals' | 'other';
  timerExtra?: React.ReactNode;
}

export function Header({ currentPage = 'other', timerExtra }: HeaderProps) {
  const { logout } = useAuth();
  const { minutes, seconds, isPaused } = useSessionTimer();

  return (
    <header className="sticky top-0 z-30 pt-8 pb-6 bg-[var(--background)]">
      <div className="container flex items-center justify-between">
        {/* Left nav */}
        <div className="flex-1 flex items-center gap-4">
          {currentPage !== 'dashboard' && (
            <a href="/dashboard" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">
              Dashboard
            </a>
          )}
          {currentPage !== 'goals' && (
            <a href="/goals" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">
              Goals
            </a>
          )}
        </div>
        
        {/* Timer centered */}
        <div className="flex items-center gap-2">
          <TimerBar minutes={minutes} seconds={seconds} isPaused={isPaused} />
          {timerExtra}
        </div>
        
        {/* Logout icon on the right */}
        <div className="flex-1 flex justify-end">
          <button
            onClick={logout}
            className="cursor-pointer hover:text-[var(--primary)] transition-colors text-[var(--text-secondary)]" 
            aria-label="Logout"
            title="Logout"
          >
            <LogoutIcon size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}
