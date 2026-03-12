'use client';

import { useEffect, useRef, useState } from 'react';
import { ZIP_ARCHIVE_THRESHOLD } from '@/lib/vault/exportCapsules';

type WorkspaceSelectionBarProps = {
  selectedCount: number;
  visibleCount: number;
  allVisibleSelected: boolean;
  onSelectAllVisible: () => void;
  onClearSelection: () => void;
  onExportBundle: () => void;
  onExportSeparateFiles: () => void;
};

export default function WorkspaceSelectionBar({
  selectedCount,
  visibleCount,
  allVisibleSelected,
  onSelectAllVisible,
  onClearSelection,
  onExportBundle,
  onExportSeparateFiles,
}: WorkspaceSelectionBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selectionLabel = `${selectedCount} capsule${selectedCount === 1 ? '' : 's'} selected`;
  const exportAsArchive = selectedCount >= ZIP_ARCHIVE_THRESHOLD;

  useEffect(() => {
    if (selectedCount <= 1) {
      setMenuOpen(false);
    }
  }, [selectedCount]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [menuOpen]);

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm text-amber-100">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="font-medium">{selectionLabel}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSelectAllVisible}
            disabled={allVisibleSelected || visibleCount === 0}
            className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
          >
            {allVisibleSelected ? 'All visible selected' : 'Select all visible'}
          </button>

          <button
            type="button"
            onClick={onClearSelection}
            className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:text-white"
          >
            Clear
          </button>

          {selectedCount === 1 ? (
            <button
              type="button"
              onClick={onExportBundle}
              className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-200 transition-colors hover:border-amber-400/40 hover:bg-amber-500/15 hover:text-amber-100"
            >
              Export
            </button>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((current) => !current)}
                className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-200 transition-colors hover:border-amber-400/40 hover:bg-amber-500/15 hover:text-amber-100"
              >
                Export
              </button>

              {menuOpen ? (
                <div className="absolute right-0 top-[calc(100%+0.5rem)] z-20 min-w-[220px] rounded-2xl border border-slate-800 bg-slate-950/95 p-2 shadow-2xl backdrop-blur">
                  <button
                    type="button"
                    onClick={() => {
                      onExportBundle();
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-start rounded-xl px-3 py-2 text-left transition-colors hover:bg-slate-900"
                  >
                    <span>
                      <span className="block text-sm font-medium text-slate-100">One file</span>
                      <span className="mt-0.5 block text-xs text-slate-400">
                        Download the selected capsules as one JSON bundle.
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onExportSeparateFiles();
                      setMenuOpen(false);
                    }}
                    className="mt-1 flex w-full items-start rounded-xl px-3 py-2 text-left transition-colors hover:bg-slate-900"
                  >
                    <span>
                      <span className="block text-sm font-medium text-slate-100">
                        {exportAsArchive ? 'ZIP archive' : 'Separate files'}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-400">
                        {exportAsArchive
                          ? 'Download each selected capsule as its own JSON file inside one ZIP archive.'
                          : 'Download each selected capsule as its own JSON file.'}
                      </span>
                    </span>
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
