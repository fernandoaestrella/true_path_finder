'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { APP_CONFIG } from '@/lib/config';

interface TimerContextType {
  minutes: number;
  seconds: number;
  isPaused: boolean;
  isExpired: boolean;
  totalSecondsRemaining: number;
  resetTimer: () => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [totalSeconds, setTotalSeconds] = useState(APP_CONFIG.DAILY_TIME_LIMIT_MINUTES * 60);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Calculate session key based on reset time
  const getSessionKey = useCallback(() => {
    const now = new Date();
    const resetTime = new Date(now);
    resetTime.setHours(APP_CONFIG.TIMER_RESET_HOUR, APP_CONFIG.TIMER_RESET_MINUTE, 0, 0);
    
    // If we haven't passed reset time today, use yesterday's date
    if (now < resetTime) {
      resetTime.setDate(resetTime.getDate() - 1);
    }
    
    return `tpf_session_${resetTime.toISOString().split('T')[0]}`;
  }, []);
  
  // Sync state from storage
  const syncFromStorage = useCallback(() => {
    const sessionKey = getSessionKey();
    const saved = localStorage.getItem(sessionKey);
    
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        setTotalSeconds(parsed);
      }
    } else {
      // If no saved session, distinct logic probably not needed if we trust defaults,
      // but strictly following previous logic:
      setTotalSeconds(APP_CONFIG.DAILY_TIME_LIMIT_MINUTES * 60);
    }
  }, [getSessionKey]);

  // Initial Load
  useEffect(() => {
    syncFromStorage();
    
    const sessionKey = getSessionKey();
    // Clean up old session keys
    const keys = Object.keys(localStorage).filter(k => k.startsWith('tpf_session_'));
    keys.forEach(key => {
      if (key !== sessionKey) {
        localStorage.removeItem(key);
      }
    });
  }, [syncFromStorage, getSessionKey]);
  
  // Save session time periodically
  useEffect(() => {
    const sessionKey = getSessionKey();
    localStorage.setItem(sessionKey, totalSeconds.toString());
  }, [totalSeconds, getSessionKey]);
  
  // Handle visibility changes to re-sync
  useEffect(() => {
    const handleVisibilityChange = () => {
      const hidden = document.hidden;
      setIsPaused(hidden);
      
      // If we are coming back to the tab, re-sync from storage to catch up
      // with any time burned on other tabs
      if (!hidden) {
        syncFromStorage();
      }
    };

    // Listen for storage changes from other tabs (real-time sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === getSessionKey()) {
        syncFromStorage();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorageChange);
    setIsPaused(document.hidden);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [syncFromStorage, getSessionKey]);
  
  // Check path for exemptions
  const pathname = usePathname();
  const router = useRouter();
  
  const isEventPage = pathname?.startsWith('/events/') ?? false;
  const isLimitPage = pathname === '/limit-reached';
  const isPublicPage = ['/login', '/signup', '/onboarding', '/'].includes(pathname || '');

  // Timer countdown
  useEffect(() => {
    // Don't count down on event pages, limit page, or public pages
    if (isPaused || totalSeconds <= 0 || isEventPage || isLimitPage) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    
    intervalRef.current = setInterval(() => {
      setTotalSeconds(prev => Math.max(0, prev - 1));
    }, 1000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, totalSeconds, isEventPage, isLimitPage]);

  // Handle redirection when time runs out
  useEffect(() => {
    if (totalSeconds <= 0 && !isEventPage && !isLimitPage && !isPublicPage) {
      router.push('/limit-reached');
    }
  }, [totalSeconds, isEventPage, isLimitPage, isPublicPage, router]);
  
  // Check for reset time
  useEffect(() => {
    const checkReset = () => {
      const now = new Date();
      if (now.getHours() === APP_CONFIG.TIMER_RESET_HOUR && now.getMinutes() === APP_CONFIG.TIMER_RESET_MINUTE) {
        setTotalSeconds(APP_CONFIG.DAILY_TIME_LIMIT_MINUTES * 60);
      }
    };
    
    const resetInterval = setInterval(checkReset, 60000);
    return () => clearInterval(resetInterval);
  }, []);
  
  const resetTimer = useCallback(() => {
    setTotalSeconds(APP_CONFIG.DAILY_TIME_LIMIT_MINUTES * 60);
    const sessionKey = getSessionKey();
    localStorage.setItem(sessionKey, (APP_CONFIG.DAILY_TIME_LIMIT_MINUTES * 60).toString());
  }, [getSessionKey]);
  
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  const value = {
    minutes,
    seconds,
    isPaused,
    isExpired: totalSeconds <= 0,
    totalSecondsRemaining: totalSeconds,
    resetTimer,
  };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
}
