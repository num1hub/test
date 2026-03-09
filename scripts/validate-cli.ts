#!/usr/bin/env tsx
// @anchor script:validator.cli links=interface:validator.public-api,arch:validator.engine,doc:validator.reference,doc:n1hub.tools note="CLI entrypoint for Capsule Validator checks in N1Hub."
import chalk from 'chalk';
import process from 'process';
import { parseArgs } from './lib/validateCli/args';
import { runOnce, runWatch } from './lib/validateCli/runner';

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.watch) {
    await runWatch(options);
    return;
  }

  const { exitCode } = await runOnce(options);
  process.exitCode = exitCode;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unexpected CLI error';
  process.stderr.write(`${chalk.red(message)}\n`);
  process.exit(1);
});
