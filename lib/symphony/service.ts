import { loadWorkflowRuntime, validateDispatchConfig } from './config';
import { SymphonyHttpServer } from './httpServer';
import { StructuredLogger } from './logger';
import { SymphonyOrchestrator } from './orchestrator';
import type { Logger } from './types';
import { startWorkflowWatcher } from './workflow';

export class SymphonyService {
  private readonly logger: Logger;
  private orchestrator: SymphonyOrchestrator | null = null;
  private watcher: { close(): Promise<void> } | null = null;
  private httpServer: SymphonyHttpServer | null = null;

  constructor(
    private readonly options: {
      workflowPath?: string;
      port?: number | null;
      logger?: Logger;
    } = {},
  ) {
    this.logger = options.logger ?? new StructuredLogger();
  }

  async start(): Promise<void> {
    const runtime = await loadWorkflowRuntime(this.options.workflowPath);
    const errors = validateDispatchConfig(runtime);
    if (errors.length > 0) {
      throw new Error(errors.map((entry) => `${entry.code}: ${entry.message}`).join('; '));
    }

    this.orchestrator = new SymphonyOrchestrator(runtime, this.logger);
    await this.orchestrator.start();

    this.watcher = startWorkflowWatcher({
      workflowPath: runtime.config.workflow_path,
      logger: this.logger,
      onReload: async () => {
        const nextRuntime = await loadWorkflowRuntime(this.options.workflowPath);
        const reloadErrors = validateDispatchConfig(nextRuntime);
        if (reloadErrors.length > 0) {
          reloadErrors.forEach((error) =>
            this.logger.error('workflow_reload_invalid', {
              code: error.code,
              error_message: error.message,
            }),
          );
          return;
        }
        this.orchestrator?.applyRuntime(nextRuntime);
        this.logger.info('workflow_reloaded', {
          workflow_path: nextRuntime.config.workflow_path,
        });
      },
      onError: (error) => {
        this.logger.error('workflow_watch_failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      },
    });

    const requestedPort = this.options.port ?? runtime.config.server.port;
    if (requestedPort !== null && requestedPort !== undefined && Number.isFinite(requestedPort)) {
      this.httpServer = new SymphonyHttpServer(this.orchestrator, this.logger);
      await this.httpServer.start(requestedPort);
    }
  }

  async stop(): Promise<void> {
    await this.watcher?.close().catch(() => undefined);
    this.watcher = null;
    await this.httpServer?.stop().catch(() => undefined);
    this.httpServer = null;
    await this.orchestrator?.stop().catch(() => undefined);
    this.orchestrator = null;
  }
}
