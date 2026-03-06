import { describe, expect, it } from 'vitest';
import { getUsageText, parseArgs } from '@/scripts/lib/validateCli/args';
import { resultsToMarkdown, summarize } from '@/scripts/lib/validateCli/output';
import type { FileValidationResult } from '@/scripts/lib/validateCli/types';

const sampleResults: FileValidationResult[] = [
  {
    file: 'data/capsules/a.json',
    capsuleId: 'capsule.a.v1',
    valid: true,
    errors: [],
    warnings: [],
    fixed: false,
  },
  {
    file: 'data/capsules/b.json',
    capsuleId: 'capsule.b.v1',
    valid: false,
    errors: [{ gate: 'G12', path: '$.recursive_layer.links[0].target_id', message: 'Missing target' }],
    warnings: [{ gate: 'G05', path: '$.core_payload.content_type', message: 'Non-standard content type' }],
    fixed: true,
  },
];

describe('validate CLI helpers', () => {
  it('parses common CLI arguments', () => {
    const options = parseArgs([
      '--dir',
      'data/capsules',
      '--fix',
      '--strict',
      '--format',
      'json',
      '--output',
      'report.json',
    ]);

    expect(options.dir).toBe('data/capsules');
    expect(options.fix).toBe(true);
    expect(options.strict).toBe(true);
    expect(options.format).toBe('json');
    expect(options.output).toBe('report.json');
  });

  it('summarizes result counts including strict warning failures', () => {
    const summary = summarize(sampleResults, true);

    expect(summary.total).toBe(2);
    expect(summary.passed).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.warnings).toBe(1);
    expect(summary.strictFailures).toBe(1);
  });

  it('renders markdown report content with table and issues', () => {
    const markdown = resultsToMarkdown(sampleResults);

    expect(markdown).toContain('# Capsule Validation Report');
    expect(markdown).toContain('| PASS | data/capsules/a.json | capsule.a.v1 | 0 | 0 |');
    expect(markdown).toContain('| FAIL | data/capsules/b.json | capsule.b.v1 | 1 | 1 |');
    expect(markdown).toContain('## data/capsules/b.json');
    expect(markdown).toContain('G12 $.recursive_layer.links[0].target_id: Missing target');
  });

  it('exposes usage text with supported flags', () => {
    const usage = getUsageText();

    expect(usage).toContain('Usage: n1-validate <file|dir> [options]');
    expect(usage).toContain('--watch');
    expect(usage).toContain('--remote <url>');
  });
});
