import type { FocusEventHandler, KeyboardEventHandler } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  onFocus?: FocusEventHandler<HTMLInputElement>;
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search capsules...',
  className = '',
  onKeyDown,
  onFocus,
}: SearchBarProps) {
  return (
    <div className={`relative flex items-center ${className}`}>
      <SearchIcon className="absolute left-3 h-5 w-5 text-slate-500" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2.5 pl-10 pr-10 text-slate-200 shadow-sm transition-colors focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 text-slate-500 transition-colors hover:text-slate-300"
          aria-label="Clear search"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
