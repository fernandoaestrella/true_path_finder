'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const DAILY_LIMIT_MINUTES = 21;
const RESET_HOUR = 3;
const RESET_MINUTE = 20;

interface SessionTimerState {
  minutes: number;
  seconds: number;
  isPaused: boolean;
  isExpired: boolean;
  totalSecondsRemaining: number;
}

/**
 * Hook to manage the 21-minute daily session timer
 * - Counts down from 21 minutes
 * - Pauses when window loses focus
 * - Resets at 3:20 AM local time
 * - Persists across page navigations (via localStorage)
 */
export function useSessionTimer(): SessionTimerState {
  const [totalSeconds, setTotalSeconds] = useState(DAILY_LIMIT_MINUTES * 60);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Calculate session key based on reset time
  const getSessionKey = useCallback(() => {
    const now = new Date();
    const resetTime = new Date(now);
    resetTime.setHours(RESET_HOUR, RESET_MINUTE, 0, 0);
    
    // If we haven't passed reset time today, use yesterday's date
    if (now < resetTime) {
      resetTime.setDate(resetTime.getDate() - 1);
    }
    
    return `tpf_session_${resetTime.toISOString().split('T')[0]}`;
  }, []);
  
  // Load saved session time
  useEffect(() => {
    const sessionKey = getSessionKey();
    const saved = localStorage.getItem(sessionKey);
    
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        setTotalSeconds(parsed);
      }
    } else {
      // New day, reset timer
      setTotalSeconds(DAILY_LIMIT_MINUTES * 60);
    }
    
    // Clean up old session keys
    const keys = Object.keys(localStorage).filter(k => k.startsWith('tpf_session_'));
    keys.forEach(key => {
      if (key !== sessionKey) {
        localStorage.removeItem(key);
      }
    });
  }, [getSessionKey]);
  
  // Save session time periodically
  useEffect(() => {
    const sessionKey = getSessionKey();
    localStorage.setItem(sessionKey, totalSeconds.toString());
  }, [totalSeconds, getSessionKey]);
  
  // Handle visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPaused(document.hidden);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    setIsPaused(document.hidden);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // Timer countdown
  useEffect(() => {
    if (isPaused || totalSeconds <= 0) {
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
  }, [isPaused, totalSeconds]);
  
  // Check for reset time
  useEffect(() => {
    const checkReset = () => {
      const now = new Date();
      if (now.getHours() === RESET_HOUR && now.getMinutes() === RESET_MINUTE) {
        setTotalSeconds(DAILY_LIMIT_MINUTES * 60);
      }
    };
    
    // Check every minute
    const resetInterval = setInterval(checkReset, 60000);
    
    return () => clearInterval(resetInterval);
  }, []);
  
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return {
    minutes,
    seconds,
    isPaused,
    isExpired: totalSeconds <= 0,
    totalSecondsRemaining: totalSeconds,
  };
}
