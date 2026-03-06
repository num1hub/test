'use client';

import Link from 'next/link';
import { Download, Settings, Upload } from 'lucide-react';
import AppNav from '@/components/AppNav';

interface VaultTopActionsProps {
  onOpenImport: () => void;
  onExport: () => void;
}

const actionClassName =
  'flex items-center rounded border border-slate-300 bg-slate-200 px-3 py-1.5 text-sm text-slate-800 transition-colors hover:bg-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700';

export default function VaultTopActions({
  onOpenImport,
  onExport,
}: VaultTopActionsProps) {
  return (
    <div className="absolute right-4 top-4 z-20 flex flex-col items-end gap-3">
      <AppNav />
      <div className="flex space-x-3">
        <Link href="/vault/validation" className={actionClassName}>
          Validation
        </Link>
        <button type="button" onClick={onOpenImport} className={actionClassName}>
          <Upload className="mr-2 h-4 w-4" />
          Import
        </button>
        <button type="button" onClick={onExport} className={actionClassName}>
          <Download className="mr-2 h-4 w-4" />
          Export All
        </button>
        <Link href="/settings" title="System Preferences" className={actionClassName}>
          <Settings className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
