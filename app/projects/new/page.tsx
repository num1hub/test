'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppNav from '@/components/AppNav';
import ProjectForm from '@/components/projects/ProjectForm';

export default function NewProjectPage() {
  const router = useRouter();
  const [parentId] = useState<string | undefined>(() => {
    if (typeof window === 'undefined') return undefined;
    const params = new URLSearchParams(window.location.search);
    return params.get('parent') ?? undefined;
  });

  useEffect(() => {
    const token = localStorage.getItem('n1hub_vault_token');
    if (!token) router.push('/login');
  }, [router]);

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
