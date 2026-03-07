import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import type { Issue, Logger, SymphonyConfig, WorkspaceInfo } from './types';
import { ensureAbsolutePath, sanitizeWorkspaceKey } from './utils';

interface HookResult {
  ok: boolean;
  output: string;
  timedOut: boolean;
}

interface HookContext {
  issue?: Partial<Pick<Issue, 'id' | 'identifier' | 'title' | 'state' | 'branch_name'>>;
}

export class WorkspaceManager {
  constructor(
    private readonly config: SymphonyConfig,
    private readonly logger: Logger,
  ) {}

  getWorkspacePath(identifier: string): string {
    const workspaceKey = sanitizeWorkspaceKey(identifier);
    const candidate = path.join(this.config.workspace.root, workspaceKey);
    return ensureAbsolutePath(this.config.workspace.root, candidate);
  }

  async createForIssue(identifier: string): Promise<WorkspaceInfo> {
    const workspace_key = sanitizeWorkspaceKey(identifier);
    const workspacePath = this.getWorkspacePath(identifier);
    await fs.mkdir(this.config.workspace.root, { recursive: true });

    let created_now = false;

    try {
      const stats = await fs.stat(workspacePath);
      if (!stats.isDirectory()) {
        throw new Error(`workspace_path_not_directory path=${workspacePath}`);
      }
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
      await fs.mkdir(workspacePath, { recursive: true });
      created_now = true;
    }

    await this.cleanupTransientArtifacts(workspacePath);

    if (created_now && this.config.hooks.after_create) {
      const result = await this.runHook(this.config.hooks.after_create, workspacePath, 'after_create', {
        issue: {
          identifier,
        },
      });
      if (!result.ok) {
        await fs.rm(workspacePath, { recursive: true, force: true }).catch(() => undefined);
        throw new Error(`after_create_hook_failed timed_out=${result.timedOut}`);
      }
    }

    return {
      path: workspacePath,
      workspace_key,
      created_now,
    };
  }

  async runBeforeRun(
    workspacePath: string,
    issue?: Partial<Pick<Issue, 'id' | 'identifier' | 'title' | 'state' | 'branch_name'>>,
  ): Promise<void> {
    await this.cleanupTransientArtifacts(workspacePath);
    if (!this.config.hooks.before_run) return;

    const result = await this.runHook(this.config.hooks.before_run, workspacePath, 'before_run', {
      issue,
    });
    if (!result.ok) {
      throw new Error(`before_run_hook_failed timed_out=${result.timedOut}`);
    }
  }

  async runAfterRun(
    workspacePath: string,
    issue?: Partial<Pick<Issue, 'id' | 'identifier' | 'title' | 'state' | 'branch_name'>>,
  ): Promise<void> {
    if (!this.config.hooks.after_run) return;
    const result = await this.runHook(this.config.hooks.after_run, workspacePath, 'after_run', {
      issue,
    });
    if (!result.ok) {
      this.logger.warn('workspace_hook_failed', {
        hook: 'after_run',
        workspace_path: workspacePath,
        timed_out: result.timedOut,
      });
    }
  }

  async removeWorkspace(
    identifier: string,
    issue?: Partial<Pick<Issue, 'id' | 'identifier' | 'title' | 'state' | 'branch_name'>>,
  ): Promise<void> {
    const workspacePath = this.getWorkspacePath(identifier);

    try {
      const stats = await fs.stat(workspacePath);
      if (!stats.isDirectory()) return;
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }

    if (this.config.hooks.before_remove) {
      const result = await this.runHook(this.config.hooks.before_remove, workspacePath, 'before_remove', {
        issue,
      });
      if (!result.ok) {
        this.logger.warn('workspace_hook_failed', {
          hook: 'before_remove',
          workspace_path: workspacePath,
          timed_out: result.timedOut,
        });
      }
    }

    await fs.rm(workspacePath, { recursive: true, force: true });
  }

  async cleanupTransientArtifacts(workspacePath: string): Promise<void> {
    const artifacts = ['tmp', '.elixir_ls'];
    await Promise.all(
      artifacts.map(async (entry) => {
        const target = path.join(workspacePath, entry);
        await fs.rm(target, { recursive: true, force: true }).catch(() => undefined);
      }),
    );
  }

  private async runHook(
    script: string,
    cwd: string,
    hookName: string,
    context: HookContext = {},
  ): Promise<HookResult> {
    this.logger.info('workspace_hook_started', {
      hook: hookName,
      workspace_path: cwd,
    });

    const workflowDir = path.dirname(this.config.workflow_path);
    const hookEnv: NodeJS.ProcessEnv = {
      ...process.env,
      SYMPHONY_WORKFLOW_PATH: this.config.workflow_path,
      SYMPHONY_WORKFLOW_DIR: workflowDir,
      SYMPHONY_PROJECT_ROOT: workflowDir,
      SYMPHONY_WORKSPACE_ROOT: this.config.workspace.root,
      SYMPHONY_WORKSPACE_PATH: cwd,
    };

    if (context.issue?.id) hookEnv.SYMPHONY_ISSUE_ID = context.issue.id;
    if (context.issue?.identifier) hookEnv.SYMPHONY_ISSUE_IDENTIFIER = context.issue.identifier;
    if (context.issue?.title) hookEnv.SYMPHONY_ISSUE_TITLE = context.issue.title;
    if (context.issue?.state) hookEnv.SYMPHONY_ISSUE_STATE = context.issue.state;
    if (context.issue?.branch_name) hookEnv.SYMPHONY_ISSUE_BRANCH_NAME = context.issue.branch_name;

    return new Promise<HookResult>((resolve, reject) => {
      const child = spawn('sh', ['-lc', script], {
        cwd,
        env: hookEnv,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let output = '';
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
      }, this.config.hooks.timeout_ms);

      child.stdout.on('data', (chunk) => {
        output += String(chunk);
      });
      child.stderr.on('data', (chunk) => {
        output += String(chunk);
      });
      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.on('close', (code, signal) => {
        clearTimeout(timeout);
        const ok = !timedOut && code === 0;
        if (!ok) {
          this.logger.warn('workspace_hook_completed', {
            hook: hookName,
            workspace_path: cwd,
            completed: false,
            exit_code: code,
            signal,
            timed_out: timedOut,
            output: output.slice(0, 2000),
          });
        }
        resolve({
          ok,
          output,
          timedOut,
        });
      });
    });
  }
}
