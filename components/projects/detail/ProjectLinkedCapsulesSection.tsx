'use client';

import Link from 'next/link';
import { Layers } from 'lucide-react';
import type { SovereignCapsule } from '@/types/capsule';

interface ProjectLinkedCapsulesSectionProps {
  title: string;
  items: SovereignCapsule[];
  emptyText: string;
  icon?: 'layers';
  getHref: (capsule: SovereignCapsule) => string;
  getSubtitle: (capsule: SovereignCapsule) => string;
}

export default function ProjectLinkedCapsulesSection({
  title,
  items,
  emptyText,
  icon,
  getHref,
  getSubtitle,
}: ProjectLinkedCapsulesSectionProps) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-xl font-bold text-slate-100">
        {icon === 'layers' && <Layers className="h-5 w-5 text-amber-500" />}
        {title}
      </h2>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((capsule) => (
            <Link
              key={capsule.metadata.capsule_id}
              href={getHref(capsule)}
              className="rounded-xl border border-slate-800 bg-slate-900 p-4 transition-colors hover:border-amber-500"
            >
              <h3 className="font-bold text-slate-100">
                {capsule.metadata.name ?? capsule.metadata.capsule_id}
              </h3>
              <p className="mt-1 line-clamp-2 text-sm text-slate-400">{getSubtitle(capsule)}</p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-slate-500">{emptyText}</p>
      )}
    </section>
  );
}
