import type { ValidationIssue } from '../../../lib/validator/types';

export interface CliOptions {
  inputPath?: string;
  dir?: string;
  fix: boolean;
  watch: boolean;
  strict: boolean;
  skipG16: boolean;
  idsFile?: string;
  output?: string;
  report: boolean;
  format: 'json' | 'pretty' | 'html';
  verbose: boolean;
  remote?: string;
}

export interface FileValidationResult {
  file: string;
  capsuleId: string | null;
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  computedHash?: string;
  fixed: boolean;
}

export interface ValidationSummary {
  total: number;
  passed: number;
  failed: number;
  warnings: number;
  strictFailures: number;
}
