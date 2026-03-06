import Link from 'next/link';
import { SovereignCapsule } from '@/types/capsule';
import ValidationBadge from '@/components/validation/ValidationBadge';
import { useCapsuleStore } from '@/store/capsuleStore';

export default function CapsuleCard({ capsule }: { capsule: SovereignCapsule }) {
  const { metadata, neuro_concentrate } = capsule;
  const validationStatus = useCapsuleStore((state) => state.validationStatus[metadata.capsule_id]);
  
  // Color coding based on type
  const typeColors: Record<string, string> = {
    foundation: 'text-amber-400 border-amber-900/50 bg-amber-900/10',
    concept: 'text-blue-400 border-blue-900/50 bg-blue-900/10',
    operations: 'text-emerald-400 border-emerald-900/50 bg-emerald-900/10',
    physical_object: 'text-orange-400 border-orange-900/50 bg-orange-900/10',
    project: 'text-violet-400 border-violet-900/50 bg-violet-900/10',
  };
  
  const badgeClass = (metadata.type && typeColors[metadata.type]) || 'text-slate-400 border-slate-700 bg-slate-800';

  return (
    <Link href={`/vault/capsule/${metadata.capsule_id}`} className="group block h-full">
      <div className="h-full bg-slate-900 border border-slate-800 hover:border-amber-600/50 p-5 rounded-xl shadow-sm hover:shadow-lg hover:shadow-amber-900/10 transition-all flex flex-col">
        
        <div className="flex justify-between items-start mb-3">
          <span className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded border ${badgeClass}`}>
            {metadata.type}
          </span>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest">
            {metadata.status}
          </span>
        </div>
        
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="font-bold text-slate-200 text-lg leading-tight break-words group-hover:text-amber-500 transition-colors">
            {metadata.capsule_id}
          </h3>
          {validationStatus && (
            <ValidationBadge
              valid={validationStatus.valid}
              warnings={validationStatus.warnings}
              errors={validationStatus.errors}
            />
          )}
        </div>
        
        <p className="text-sm text-slate-400 line-clamp-3 mb-4 flex-grow">
          {neuro_concentrate?.summary || 'No summary available.'}
        </p>
        
        <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-800/50">
          <div className="text-xs text-slate-500 font-mono">
            {metadata.semantic_hash?.substring(0, 16)}...
          </div>
          <div className="text-xs text-slate-600">
            {metadata.subtype}
          </div>
        </div>
      </div>
    </Link>
  );
}
