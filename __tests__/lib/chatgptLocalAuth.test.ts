import os from 'node:os'
import path from 'node:path'
import { promises as fs } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { getChatGptLocalAuthStatus } from '@/lib/chatgptLocalAuth'

const originalPath = process.env.N1HUB_CHATGPT_AUTH_JSON_PATH
const originalEnable = process.env.N1HUB_ENABLE_CHATGPT_LOCAL_AUTH

function makeJwt(payload: Record<string, unknown>) {
  const encode = (value: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(value))
      .toString('base64url')
      .replace(/=/g, '')
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.signature`
}

afterEach(async () => {
  if (originalPath === undefined) {
    delete process.env.N1HUB_CHATGPT_AUTH_JSON_PATH
  } else {
    process.env.N1HUB_CHATGPT_AUTH_JSON_PATH = originalPath
  }

  if (originalEnable === undefined) {
    delete process.env.N1HUB_ENABLE_CHATGPT_LOCAL_AUTH
  } else {
    process.env.N1HUB_ENABLE_CHATGPT_LOCAL_AUTH = originalEnable
  }
})

describe('chatgptLocalAuth', () => {
  it('reports available when a local ChatGPT Codex session is active', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'n1hub-chatgpt-auth-'))
    const authPath = path.join(tmpDir, 'auth.json')
    const exp = Math.floor(Date.now() / 1000) + 3600

    await fs.writeFile(
      authPath,
      JSON.stringify({
        auth_mode: 'chatgpt',
        tokens: {
          id_token: makeJwt({
            exp,
            email: 'architect@example.com',
            'https://api.openai.com/auth': {
              chatgpt_plan_type: 'plus',
              chatgpt_subscription_active_until: '2026-04-01T00:00:00Z',
            },
          }),
          access_token: makeJwt({
            exp,
          }),
        },
      }),
      'utf8',
    )

    process.env.N1HUB_CHATGPT_AUTH_JSON_PATH = authPath
    process.env.N1HUB_ENABLE_CHATGPT_LOCAL_AUTH = 'true'

    const status = await getChatGptLocalAuthStatus()
    expect(status.enabled).toBe(true)
    expect(status.available).toBe(true)
    expect(status.email).toBe('architect@example.com')
    expect(status.plan_type).toBe('plus')
  })

  it('reports unavailable when the local session is missing', async () => {
    process.env.N1HUB_CHATGPT_AUTH_JSON_PATH = path.join(os.tmpdir(), 'missing-auth.json')
    process.env.N1HUB_ENABLE_CHATGPT_LOCAL_AUTH = 'true'

    const status = await getChatGptLocalAuthStatus()
    expect(status.enabled).toBe(true)
    expect(status.available).toBe(false)
    expect(status.reason).toMatch(/Run codex and sign in with ChatGPT/i)
  })
})
