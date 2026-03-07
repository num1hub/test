import fs from 'fs/promises';
import path from 'path';
import chokidar from 'chokidar';
import { parse as parseYaml } from 'yaml';
import type { Logger, ValidationError, WorkflowDefinition, WorkflowWatcher } from './types';

function workflowError(code: string, message: string): Error & { code: string } {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  return error;
}

export function resolveWorkflowPath(inputPath?: string): string {
  if (inputPath?.trim()) {
    return path.resolve(inputPath.trim());
  }
  return path.resolve(process.cwd(), 'WORKFLOW.md');
}

export function parseWorkflowContent(content: string): WorkflowDefinition {
  if (!content.startsWith('---')) {
    return {
      config: {},
      prompt_template: content.trim(),
    };
  }

  const lines = content.split(/\r?\n/);
  if (lines[0].trim() !== '---') {
    return {
      config: {},
      prompt_template: content.trim(),
    };
  }

  let closingIndex = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === '---') {
      closingIndex = index;
      break;
    }
  }

  if (closingIndex === -1) {
    throw workflowError('workflow_parse_error', 'Unterminated YAML front matter');
  }

  const yamlSource = lines.slice(1, closingIndex).join('\n');
  const body = lines.slice(closingIndex + 1).join('\n').trim();
  let parsed: unknown;

  try {
    parsed = yamlSource.trim() ? parseYaml(yamlSource) : {};
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invalid YAML front matter';
    throw workflowError('workflow_parse_error', message);
  }

  if (parsed === null) {
    parsed = {};
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw workflowError(
      'workflow_front_matter_not_a_map',
      'YAML front matter must decode to an object',
    );
  }

  return {
    config: parsed as Record<string, unknown>,
    prompt_template: body,
  };
}

export async function loadWorkflowDefinition(inputPath?: string): Promise<WorkflowDefinition> {
  const workflowPath = resolveWorkflowPath(inputPath);
  let content: string;

  try {
    content = await fs.readFile(workflowPath, 'utf-8');
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw workflowError('missing_workflow_file', `Workflow file not found: ${workflowPath}`);
    }
    throw error;
  }

  return parseWorkflowContent(content);
}

export function startWorkflowWatcher(options: {
  workflowPath: string;
  logger: Logger;
  onReload: () => Promise<void>;
  onError: (error: unknown) => void;
}): WorkflowWatcher {
  const watcher = chokidar.watch(options.workflowPath, {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 150,
      pollInterval: 50,
    },
  });

  let timer: NodeJS.Timeout | null = null;
  const queueReload = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      options.onReload().catch((error) => {
        options.logger.error('workflow_reload_failed', {
          workflow_path: options.workflowPath,
          error: error instanceof Error ? error.message : String(error),
        });
        options.onError(error);
      });
    }, 100);
  };

  watcher.on('add', queueReload);
  watcher.on('change', queueReload);
  watcher.on('error', (error) => options.onError(error));

  return {
    async close() {
      if (timer) clearTimeout(timer);
      await watcher.close();
    },
  };
}

export function errorToValidation(error: unknown): ValidationError {
  const maybe = error as { code?: string; message?: string };
  return {
    code: maybe.code ?? 'workflow_parse_error',
    message: maybe.message ?? 'Workflow error',
  };
}
