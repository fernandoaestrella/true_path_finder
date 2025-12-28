import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({
  label,
  error,
  hint,
  id,
  className = '',
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-[var(--text-primary)]"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`input ${error ? 'bg-red-50 ring-2 ring-red-100' : ''} ${className}`}
        {...props}
      />
      {hint && !error && (
        <p className="text-sm text-[var(--text-muted)]">{hint}</p>
      )}
      {error && (
        <p className="text-sm text-[var(--error)]">{error}</p>
      )}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({
  label,
  error,
  hint,
  id,
  className = '',
  ...props
}: TextareaProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-[var(--text-primary)]"
        >
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={`input min-h-[120px] resize-none ${error ? 'bg-red-50 ring-2 ring-red-100' : ''} ${className}`}
        {...props}
      />
      {hint && !error && (
        <p className="text-sm text-[var(--text-muted)]">{hint}</p>
      )}
      {error && (
        <p className="text-sm text-[var(--error)]">{error}</p>
      )}
    </div>
  );
}
