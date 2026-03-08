import os from 'node:os'
import path from 'node:path'
import { promises as fs } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { GET, POST } from '@/app/api/auth/chatgpt/route'

const originalPath = process.env.N1HUB_CHATGPT_AUTH_JSON_PATH
const originalEnable = process.env.N1HUB_ENABLE_CHATGPT_LOCAL_AUTH
const originalToken = process.env.N1HUB_AUTH_TOKEN

function makeJwt(payload: Record<string, unknown>) {
  const encode = (value: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(value))
      .toString('base64url')
      .replace(/=/g, '')
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.signature`
}

afterEach(() => {
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

  if (originalToken === undefined) {
    delete process.env.N1HUB_AUTH_TOKEN
  } else {
    process.env.N1HUB_AUTH_TOKEN = originalToken
  }
})

describe('/api/auth/chatgpt', () => {
  it('returns unavailable status when local auth is disabled', async () => {
    process.env.N1HUB_ENABLE_CHATGPT_LOCAL_AUTH = 'false'

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.available).toBe(false)
    expect(data.enabled).toBe(false)
  })

  it('returns vault token when a valid local ChatGPT session exists', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'n1hub-chatgpt-route-'))
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
            },
          }),
          access_token: makeJwt({ exp }),
        },
      }),
      'utf8',
    )

    process.env.N1HUB_CHATGPT_AUTH_JSON_PATH = authPath
    process.env.N1HUB_ENABLE_CHATGPT_LOCAL_AUTH = 'true'
    process.env.N1HUB_AUTH_TOKEN = 'chatgpt-auth-token'

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.token).toBe('chatgpt-auth-token')
    expect(data.provider).toBe('chatgpt_local_codex')
  })
})
