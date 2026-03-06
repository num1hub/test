import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
      <div className="max-w-md space-y-6">
        <h1 className="text-4xl font-bold tracking-wider">
          <span className="text-amber-500">N1</span>Hub Vault
        </h1>
        <p className="text-slate-400 text-lg">
          Private sovereign storage. Access strictly restricted to authorized architects.
        </p>
        <Link 
          href="/login" 
          className="inline-block mt-8 px-8 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500 text-slate-200 rounded-lg transition-all"
        >
          Initialize Boot Sequence
        </Link>
      </div>
    </main>
  );
}
