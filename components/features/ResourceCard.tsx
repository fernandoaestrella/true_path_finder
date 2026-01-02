import React from 'react';

interface ResourceCardProps {
  title: string;
  url: string;
}

export function ResourceCard({ title, url }: ResourceCardProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-4 bg-[var(--surface-subtle)] rounded-[var(--radius-interactive)] hover:bg-[var(--surface-muted)] transition-colors shadow-sm hover:shadow-md cursor-pointer decoration-0 group"
    >
      <div className="flex items-center gap-3">
        <span className="text-xl text-[var(--text-muted)] group-hover:scale-110 transition-transform">→</span>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-[var(--text-primary)] truncate">
            {title || 'Resource'}
          </h4>
          <p className="text-sm text-[var(--text-muted)] truncate">
            {url}
          </p>
        </div>
        <span className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
          ↗
        </span>
      </div>
    </a>
  );
}
