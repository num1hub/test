// @anchor flow:symphony.prompt-render links=arch:symphony.runtime,doc:workflow.issue-worker,doc:workflow.ninfinity-night-shift note="Prompt rendering flow for Symphony issue and N-Infinity worker sessions."
import { Liquid } from 'liquidjs';
import type { Issue } from './types';

const engine = new Liquid({
  strictVariables: true,
  strictFilters: true,
});

const DEFAULT_PROMPT = 'You are working on an issue from Linear.';

export async function renderIssuePrompt(options: {
  template: string;
  issue: Issue;
  attempt: number | null;
}): Promise<string> {
  const source = options.template.trim() || DEFAULT_PROMPT;

  try {
    return await engine.parseAndRender(source, {
      issue: options.issue,
      attempt: options.attempt,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Template render error';
    const wrapped = new Error(message) as Error & { code: string };
    wrapped.code = message.includes('token') ? 'template_parse_error' : 'template_render_error';
    throw wrapped;
  }
}

export function buildContinuationPrompt(issue: Issue, turnNumber: number, maxTurns: number): string {
  return [
    `Continue working on issue ${issue.identifier}.`,
    'Do not repeat the original task prompt; it is already in the thread history.',
    `This is continuation turn ${turnNumber} of ${maxTurns}.`,
    'Prefer finishing or moving the issue to the workflow-defined handoff state if appropriate.',
  ].join(' ');
}
