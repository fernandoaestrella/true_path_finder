'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components';
import { Method, Goal } from '@/types';

interface MethodsByGoal {
  goal: Goal;
  methods: Method[];
}

import Link from 'next/link';

interface MethodCardProps {
  method: Method;
  goalTitle: string;
  onWriteReview: (methodId: string) => void;
  onViewResources: (methodId: string) => void;
}

function MethodCard({ method, onWriteReview, onViewResources }: MethodCardProps) {
  // ... inside MethodCard ...
  return (
    <Card className="h-full flex flex-col">
       <Link href={`/methods/${method.id}`} className="block flex-1 hover:bg-[var(--surface-muted)] transition-colors rounded-t-[var(--radius-interactive)]">
          <CardHeader>
            <CardTitle as="h4" className="text-base text-[var(--text-primary)]">
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
          </CardContent>
       </Link>
        
       <div className="p-4 pt-0 mt-auto flex gap-2">
          <Link
            href={`/methods/${method.id}`}
             className="flex-1 py-2 px-3 text-sm rounded-[var(--radius-interactive)] bg-[var(--surface-emphasis)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors text-center font-medium"
          >
            Resources
          </Link>
          <Link
            href={`/methods/${method.id}?tab=reviews`}
             className="flex-1 py-2 px-3 text-sm rounded-[var(--radius-interactive)] bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)] transition-colors text-center font-medium"
          >
            Review
          </Link>
        </div>
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
