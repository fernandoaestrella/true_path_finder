'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components';
import { Method, Goal } from '@/types';

interface MethodsByGoal {
  goal: Goal;
  methods: Method[];
}

interface MethodCardProps {
  method: Method;
  goalTitle: string;
  onWriteReview: (methodId: string) => void;
  onViewResources: (methodId: string) => void;
}

function MethodCard({ method, onWriteReview, onViewResources }: MethodCardProps) {
  return (
    <Card 
      className="h-full card-clickable" 
      onClick={() => onViewResources(method.id)}
    >
      <CardHeader>
        <CardTitle as="h4" className="text-base">
          {method.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-4">
          {method.description}
        </p>
        
        <div className="flex items-center gap-4 text-sm text-[var(--text-muted)] mb-4">
          <div className="flex items-center gap-1">
            <span>{method.stats.avgRating.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>{method.stats.activeUsers} trying</span>
          </div>
        </div>
        
        <div className="flex gap-2"  onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onViewResources(method.id)}
            className="flex-1 py-2 px-3 text-sm rounded-md bg-[var(--surface-subtle)] hover:bg-[var(--border)] transition-colors cursor-pointer"
          >
            Resources
          </button>
          <button
            onClick={() => onWriteReview(method.id)}
            className="flex-1 py-2 px-3 text-sm rounded-md bg-[var(--primary)] hover:bg-[var(--primary-dark)] transition-colors cursor-pointer"
          >
            Review
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

interface MethodsGridProps {
  methodsByGoal: MethodsByGoal[];
  onWriteReview: (methodId: string) => void;
  onViewResources: (methodId: string) => void;
}

export function MethodsGrid({ methodsByGoal, onWriteReview, onViewResources }: MethodsGridProps) {
  if (methodsByGoal.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
          No methods yet
        </h3>
        <p className="text-[var(--text-secondary)] mb-6">
          Choose a goal and find methods to try
        </p>
        <a
          href="/goals"
          className="btn btn-primary cursor-pointer"
        >
          Choose Goals
        </a>
      </div>
    );
  }
  
  // Adaptive layout: up to 5 methods visible in optimal layout
  const totalMethods = methodsByGoal.reduce((sum, group) => sum + group.methods.length, 0);
  const gridClass = totalMethods <= 2 ? 'grid-cols-1 md:grid-cols-2' :
                    totalMethods <= 4 ? 'grid-cols-1 md:grid-cols-2' :
                    'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
  
  return (
    <div className="space-y-8">
      {methodsByGoal.map(({ goal, methods }) => (
        <div key={goal.id}>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            {goal.title}
          </h3>
          <div className={`grid ${gridClass} gap-4`}>
            {methods.map((method) => (
              <MethodCard
                key={method.id}
                method={method}
                goalTitle={goal.title}
                onWriteReview={onWriteReview}
                onViewResources={onViewResources}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
