// @vitest-environment node
import { describe, it } from 'vitest';

describe('A2C future contracts', () => {
  it.todo(
    'TO-DO: queryVault should stay read-only unless transient synthesis is explicitly requested',
  );

  it.todo(
    'TO-DO: query CLI should expose an explicit synthesize-on-fly opt-in instead of relying on implicit defaults',
  );

  it.todo(
    'TO-DO: audit should verify index freshness against live vault geometry instead of schema-only checks',
  );

  it.todo(
    'TO-DO: cluster context should scan lib/a2c and dedicated A2C tests/docs instead of broad top-level heuristics',
  );

  it.todo(
    'TO-DO: ingest API should add rate-limit and quarantine-payload schema coverage around multi-candidate failures',
  );
});
