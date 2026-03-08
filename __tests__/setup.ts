import '@testing-library/jest-dom'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { setupServer } from 'msw/node'
import { HttpResponse, http } from 'msw'
import React from 'react'

// 1. Mock Next.js router
export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
}

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useParams: () => ({ id: 'test-capsule-id' }),
  usePathname: () => '/vault',
  useSearchParams: () => new URLSearchParams(),
}))

// 1b. Mock next/dynamic so canvas-heavy components are rendered deterministically in tests
vi.mock('next/dynamic', () => ({
  default: () =>
    () => React.createElement('div', { 'data-testid': 'mock-force-graph' }, 'ForceGraph Rendered'),
}))

// 2. Mock LocalStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value.toString() }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', { value: localStorageMock })
}

// 3. Mock ForceGraph (Canvas throws errors in JSDOM)
vi.mock('react-force-graph-2d', () => ({
  default: () =>
    React.createElement('div', { 'data-testid': 'mock-force-graph' }, 'ForceGraph Rendered'),
}))

// 4. Setup MSW Server for API mocking
export const handlers = [
  http.post('/api/auth', async ({ request }) => {
    const { password } = (await request.json()) as { password?: string }
    if (password === 'correct-pass') return HttpResponse.json({ token: 'mock-token' })
    return new HttpResponse(null, { status: 401 })
  }),
  http.get('/api/auth/chatgpt', () =>
    HttpResponse.json({
      enabled: true,
      available: false,
      state: 'missing',
      email: null,
      plan_type: null,
      subscription_active_until: null,
      reason: 'No local ChatGPT-backed Codex session was found.',
    }),
  ),
  http.post('/api/auth/chatgpt', () =>
    new HttpResponse(
      JSON.stringify({
        error: 'Local ChatGPT authentication is unavailable.',
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    ),
  ),
  http.get('/api/capsules', ({ request }) => {
    if (!request.headers.get('Authorization')) return new HttpResponse(null, { status: 401 })
    return HttpResponse.json([
      { metadata: { capsule_id: 'test-1', type: 'concept', status: 'sovereign' }, neuro_concentrate: { summary: 'Summary 1' } }
    ])
  }),
  http.get('/api/branches', ({ request }) => {
    if (!request.headers.get('Authorization')) return new HttpResponse(null, { status: 401 })
    return HttpResponse.json({
      branches: [
        { name: 'real', label: 'Real', isDefault: true, capsuleCount: 1 },
        { name: 'dream', label: 'Dream', isDefault: false, capsuleCount: 1 },
      ],
    })
  }),
  http.get('/api/capsules/test-capsule-id', ({ request }) => {
    if (!request.headers.get('Authorization')) return new HttpResponse(null, { status: 401 })
    return HttpResponse.json({
      metadata: { capsule_id: 'test-capsule-id', type: 'foundation' },
      neuro_concentrate: { summary: 'Detail summary' },
      integrity_sha3_512: 'abc123hash'
    })
  }),
  http.post('/api/validate', async ({ request }) => {
    if (!request.headers.get('Authorization')) return new HttpResponse(null, { status: 401 })
    const payload = (await request.json()) as { capsule?: unknown }
    return HttpResponse.json({
      valid: true,
      errors: [],
      warnings: [],
      capsule: payload.capsule ?? {},
      computedHash: 'a'.repeat(128),
    })
  }),
  http.post('/api/validate/fix', async ({ request }) => {
    if (!request.headers.get('Authorization')) return new HttpResponse(null, { status: 401 })
    const payload = (await request.json()) as { capsule?: unknown }
    return HttpResponse.json({
      valid: true,
      errors: [],
      warnings: [],
      fixedCapsule: payload.capsule ?? {},
      appliedFixes: ['G15: normalized confidence_vector array to object shape'],
    })
  }),
  http.get('/api/validate/stats', ({ request }) => {
    if (!request.headers.get('Authorization')) return new HttpResponse(null, { status: 401 })
    return HttpResponse.json({
      total: 5,
      passed: 4,
      failed: 1,
      warned: 2,
      passRate: 0.8,
      recent: [],
      trend: [{ date: '2026-03-05', passed: 4, failed: 1, warned: 2 }],
      gates: [{ gate: 'G07', count: 1 }],
    })
  })
]

export const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  vi.clearAllMocks()
  if (typeof window !== 'undefined') {
    window.localStorage.clear()
  }
})
afterAll(() => server.close())
