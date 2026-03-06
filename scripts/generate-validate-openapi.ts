#!/usr/bin/env tsx
import fs from 'fs/promises';
import path from 'path';

const openapi = {
  openapi: '3.1.0',
  info: {
    title: 'N1Hub Capsule Validation API',
    version: '1.0.0',
    description: 'OpenAPI reference for /api/validate endpoints.',
  },
  paths: {
    '/api/validate': {
      post: {
        summary: 'Validate one capsule',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  capsule: { type: 'object' },
                  options: { $ref: '#/components/schemas/ValidatorOptions' },
                  autoFix: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Validation result',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationResult' },
              },
            },
          },
        },
      },
    },
    '/api/validate/batch': {
      post: {
        summary: 'Validate many capsules',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  capsules: { type: 'array', items: { type: 'object' } },
                  options: { $ref: '#/components/schemas/ValidatorOptions' },
                },
                required: ['capsules'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Batch validation result' },
        },
      },
    },
    '/api/validate/fix': {
      post: {
        summary: 'Auto-fix one capsule and return fixed payload',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  capsule: { type: 'object' },
                  policy: {
                    type: 'object',
                    additionalProperties: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Fixed payload with validation result',
          },
        },
      },
    },
    '/api/validate/stats': {
      get: {
        summary: 'Validation run statistics',
        responses: {
          '200': { description: 'Validation stats payload' },
        },
      },
    },
    '/api/validate/gates': {
      get: {
        summary: 'Metadata for gates G01-G16',
        responses: {
          '200': { description: 'Gate metadata payload' },
        },
      },
    },
  },
  components: {
    schemas: {
      ValidatorOptions: {
        type: 'object',
        properties: {
          skipG16: { type: 'boolean' },
          customTokenLimit: { type: 'number' },
          allowRefutes: { type: 'boolean' },
          existingIds: { type: 'array', items: { type: 'string' } },
        },
      },
      ValidationIssue: {
        type: 'object',
        properties: {
          gate: { type: 'string' },
          path: { type: 'string' },
          message: { type: 'string' },
        },
        required: ['gate', 'path', 'message'],
      },
      ValidationResult: {
        type: 'object',
        properties: {
          valid: { type: 'boolean' },
          errors: {
            type: 'array',
            items: { $ref: '#/components/schemas/ValidationIssue' },
          },
          warnings: {
            type: 'array',
            items: { $ref: '#/components/schemas/ValidationIssue' },
          },
          computedHash: { type: 'string' },
        },
        required: ['valid', 'errors', 'warnings'],
      },
    },
  },
};

async function main() {
  const outputPath = path.join(process.cwd(), 'docs/openapi/validate.openapi.json');
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(openapi, null, 2)}\n`, 'utf-8');
  process.stdout.write(`Generated ${outputPath}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Failed to generate OpenAPI document';
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
