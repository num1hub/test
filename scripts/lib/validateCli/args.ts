import type { CliOptions } from './types';

export function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    fix: false,
    watch: false,
    strict: false,
    skipG16: false,
    report: false,
    format: 'pretty',
    verbose: false,
  };

  const positional: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--dir') {
      options.dir = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--fix') {
      options.fix = true;
      continue;
    }
    if (arg === '--watch') {
      options.watch = true;
      continue;
    }
    if (arg === '--strict') {
      options.strict = true;
      continue;
    }
    if (arg === '--skip-g16') {
      options.skipG16 = true;
      continue;
    }
    if (arg === '--ids-file') {
      options.idsFile = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--output') {
      options.output = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--report') {
      options.report = true;
      continue;
    }
    if (arg === '--format') {
      const next = argv[index + 1] as CliOptions['format'] | undefined;
      if (next === 'json' || next === 'pretty' || next === 'html') {
        options.format = next;
      }
      index += 1;
      continue;
    }
    if (arg === '-v' || arg === '--verbose') {
      options.verbose = true;
      continue;
    }
    if (arg === '--remote') {
      options.remote = argv[index + 1];
      index += 1;
      continue;
    }

    positional.push(arg);
  }

  options.inputPath = positional[0];
  return options;
}

export function getUsageText(): string {
  return `
Usage: n1-validate <file|dir> [options]

Options:
  --dir <path>        Validate all .json files in a directory
  --fix               Apply auto-fixes and overwrite files
  --watch             Watch input for changes and revalidate
  --strict            Treat warnings as errors
  --skip-g16          Skip integrity hash check
  --ids-file <path>   JSON file containing known capsule IDs
  --output <path>     Write results to file
  --report            Generate Markdown report in reports/
  --format <type>     pretty | json | html
  -v, --verbose       Show warning/error details
  --remote <url>      Delegate validation to API endpoint
`;
}

export function printUsage(): void {
  process.stdout.write(getUsageText());
}
