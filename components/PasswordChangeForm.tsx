'use client';

import React, { useState } from 'react';
import { useToast } from '@/contexts/ToastContext';

function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 1 1 8 0v4" />
    </svg>
  );
}

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M17 21v-8H7v8" />
      <path d="M7 3v5h8" />
    </svg>
  );
}

export default function PasswordChangeForm() {
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      showToast('New password must be at least 8 characters.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('n1hub_vault_token');
      const res = await fetch('/api/user/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) throw new Error(data.error || 'Failed to update password');

      showToast('Password updated successfully.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update password';
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-4 flex items-center text-slate-100 dark:text-slate-100">
        <LockIcon className="mr-2 h-5 w-5 text-amber-500" />
        <h3 className="text-lg font-bold">Update Master Password</h3>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-500 dark:text-slate-400">
          Current Password
        </label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full rounded border border-slate-300 bg-slate-100 px-4 py-2 text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-500 dark:text-slate-400">
          New Password
        </label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full rounded border border-slate-300 bg-slate-100 px-4 py-2 text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-500 dark:text-slate-400">
          Confirm New Password
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded border border-slate-300 bg-slate-100 px-4 py-2 text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          required
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
        className="flex w-full items-center justify-center rounded bg-amber-600 px-4 py-2.5 font-bold text-white transition-colors hover:bg-amber-500 disabled:opacity-50"
      >
        {isLoading ? (
          'Updating...'
        ) : (
          <>
            <SaveIcon className="mr-2 h-4 w-4" /> Save New Password
          </>
        )}
      </button>
    </form>
  );
}
