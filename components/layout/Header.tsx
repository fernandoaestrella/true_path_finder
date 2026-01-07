'use client';

import React, { useState } from 'react';
import { TimerBar, LogoutIcon } from '@/components';
import { useSessionTimer } from '@/lib/hooks/useSessionTimer';
import { useAuth } from '@/lib/contexts/AuthContext';

interface HeaderProps {
  currentPage?: 'dashboard' | 'goals' | 'my-cave' | 'other';
  timerExtra?: React.ReactNode;
  isOnMyCaveDashboard?: boolean; // True only when on actual /my-cave page
}

export function Header({ currentPage = 'other', timerExtra, isOnMyCaveDashboard = false }: HeaderProps) {
  const { logout, user } = useAuth();
  const { minutes, seconds, isPaused } = useSessionTimer();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <header className={`sticky top-0 z-30 pt-8 pb-6 ${currentPage === 'my-cave' ? 'cave-mode' : 'bg-[var(--background)]'}`}>
        <div className="container flex items-center justify-between">
          {/* Left nav */}
          <div className="flex-1 flex items-center gap-2">
            {currentPage !== 'dashboard' && currentPage !== 'my-cave' && (
              <a 
                href="/dashboard" 
                className="px-3 py-2 rounded-[var(--radius-interactive)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--primary-light)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
              >
                Dashboard
              </a>
            )}
            {currentPage === 'dashboard' && (
              <>
                <a 
                  href="/goals" 
                  className="px-3 py-2 rounded-[var(--radius-interactive)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--primary-light)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
                >
                  Goals
                </a>
                <a 
                  href="/my-cave" 
                  className="px-3 py-2 rounded-[var(--radius-interactive)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--primary-light)] hover:text-[var(--text-primary)] cursor-pointer transition-colors flex items-center gap-2"
                >
                  {/* Cave icon */}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6 2 2 8 2 14c0 4 2 8 4 8h12c2 0 4-4 4-8 0-6-4-12-10-12zm-2 16c-1 0-2-2-2-4s1-4 2-4 2 2 2 4-1 4-2 4zm4-6c-.5 0-1-1-1-2s.5-2 1-2 1 1 1 2-.5 2-1 2z"/>
                  </svg>
                  My Cave
                </a>
              </>
            )}
            {currentPage === 'my-cave' && (
              <>
                {isOnMyCaveDashboard ? (
                  // On actual /my-cave page - show Exit to Dashboard
                  <a 
                    href="/dashboard" 
                    className="px-3 py-2 rounded-[var(--radius-interactive)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--primary-light)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
                  >
                    Exit My Cave
                  </a>
                ) : (
                  // On other private pages - show My Cave button to go back
                  <a 
                    href="/my-cave" 
                    className="px-3 py-2 rounded-[var(--radius-interactive)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--primary-light)] hover:text-[var(--text-primary)] cursor-pointer transition-colors flex items-center gap-2"
                  >
                    {/* Cave icon */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6 2 2 8 2 14c0 4 2 8 4 8h12c2 0 4-4 4-8 0-6-4-12-10-12zm-2 16c-1 0-2-2-2-4s1-4 2-4 2 2 2 4-1 4-2 4zm4-6c-.5 0-1-1-1-2s.5-2 1-2 1 1 1 2-.5 2-1 2z"/>
                    </svg>
                    My Cave Entrance
                  </a>
                )}
                <a 
                  href="/goals?private=true" 
                  className="px-3 py-2 rounded-[var(--radius-interactive)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--primary-light)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
                >
                  Goals
                </a>
              </>
            )}
          </div>
          
          {/* Timer centered */}
          <div className="flex items-center gap-2">
            <TimerBar minutes={minutes} seconds={seconds} isPaused={isPaused} />
            {timerExtra}
          </div>
          
          {/* Hamburger menu on the right */}
          <div className="flex-1 flex justify-end">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-2 rounded-[var(--radius-interactive)] bg-[var(--surface-subtle)] hover:bg-[var(--primary-light)] cursor-pointer transition-colors"
              aria-label="Open menu"
              title="Menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Side Menu Overlay */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Side Menu Panel */}
      <div 
        className={`fixed top-0 right-0 h-full w-64 bg-[var(--background)] shadow-lg z-50 transform transition-transform duration-200 ${
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-4">
          <div className="flex justify-end mb-6">
            <button
              onClick={() => setIsMenuOpen(false)}
              className="p-2 rounded-[var(--radius-interactive)] bg-[var(--surface-subtle)] hover:bg-[var(--primary-light)] cursor-pointer transition-colors"
              aria-label="Close menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          
          <nav className="space-y-2">
            {!user ? (
               <>
                 <a
                    href="/about"
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-interactive)] bg-[var(--surface-subtle)] hover:bg-[var(--primary-light)] cursor-pointer transition-colors text-[var(--text-primary)]"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <span>About</span>
                  </a>
                  <a
                    href="/signup"
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-interactive)] bg-[var(--surface-subtle)] hover:bg-[var(--primary-light)] cursor-pointer transition-colors text-[var(--text-primary)]"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <span>Create Account</span>
                  </a>
               </>
            ) : (
                <>
                  <a
                    href="/profile"
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-interactive)] bg-[var(--surface-subtle)] hover:bg-[var(--primary-light)] cursor-pointer transition-colors text-[var(--text-primary)]"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <span>Profile</span>
                  </a>
      
                  <a
                    href="/about"
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-interactive)] bg-[var(--surface-subtle)] hover:bg-[var(--primary-light)] cursor-pointer transition-colors text-[var(--text-primary)]"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <span>About</span>
                  </a>
                  
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-interactive)] bg-[var(--surface-subtle)] hover:bg-[var(--primary-light)] cursor-pointer transition-colors text-[var(--text-primary)]"
                  >
                    <LogoutIcon size={20} />
                    <span>Logout</span>
                  </button>
                </>
            )}
          </nav>
        </div>
      </div>
    </>
  );
}
