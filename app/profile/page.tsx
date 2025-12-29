'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { fetchAllUserData, generateJsonExport, generateMarkdownExport, downloadFile } from '@/lib/utils/exportUtils';

export default function ProfilePage() {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'json' | 'markdown') => {
    if (!user) return;
    setIsExporting(true);
    try {
      const data = await fetchAllUserData(user.uid, user.email);
      const filename = `true_path_finder_data_${new Date().toISOString().split('T')[0]}`;
      
      if (format === 'json') {
        const content = generateJsonExport(data);
        downloadFile(content, `${filename}.json`, 'application/json');
      } else {
        const content = generateMarkdownExport(data);
        downloadFile(content, `${filename}.md`, 'text/markdown');
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20">
      <Header currentPage="other" />
      
      <main className="container max-w-2xl mx-auto px-4 pt-8 space-y-8">
        <section>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Profile</h1>
          <p className="text-[var(--text-secondary)]">Manage your account and data.</p>
        </section>

        {/* User Info */}
        <section className="bg-[var(--surface-card)] p-6 rounded-[var(--radius-container)] border border-[var(--border-subtle)]">
          <h2 className="text-xl font-semibold mb-4 text-[var(--text-primary)]">Account</h2>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[var(--primary-light)] flex items-center justify-center text-[var(--primary)] font-bold text-xl">
              {user?.email?.[0].toUpperCase() || '?'}
            </div>
            <div>
              <p className="font-medium text-[var(--text-primary)]">{user?.email}</p>
              <p className="text-sm text-[var(--text-secondary)]">Member since {user?.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'Unknown'}</p>
            </div>
          </div>
        </section>

        {/* Data Export */}
        <section className="bg-[var(--surface-card)] p-6 rounded-[var(--radius-container)] border border-[var(--border-subtle)]">
          <h2 className="text-xl font-semibold mb-2 text-[var(--text-primary)]">Your Data</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            Download a copy of all your goals, chosen methods, reviews, and events.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => handleExport('json')}
              disabled={isExporting}
              className="px-4 py-2 rounded-[var(--radius-interactive)] bg-[var(--surface-subtle)] text-[var(--text-primary)] hover:bg-[var(--primary-light)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-[var(--border-subtle)] flex items-center justify-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {isExporting ? 'Preparing...' : 'Export as JSON'}
            </button>
            <button
              onClick={() => handleExport('markdown')}
              disabled={isExporting}
              className="px-4 py-2 rounded-[var(--radius-interactive)] bg-[var(--surface-subtle)] text-[var(--text-primary)] hover:bg-[var(--primary-light)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-[var(--border-subtle)] flex items-center justify-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              {isExporting ? 'Preparing...' : 'Export as Markdown'}
            </button>
          </div>
        </section>

        {/* Placeholders for Future Features */}
        <section className="opacity-60 grayscale hover:grayscale-0 transition-all duration-300">
          <div className="bg-[var(--surface-muted)] p-6 rounded-[var(--radius-container)] border border-[var(--border-subtle)] border-dashed mb-4">
             <div className="flex items-center justify-between mb-2">
               <h2 className="text-xl font-semibold text-[var(--text-secondary)]">Manage Groups</h2>
               <span className="text-xs font-medium px-2 py-1 bg-[var(--surface-subtle)] rounded-full text-[var(--text-muted)]">Coming Soon</span>
             </div>
             <p className="text-sm text-[var(--text-muted)]">Create and manage private groups for shared goals.</p>
          </div>
          
          <div className="bg-[var(--surface-muted)] p-6 rounded-[var(--radius-container)] border border-[var(--border-subtle)] border-dashed">
             <div className="flex items-center justify-between mb-2">
               <h2 className="text-xl font-semibold text-[var(--text-secondary)]">Tested Methods Archive</h2>
               <span className="text-xs font-medium px-2 py-1 bg-[var(--surface-subtle)] rounded-full text-[var(--text-muted)]">Coming Soon</span>
             </div>
             <p className="text-sm text-[var(--text-muted)]">View methods you've completed or archived.</p>
          </div>
        </section>

      </main>
    </div>
  );
}
