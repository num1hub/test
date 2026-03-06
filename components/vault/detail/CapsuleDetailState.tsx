'use client';

export function CapsuleDetailLoadingState() {
  return (
    <div className="animate-pulse p-8 text-center text-slate-400">
      Decrypting capsule payload...
    </div>
  );
}

export function CapsuleDetailErrorState({ error }: { error: string }) {
  return (
    <div className="p-8 text-center font-bold text-red-500">
      System Error: {error}
    </div>
  );
}

export function CapsuleDetailEmptyState() {
  return <div className="p-8 text-center text-slate-500">Empty void.</div>;
}
