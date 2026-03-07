import http, { type IncomingMessage, type ServerResponse } from 'http';
import { URL } from 'url';
import type { Logger } from './types';
import { SymphonyOrchestrator } from './orchestrator';

function writeJson(
  response: ServerResponse,
  statusCode: number,
  body: unknown,
): void {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(body));
}

function writeHtml(response: ServerResponse, html: string): void {
  response.statusCode = 200;
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.end(html);
}

function methodNotAllowed(response: ServerResponse): void {
  writeJson(response, 405, {
    error: {
      code: 'method_not_allowed',
      message: 'Method not allowed',
    },
  });
}

export class SymphonyHttpServer {
  private server: http.Server | null = null;

  constructor(
    private readonly orchestrator: SymphonyOrchestrator,
    private readonly logger: Logger,
  ) {}

  async start(port: number): Promise<number> {
    this.server = http.createServer((request, response) => {
      void this.handleRequest(request, response);
    });

    await new Promise<void>((resolve, reject) => {
      this.server?.once('error', reject);
      this.server?.listen(port, '127.0.0.1', () => resolve());
    });

    const address = this.server.address();
    const actualPort = typeof address === 'object' && address ? address.port : port;
    this.logger.info('http_server_started', {
      port: actualPort,
    });
    return actualPort;
  }

  async stop(): Promise<void> {
    if (!this.server) return;
    await new Promise<void>((resolve, reject) => {
      this.server?.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    this.server = null;
  }

  private async handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const method = request.method ?? 'GET';
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');

    if (url.pathname === '/') {
      if (method !== 'GET') {
        methodNotAllowed(response);
        return;
      }

      const snapshot = this.orchestrator.getSnapshot();
      writeHtml(
        response,
        `<!doctype html><html><head><meta charset="utf-8"><title>Symphony</title></head><body><pre>${escapeHtml(
          JSON.stringify(snapshot, null, 2),
        )}</pre></body></html>`,
      );
      return;
    }

    if (url.pathname === '/api/v1/state') {
      if (method !== 'GET') {
        methodNotAllowed(response);
        return;
      }
      writeJson(response, 200, this.orchestrator.getSnapshot());
      return;
    }

    if (url.pathname === '/api/v1/refresh') {
      if (method !== 'POST') {
        methodNotAllowed(response);
        return;
      }
      writeJson(response, 202, this.orchestrator.requestRefresh());
      return;
    }

    if (url.pathname.startsWith('/api/v1/')) {
      if (method !== 'GET') {
        methodNotAllowed(response);
        return;
      }
      const identifier = decodeURIComponent(url.pathname.slice('/api/v1/'.length));
      const details = this.orchestrator.getIssueDetails(identifier);
      if (!details) {
        writeJson(response, 404, {
          error: {
            code: 'issue_not_found',
            message: `Issue ${identifier} is not present in runtime state`,
          },
        });
        return;
      }
      writeJson(response, 200, details);
      return;
    }

    writeJson(response, 404, {
      error: {
        code: 'not_found',
        message: 'Route not found',
      },
    });
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
