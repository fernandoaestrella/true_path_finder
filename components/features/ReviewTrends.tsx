'use client';

import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ReferenceLine,
  Cell,
  Legend
} from 'recharts';
import { Review } from '@/types';

interface ReviewTrendsProps {
  reviews: Review[];
  isMockData?: boolean;
  currentUserId?: string;
}

const RATINGS = [
  { value: 1, label: 'Negative/Harmful', color: '#ef4444' },
  { value: 2, label: 'No Effect', color: '#6b7280' },
  { value: 3, label: 'Helpful', color: '#eab308' },
  { value: 4, label: 'Significant Improvement', color: '#3b82f6' },
  { value: 5, label: 'Life Changing', color: '#8b5cf6' },
];

const TIME_RANGES = [
  { label: '1M', days: 30 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
  { label: 'All', days: 0 },
];

export const ReviewTrends: React.FC<ReviewTrendsProps> = ({ 
  reviews, 
  isMockData = false,
  currentUserId
}) => {
  const [timeRange, setTimeRange] = useState(TIME_RANGES[3]); // Default All

  // --- Data Processing ---
  
  const filteredReviews = useMemo(() => {
    if (!reviews.length) return [];
    if (timeRange.days === 0) return reviews;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeRange.days);
    
    return reviews.filter(r => new Date(r.createdAt) >= cutoffDate);
  }, [reviews, timeRange]);

  // 1. Average Score Over Time (Bridged)
  const avgScoreData = useMemo(() => {
    // Group by Month (YYYY-MM)
    const grouped = new Map<string, { total: number; count: number; date: Date }>();
    
    filteredReviews.forEach(r => {
      const date = new Date(r.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const current = grouped.get(key) || { total: 0, count: 0, date };
      grouped.set(key, { 
        total: current.total + r.score, 
        count: current.count + 1,
        date: current.date // Keep one date for sorting
      });
    });

    return Array.from(grouped.entries())
      .map(([key, data]) => ({
        date: key,
        avg: data.total / data.count,
        timestamp: data.date.getTime()
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [filteredReviews]);

  // 2. Impact Distribution
  const impactData = useMemo(() => {
    // Get latest review per user to avoid double counting
    const latestReviews = new Map<string, Review>();
    filteredReviews.forEach(r => {
      const existing = latestReviews.get(r.userId);
      if (!existing || new Date(r.createdAt) > new Date(existing.createdAt)) {
        latestReviews.set(r.userId, r);
      }
    });

    const activeCounts = new Array(6).fill(0); // Index 1-5 used
    const graduatedCounts = new Array(6).fill(0);

    latestReviews.forEach(r => {
       // Rough logic for 'Active' vs 'Graduated' - checking metMinimum or if specified in future
       if (r.metMinimum) {
           graduatedCounts[r.score]++;
       } else {
           activeCounts[r.score]++;
       }
    });

    return RATINGS.map(r => ({
      name: String(r.value),
      star: r.value,
      label: r.label,
      active: activeCounts[r.value],
      graduated: graduatedCounts[r.value],
      color: r.color
    }));
  }, [filteredReviews]);

  // 3. Survival Curve (Simplified Retention)
  const survivalData = useMemo(() => {
     // This requires tracking "start date" vs "current date" or "drop off"
     // For reviews, we can assume 'Survival' means sending reviews over time.
     // Better metric: % of users who posted a review at Day X vs Day 0.
     if (!filteredReviews.length) return [];

     // Group reviews by user
     const userJourneys = new Map<string, Date[]>();
     filteredReviews.forEach(r => {
        const dates = userJourneys.get(r.userId) || [];
        dates.push(new Date(r.createdAt));
        userJourneys.set(r.userId, dates);
     });

     const retentionBuckets: Record<string, number> = {
         'Day 1': 0, 'Week 1': 0, 'Month 1': 0, 'Month 3': 0, 'Month 6': 0
     };
     
     let totalUsers = 0;

     userJourneys.forEach((dates) => {
         totalUsers++;
         dates.sort((a,b) => a.getTime() - b.getTime());
         const start = dates[0];
         const last = dates[dates.length - 1];
         const diffDays = (last.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

         retentionBuckets['Day 1']++; // Everyone starts
         if (diffDays >= 7) retentionBuckets['Week 1']++;
         if (diffDays >= 30) retentionBuckets['Month 1']++;
         if (diffDays >= 90) retentionBuckets['Month 3']++;
         if (diffDays >= 180) retentionBuckets['Month 6']++;
     });

     return Object.entries(retentionBuckets).map(([label, count]) => ({
         name: label,
         pct: totalUsers > 0 ? (count / totalUsers) * 100 : 0
     }));

  }, [filteredReviews]);

  // 4. Personal Journey (Calculated if user exists)
  const personalData = useMemo(() => {
      if (!currentUserId) return [];
      const myReviews = filteredReviews
          .filter(r => r.userId === currentUserId)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      return myReviews.map(r => ({
          date: new Date(r.createdAt).toLocaleDateString(),
          score: r.score
      }));
  }, [filteredReviews, currentUserId]);


  // Helper for Chart Tooltips
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--surface-elevated)] p-3 border border-[var(--border-subtle)] rounded shadow-lg text-sm">
          <p className="font-bold mb-1 text-[var(--text-primary)]">{label}</p>
          {payload.map((p: any, idx: number) => (
             <p key={idx} style={{ color: p.color || p.stroke }}>
                {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
                {p.name === 'pct' ? '%' : ''}
             </p>
          ))}
          {/* Show label for impact chart */}
          {payload[0]?.payload?.label && (
              <p className="text-xs text-[var(--text-secondary)] mt-1 italic">{payload[0].payload.label}</p>
          )}
        </div>
      );
    }
    return null;
  };

  if (!reviews.length) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      {isMockData && (
        <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-3 rounded" role="alert">
          <p className="font-bold">MOCK DATA MODE</p>
          <p className="text-sm">You are viewing generated data for demonstration purposes.</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex justify-end gap-2">
         {TIME_RANGES.map(range => (
             <button
               key={range.label}
               onClick={() => setTimeRange(range)}
               className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${
                   timeRange.label === range.label 
                   ? 'bg-[var(--primary)] text-white' 
                   : 'bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]'
               }`}
             >
               {range.label}
             </button>
         ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* 1. Avg Score (The Truth Curve) */}
        <div className="bg-[var(--surface-card)] p-4 rounded-xl border border-[var(--border-subtle)]">
            <h3 className="text-sm font-bold text-[var(--text-secondary)] mb-4 uppercase tracking-wider">Average Score Trend</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={avgScoreData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                        <XAxis dataKey="date" fontSize={12} tickMargin={10} stroke="var(--text-muted)" />
                        <YAxis domain={[1, 5]} ticks={[1,2,3,4,5]} fontSize={12} stroke="var(--text-muted)" />
                        <Tooltip content={<CustomTooltip />} />
                        <Line 
                            type="linear" 
                            dataKey="avg" 
                            stroke="var(--primary)" 
                            strokeWidth={3} 
                            connectNulls={true} 
                            dot={{ stroke: 'var(--primary)', strokeWidth: 2, r: 4, fill: 'var(--background)' }}
                            name="Average Rating"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* 2. Impact Distribution */}
        <div className="bg-[var(--surface-card)] p-4 rounded-xl border border-[var(--border-subtle)]">
            <h3 className="text-sm font-bold text-[var(--text-secondary)] mb-4 uppercase tracking-wider">Impact Distribution</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={impactData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-subtle)" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={20} fontSize={12} stroke="var(--text-muted)" />
                        <Tooltip cursor={{fill: 'var(--surface-subtle)'}} content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="active" stackId="a" fill="var(--primary)" name="Active" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="graduated" stackId="a" fill="var(--secondary)" name="Graduated" radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* 3. Survival Curve */}
        <div className="bg-[var(--surface-card)] p-4 rounded-xl border border-[var(--border-subtle)]">
            <h3 className="text-sm font-bold text-[var(--text-secondary)] mb-4 uppercase tracking-wider">Retention / Survival</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={survivalData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                        <XAxis dataKey="name" fontSize={12} tickMargin={10} stroke="var(--text-muted)" />
                        <YAxis domain={[0, 100]} fontSize={12} stroke="var(--text-muted)" unit="%" />
                        <Tooltip content={<CustomTooltip />} />
                        <Line 
                            type="linear" 
                            dataKey="pct" 
                            stroke="var(--accent)" 
                            strokeWidth={3} 
                            dot={{ stroke: 'var(--accent)', strokeWidth: 2, r: 4, fill: 'var(--background)' }}
                            name="Still Active"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">Percentage of users who continue to engage after X time.</p>
        </div>

        {/* 4. Personal Journey (Optional) */}
        {personalData.length > 1 && (
            <div className="bg-[var(--surface-card)] p-4 rounded-xl border border-[var(--border-subtle)]">
                <h3 className="text-sm font-bold text-[var(--text-secondary)] mb-4 uppercase tracking-wider">Your Personal Journey</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={personalData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                            <XAxis dataKey="date" fontSize={12} tickMargin={10} stroke="var(--text-muted)" />
                            <YAxis domain={[1, 5]} ticks={[1,2,3,4,5]} fontSize={12} stroke="var(--text-muted)" />
                            <Tooltip content={<CustomTooltip />} />
                            <Line 
                                type="linear" 
                                dataKey="score" 
                                stroke="#10b981" 
                                strokeWidth={3} 
                                dot={{ stroke: '#10b981', strokeWidth: 2, r: 4, fill: 'var(--background)' }}
                                name="My Rating"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};
