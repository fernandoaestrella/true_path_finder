'use client';

import React, { useId } from 'react';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';

interface InfoTooltipProps {
  content: string | React.ReactNode;
  className?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export function InfoTooltip({ content, className = '', placement = 'top' }: InfoTooltipProps) {
  const tooltipId = useId();

  return (
    <span className={`inline-block ml-1 align-middle ${className}`}>
      <button
        data-tooltip-id={tooltipId}
        type="button"
        className="w-5 h-5 rounded-full border border-[var(--text-muted)] text-[var(--text-muted)] text-[10px] font-serif italic flex items-center justify-center cursor-help hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-1"
        aria-label="More information"
        onClick={(e) => e.preventDefault()} // meaningful for links/forms
      >
        i
      </button>
      
      <Tooltip 
        id={tooltipId}
        place={placement}
        className="z-50 !max-w-xs !bg-[var(--surface-emphasis)] !text-[var(--text-primary)] !border !border-[var(--border-subtle)] !shadow-xl !rounded-[var(--radius-interactive)] !opacity-100 !p-3 text-sm font-normal normal-case text-left"
        style={{ backgroundColor: 'var(--surface-emphasis)', color: 'var(--text-primary)' }} // inline style backup
        clickable
      >
        {content}
      </Tooltip>
    </span>
  );
}
