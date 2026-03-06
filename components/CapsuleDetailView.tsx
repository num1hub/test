import Link from 'next/link';
import { SovereignCapsule } from '@/types/capsule';
import ProgressBar from '@/components/ui/ProgressBar';

export default function CapsuleDetailView({ capsule }: { capsule: SovereignCapsule }) {
  const { metadata, core_payload, neuro_concentrate, recursive_layer, integrity_sha3_512 } = capsule;

  const typeColors: Record<string, string> = {
    foundation: 'border-amber-900 bg-amber-900/20 text-amber-400',
    concept: 'border-blue-900 bg-blue-900/20 text-blue-400',
    operations: 'border-emerald-900 bg-emerald-900/20 text-emerald-400',
    physical_object: 'border-orange-900 bg-orange-900/20 text-orange-400',
    project: 'border-violet-900 bg-violet-900/20 text-violet-400',
  };
  const typeBadgeClass =
    (metadata.type && typeColors[metadata.type]) || 'border-slate-700 bg-slate-800 text-slate-400';

  const getConfidence = (key: string, index: number) => {
    const vector = neuro_concentrate.confidence_vector;
    if (Array.isArray(vector)) {
      const value = vector[index];
      return typeof value === 'number' ? value : 0;
    }
    if (vector && typeof vector === 'object') {
      const candidate = vector[key];
      return typeof candidate === 'number' ? candidate : 0;
    }
    return 0;
  };

  const createdAtLabel = metadata.created_at
    ? new Date(metadata.created_at).toLocaleString()
    : 'Unknown';
  const payloadType = typeof core_payload.content_type === 'string' ? core_payload.content_type : 'unknown';
  const payloadContent = typeof core_payload.content === 'string' ? core_payload.content : '';

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
        <div className="mb-4 flex flex-wrap gap-2">
          <span className={`rounded border px-2 py-1 font-mono text-xs ${typeBadgeClass}`}>
            TYPE: {metadata.type || 'unknown'}
          </span>
          <span className="rounded border border-slate-700 bg-slate-800 px-2 py-1 font-mono text-xs text-slate-300">
            STATUS: {metadata.status || 'unknown'}
          </span>
          <span className="rounded border border-slate-700 bg-slate-800 px-2 py-1 font-mono text-xs text-slate-300">
            SUBTYPE: {metadata.subtype || 'unknown'}
          </span>
          <span className="ml-auto rounded border border-slate-700 bg-slate-800 px-2 py-1 font-mono text-xs text-slate-400">
            v{metadata.version ?? '-'}
          </span>
        </div>

        <h1 className="mb-2 break-all text-2xl font-bold text-slate-100 md:text-3xl">
          {typeof metadata.name === 'string' && metadata.name.length > 0
            ? metadata.name
            : metadata.capsule_id}
        </h1>
        {typeof metadata.name === 'string' && metadata.name.length > 0 && (
          <p className="mb-2 font-mono text-sm text-slate-500">{metadata.capsule_id}</p>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 rounded-lg border border-slate-800/50 bg-slate-950/50 p-4 text-sm text-slate-400 md:grid-cols-2">
          <div>
            <span className="mr-2 text-slate-500">Author:</span>
            {typeof metadata.author === 'string' ? metadata.author : 'Unknown'}
          </div>
          <div>
            <span className="mr-2 text-slate-500">Created:</span>
            {createdAtLabel}
          </div>
          <div className="col-span-1 flex items-start md:col-span-2">
            <span className="mr-2 mt-0.5 text-slate-500">Hash:</span>
            <span className="break-all rounded bg-slate-800 px-2 py-0.5 font-mono text-xs text-slate-300">
              {typeof metadata.semantic_hash === 'string' ? metadata.semantic_hash : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-bold text-slate-100">Neuro Concentrate</h2>
            <p className="mb-6 text-sm leading-relaxed text-slate-300">
              {typeof neuro_concentrate.summary === 'string'
                ? neuro_concentrate.summary
                : 'No summary available.'}
            </p>

            <div className="mb-6">
              <h3 className="mb-3 text-xs font-bold uppercase text-slate-500">6D Confidence Vector</h3>
              <ProgressBar label="Extraction" value={getConfidence('extraction', 0)} />
              <ProgressBar label="Synthesis" value={getConfidence('synthesis', 1)} />
              <ProgressBar label="Linking" value={getConfidence('linking', 2)} />
              <ProgressBar label="Provenance" value={getConfidence('provenance_coverage', 3)} />
              <ProgressBar label="Validation" value={getConfidence('validation_score', 4)} />
              <ProgressBar
                label="Contradiction Pressure"
                value={getConfidence('contradiction_pressure', 5)}
                colorClass="bg-red-500"
              />
            </div>

            <div>
              <h3 className="mb-2 text-xs font-bold uppercase text-slate-500">Keywords</h3>
              <div className="flex flex-wrap gap-1.5">
                {neuro_concentrate.keywords?.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300"
                  >
                    {keyword}
                  </span>
                ))}
                {!neuro_concentrate.keywords?.length && (
                  <span className="text-xs italic text-slate-500">No keywords available.</span>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-bold text-slate-100">Recursive Layer</h2>
            {recursive_layer.links && recursive_layer.links.length > 0 ? (
              <ul className="space-y-3">
                {recursive_layer.links.map((link, idx) => (
                  <li key={`${link.target_id}-${idx}`} className="rounded border border-slate-800 bg-slate-950 p-3 text-sm">
                    <div className="mb-1 font-mono text-xs text-emerald-400">-&gt; {link.relation_type || 'link'}</div>
                    <Link
                      href={`/vault/capsule/${link.target_id}`}
                      className="break-all text-slate-300 transition-colors hover:text-amber-400"
                    >
                      {link.target_id}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm italic text-slate-500">No outbound links detected.</p>
            )}
          </div>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="h-fit rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-100">Core Payload</h2>
              <span className="text-xs font-mono uppercase tracking-widest text-slate-500">
                {payloadType}
              </span>
            </div>
            <div className="prose prose-invert max-w-none max-h-[500px] overflow-y-auto rounded-lg border border-slate-800/50 bg-slate-950 p-5 text-sm text-slate-300">
              <pre className="whitespace-pre-wrap font-sans text-sm">{payloadContent}</pre>
            </div>
          </div>

          <details className="group overflow-hidden rounded-xl border border-slate-800 bg-[#0d1117] shadow-xl">
            <summary className="flex cursor-pointer items-center justify-between bg-slate-900 px-6 py-4 focus:outline-none">
              <span className="font-bold text-slate-200 transition-colors group-open:text-amber-500">
                View Raw JSON / Integrity Seal
              </span>
              <span className="text-sm text-slate-500 transition-transform group-open:rotate-180">v</span>
            </summary>
            <div className="border-t border-slate-800 p-0">
              <div className="flex flex-col gap-2 border-b border-slate-800 bg-slate-950 px-6 py-3 md:flex-row md:items-center md:justify-between">
                <span className="text-xs font-mono text-slate-500">SHA3-512 Seal:</span>
                <span className="break-all font-mono text-xs text-green-500">{integrity_sha3_512}</span>
              </div>
              <div className="overflow-x-auto p-6">
                <pre className="font-mono text-xs text-slate-300">
                  <code
                    dangerouslySetInnerHTML={{
                      __html: JSON.stringify(capsule, null, 2).replace(
                        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
                        (match) => {
                          let cls = 'text-blue-400';
                          if (/^"/.test(match)) {
                            cls = /:$/.test(match) ? 'text-amber-400' : 'text-emerald-400';
                          } else if (/true|false/.test(match)) {
                            cls = 'text-purple-400';
                          } else if (/null/.test(match)) {
                            cls = 'text-slate-500';
                          }
                          return `<span class="${cls}">${match}</span>`;
                        },
                      ),
                    }}
                  />
                </pre>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
