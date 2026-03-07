'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Bot, Database, Folder, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/vault', label: 'Vault', icon: Database },
  { href: '/projects', label: 'Projects', icon: Folder },
  { href: '/ai', label: 'AI', icon: Bot },
  { href: '/activity', label: 'Activity', icon: Activity },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

export default function AppNav() {
  const pathname = usePathname();
  const authenticated =
    typeof window !== 'undefined' && Boolean(localStorage.getItem('n1hub_vault_token'));

  if (!authenticated) {
    return null;
  }

  return (
    <nav className="flex flex-wrap items-center gap-2">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex items-center gap-2 rounded border px-3 py-1.5 text-sm transition-colors ${
              isActive
                ? 'border-amber-500/60 bg-amber-900/20 text-amber-300'
                : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
