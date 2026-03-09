import crypto from 'crypto';
import { isoUtcNow } from './common';
import type { A2CCommandReport } from './types';

export interface ParliamentInput {
  kbRoot: string;
  question: string;
  claimA: string;
  claimB: string;
  dryRun?: boolean;
}

export interface ParliamentPayload {
  resolution_id: string;
  question: string;
  proposer_notes: string[];
  critic_notes: string[];
  synthesizer_notes: string[];
  verdict: 'unresolved' | 'contradiction' | 'refine_required' | 'compatible';
  confidence: number;
}

const hash = (value: string): string => crypto.createHash('sha1').update(value).digest('hex');

export const runParliament = async (input: ParliamentInput): Promise<ParliamentPayload> => {
  const lowerA = input.claimA.toLowerCase();
  const lowerB = input.claimB.toLowerCase();
  const overlap = lowerA.split(/\W+/).filter((value) => value.length > 3).filter((value) => lowerB.includes(value)).length;

  const verdict: ParliamentPayload['verdict'] = overlap > 5 ? (lowerA.includes('not ') ? 'contradiction' : 'compatible') : 'unresolved';
  const confidence = Math.min(0.98, 0.33 + overlap * 0.11);

  return {
    resolution_id: `${hash(`${input.question}|${input.claimA}|${input.claimB}`)}`,
    question: input.question,
    proposer_notes: [
      `Candidate claim A: ${input.claimA.slice(0, 80)}`,
      `Candidate claim B: ${input.claimB.slice(0, 80)}`,
    ],
    critic_notes: [
      overlap < 3 ? 'Evidence overlap below confidence threshold.' : 'Sufficient lexical overlap detected.',
    ],
    synthesizer_notes: [`Overlaps=${overlap}. Verdict=${verdict}`],
    verdict,
    confidence: Number(confidence.toFixed(3)),
  };
};

export const runEpistemicParliament = async (argv: string[]): Promise<A2CCommandReport> => {
  const question = argv[argv.indexOf('--question') + 1] || 'unknown question';
  const claimA = argv[argv.indexOf('--claim-a') + 1] || '';
  const claimB = argv[argv.indexOf('--claim-b') + 1] || '';
  const payload = await runParliament({ kbRoot: process.cwd(), question, claimA, claimB, dryRun: argv.includes('--dry-run') });

  return {
    skill_id: 'anything-to-capsules',
    module: 'PARLIAMENT',
    timestamp: isoUtcNow(),
    status: payload.verdict === 'unresolved' ? 'PARTIAL' : 'COMPLETE',
    scope: { question },
    metrics: { overlap_confidence: payload.confidence },
    results: payload as unknown as Record<string, unknown>,
    warnings: [],
    errors: [],
    metadata: {
      confidence: payload.confidence > 0.7 ? 'HIGH' : 'MEDIUM',
      human_review_required: payload.verdict === 'unresolved' || payload.verdict === 'contradiction',
      self_corrections: 0,
    },
  };
};
