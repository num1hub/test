'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ChatGptAuthStatusCard from '@/components/ChatGptAuthStatusCard';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // In a real app, you'd send this to an API endpoint to verify against VAULT_PASSWORD
      // For this minimal client-side mock, we'll hit a special API endpoint we'll create
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('n1hub_vault_token', data.token); // Store simple token
        router.push('/vault');
      } else {
        setError('Access Denied. Incorrect clearance code.');
      }
    } catch {
      setError('System error during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <form onSubmit={handleLogin} className="w-full max-w-sm bg-slate-900 p-8 rounded-xl border border-slate-800 shadow-2xl">
        <h2 className="text-2xl font-bold mb-6 text-slate-100">Architect Login</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500/50 text-red-200 rounded text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Clearance Code</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-4 py-2 text-slate-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              placeholder="••••••••"
              required
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Unlock Vault'}
          </button>
        </div>

        <div className="mt-6 border-t border-slate-800 pt-5">
          <ChatGptAuthStatusCard
            onAuthenticated={(token) => {
              setError('');
              localStorage.setItem('n1hub_vault_token', token);
              router.push('/vault');
            }}
          />
        </div>
      </form>
    </main>
  );
}
