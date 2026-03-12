'use client';

import { useEffect, useRef, useState } from 'react';
import SearchBar from '@/components/SearchBar';

type GraphSearchMatch = {
  capsuleId: string;
  title: string;
  subtitle?: string;
};

type WorkspaceGraphSearchPanelProps = {
  value: string;
  onChange: (value: string) => void;
  matches: GraphSearchMatch[];
  onSelectMatch: (capsuleId: string) => void;
  onHoverMatch?: (capsuleId: string) => void;
  onClearSearch?: () => void;
  className?: string;
};

export default function WorkspaceGraphSearchPanel({
  value,
  onChange,
  matches,
  onSelectMatch,
  onHoverMatch,
  onClearSearch,
  className = '',
}: WorkspaceGraphSearchPanelProps) {
  const hasQuery = value.trim().length > 0;
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const matchRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const onHoverMatchRef = useRef(onHoverMatch);
  const onClearSearchRef = useRef(onClearSearch);
  const suppressHoverUntilRef = useRef(0);

  useEffect(() => {
    onHoverMatchRef.current = onHoverMatch;
  }, [onHoverMatch]);

  useEffect(() => {
    onClearSearchRef.current = onClearSearch;
  }, [onClearSearch]);

  useEffect(() => {
    if (!hasQuery) {
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      setIsOpen(false);
      onClearSearchRef.current?.();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [hasQuery]);

  useEffect(() => {
    if (!hasQuery || matches.length === 0) {
      setActiveIndex(-1);
      return;
    }

    setIsOpen(true);
    setActiveIndex((currentIndex) => {
      if (currentIndex < matches.length) {
        return currentIndex;
      }
      return matches.length - 1;
    });
  }, [hasQuery, matches.length]);

  function focusMatchAtIndex(index: number) {
    if (index < 0 || index >= matches.length) {
      return;
    }

    setActiveIndex(index);
    onHoverMatchRef.current?.(matches[index].capsuleId);
    matchRefs.current[index]?.scrollIntoView({
      block: 'nearest',
    });
  }

  function suppressHoverFocus(windowMs = 220) {
    suppressHoverUntilRef.current = Date.now() + windowMs;
  }

  function handlePointerHover(index: number) {
    if (Date.now() < suppressHoverUntilRef.current) {
      return;
    }

    focusMatchAtIndex(index);
  }

  function commitSelection(index: number) {
    if (index < 0 || index >= matches.length) {
      return;
    }

    setActiveIndex(index);
    setIsOpen(false);
    onSelectMatch(matches[index].capsuleId);
  }

  function moveSelection(direction: 'next' | 'previous') {
    if (matches.length === 0) {
      return;
    }

    if (direction === 'next') {
      const nextIndex = activeIndex < 0 ? 0 : Math.min(activeIndex + 1, matches.length - 1);
      focusMatchAtIndex(nextIndex);
      return;
    }

    const nextIndex = activeIndex < 0 ? matches.length - 1 : Math.max(activeIndex - 1, 0);
    focusMatchAtIndex(nextIndex);
  }

  return (
    <div className={`relative ${className}`}>
      <SearchBar
        value={value}
        onChange={(nextValue) => {
          setIsOpen(true);
          onChange(nextValue);
        }}
        placeholder="Find nodes in graph..."
        onFocus={() => {
          if (hasQuery) {
            setIsOpen(true);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && hasQuery) {
            event.preventDefault();
            setIsOpen(false);
            onClearSearch?.();
            return;
          }

          if ((event.key === 'PageDown' || event.key === 'ArrowDown') && hasQuery) {
            event.preventDefault();
            moveSelection('next');
            return;
          }

          if ((event.key === 'PageUp' || event.key === 'ArrowUp') && hasQuery) {
            event.preventDefault();
            moveSelection('previous');
            return;
          }

          if (event.key === 'Enter' && activeIndex >= 0 && activeIndex < matches.length) {
            event.preventDefault();
            commitSelection(activeIndex);
          }
        }}
      />

      {hasQuery && isOpen ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/95 shadow-2xl backdrop-blur">
          {matches.length > 0 ? (
            <div
              className="max-h-72 overflow-y-auto p-2 pr-4 [scrollbar-gutter:stable] [scrollbar-width:auto] [scrollbar-color:#475569_#020617] [&::-webkit-scrollbar]:w-4 [&::-webkit-scrollbar-track]:bg-slate-950 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:border-[3px] [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-slate-950 hover:[&::-webkit-scrollbar-thumb]:bg-slate-600"
              onWheelCapture={() => suppressHoverFocus()}
              onScroll={() => suppressHoverFocus(120)}
            >
              {matches.map((match, index) => (
                <button
                  key={match.capsuleId}
                  ref={(node) => {
                    matchRefs.current[index] = node;
                  }}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => handlePointerHover(index)}
                  onFocus={() => focusMatchAtIndex(index)}
                  onClick={() => commitSelection(index)}
                  className={`mb-1 flex w-full flex-col rounded-xl px-3 py-2 text-left transition-colors last:mb-0 ${
                    index === activeIndex ? 'bg-slate-900' : 'hover:bg-slate-900'
                  }`}
                >
                  <span className="truncate text-sm font-medium text-slate-100">{match.title}</span>
                  {match.subtitle ? (
                    <span className="mt-0.5 line-clamp-2 text-xs text-slate-400">{match.subtitle}</span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-3 text-sm text-slate-400">No graph matches.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
