'use client';

import React from 'react';
import { Header } from '@/components/layout/Header';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] pb-20">
      <Header currentPage="other" />
      
      <main className="container max-w-2xl mx-auto px-4 pt-12 text-center space-y-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">About True Path Finder</h1>
        
        <div className="bg-[var(--surface-card)] p-8 rounded-[var(--radius-container)] shadow-sm">
          <p className="text-lg text-[var(--text-secondary)] leading-relaxed">
            Thanks for trying! Send feedback to <a href="mailto:fernando.a.estrella@gmail.com" className="text-[var(--primary)] hover:underline">fernando.a.estrella@gmail.com</a>
          </p>
        </div>
      </main>
    </div>
  );
}
