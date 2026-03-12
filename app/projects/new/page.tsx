'use client';

import { useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import ProjectForm from '@/components/projects/ProjectForm';

export default function NewProjectPage() {
  const [parentId] = useState<string | undefined>(() => {
    if (typeof window === 'undefined') return undefined;
    const params = new URLSearchParams(window.location.search);
    return params.get('parent') ?? undefined;
  });

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/projects" className="text-sm text-slate-400 hover:text-amber-500">
            ← Back to Projects
          </Link>
          <AppNav />
        </div>

        <ProjectForm initialParentId={parentId} />
      </div>
    </div>
  );
}
