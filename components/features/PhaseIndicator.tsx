'use client';

import React from 'react';

type Phase = 'arrival' | 'practice' | 'close';

interface PhaseIndicatorProps {
  currentPhase: Phase;
  phases: {
    arrival: { durationSeconds: number };
    practice: { durationSeconds: number };
    close: { durationSeconds: number };
  };
  elapsedSeconds: number;
}

export default function PhaseIndicator({ currentPhase, phases, elapsedSeconds }: PhaseIndicatorProps) {
  const phaseData = [
    {
      name: 'Arrival',
      key: 'arrival' as Phase,
      description: 'Welcome & Introductions',
      icon: '👋',
      color: 'soft-blue',
    },
    {
      name: 'Practice',
      key: 'practice' as Phase,
      description: 'Focused Work',
      icon: '🧘',
      color: 'sage-green',
    },
    {
      name: 'Close',
      key: 'close' as Phase,
      description: 'Reflection & Goodbye',
      icon: '🙏',
      color: 'soft-blue',
    },
  ];

  const getPhaseProgress = (phase: Phase): number => {
    const phaseDuration = phases[phase].durationSeconds;
    if (phase === currentPhase) {
      let phaseStart = 0;
      if (phase === 'practice') {
        phaseStart = phases.arrival.durationSeconds;
      } else if (phase === 'close') {
        phaseStart = phases.arrival.durationSeconds + phases.practice.durationSeconds;
      }
      const phaseElapsed = elapsedSeconds - phaseStart;
      return Math.min(100, (phaseElapsed / phaseDuration) * 100);
    } else if (isPhasePast(phase)) {
      return 100;
    }
    return 0;
  };

  const isPhasePast = (phase: Phase): boolean => {
    if (currentPhase === 'practice') {
      return phase === 'arrival';
    } else if (currentPhase === 'close') {
      return phase === 'arrival' || phase === 'practice';
    }
    return false;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const getRemainingTime = (phase: Phase): number => {
    if (phase !== currentPhase) return 0;
    
    let phaseStart = 0;
    if (phase === 'practice') {
      phaseStart = phases.arrival.durationSeconds;
    } else if (phase === 'close') {
      phaseStart = phases.arrival.durationSeconds + phases.practice.durationSeconds;
    }
    
    const phaseElapsed = elapsedSeconds - phaseStart;
    const remaining = phases[phase].durationSeconds - phaseElapsed;
    return Math.max(0, remaining);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-semibold text-charcoal mb-6 text-center">
        Event Progress
      </h2>
      
      {/* Phase Timeline */}
      <div className="flex items-center justify-between mb-8">
        {phaseData.map((phase, index) => (
          <React.Fragment key={phase.key}>
            <div className="flex flex-col items-center flex-1">
              {/* Phase Icon */}
              <div
                className={`
                  w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-3
                  transition-all duration-500
                  ${
                    currentPhase === phase.key
                      ? 'bg-soft-blue text-white scale-110 shadow-lg'
                      : isPhasePast(phase.key)
                      ? 'bg-sage-green text-white'
                      : 'bg-gray-200 text-gray-400'
                  }
                `}
              >
                {phase.icon}
              </div>
              
              {/* Phase Name */}
              <div className="text-center">
                <div
                  className={`
                    font-semibold mb-1 transition-colors
                    ${
                      currentPhase === phase.key
                        ? 'text-soft-blue text-lg'
                        : isPhasePast(phase.key)
                        ? 'text-sage-green'
                        : 'text-gray-400'
                    }
                  `}
                >
                  {phase.name}
                </div>
                <div className="text-sm text-gray-500">{phase.description}</div>
                
                {/* Current Phase Timer */}
                {currentPhase === phase.key && (
                  <div className="mt-2 text-soft-blue font-mono font-bold">
                    {formatDuration(getRemainingTime(phase.key))} left
                  </div>
                )}
                
                {/* Phase Duration */}
                {currentPhase !== phase.key && (
                  <div className="mt-2 text-xs text-gray-400">
                    {formatDuration(phases[phase.key].durationSeconds)}
                  </div>
                )}
              </div>
              
              {/* Progress Bar */}
              <div className="w-full mt-3 bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`
                    h-full transition-all duration-500
                    ${
                      currentPhase === phase.key
                        ? 'bg-soft-blue'
                        : isPhasePast(phase.key)
                        ? 'bg-sage-green'
                        : 'bg-gray-200'
                    }
                  `}
                  style={{ width: `${getPhaseProgress(phase.key)}%` }}
                />
              </div>
            </div>
            
            {/* Connector Line */}
            {index < phaseData.length - 1 && (
              <div className="w-12 h-1 mx-2 mb-16 bg-gray-300" />
            )}
          </React.Fragment>
        ))}
      </div>
      
      {/* Chat Status Indicator */}
      <div className="text-center p-4 rounded-lg bg-warm-gray">
        {currentPhase === 'practice' ? (
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <span className="w-3 h-3 rounded-full bg-gray-400"></span>
            <span className="font-medium">Chat is disabled during practice</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-sage-green">
            <span className="w-3 h-3 rounded-full bg-sage-green animate-pulse"></span>
            <span className="font-medium">Chat is active</span>
          </div>
        )}
      </div>
    </div>
  );
}
