import fs from 'fs/promises'
import path from 'path'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/auth/route'
import { getSessionFromToken } from '@/lib/apiSecurity'

describe('POST /api/auth', () => {
  const originalEnv = process.env
  const passwordFilePath = path.join(process.cwd(), 'data', 'password.txt')
  const accessCodePath = path.join(process.cwd(), 'data', 'private', 'auth', 'access-code.txt')
  const sameOriginHeaders = {
    Origin: 'http://localhost',
  }

  beforeEach(async () => {
    vi.resetModules()
    process.env = {
      ...originalEnv,
      VAULT_PASSWORD: 'secret-vault-pass',
      N1HUB_OWNER_LOGIN: 'egor-n1',
      N1HUB_ACCESS_CODE: 'n1x1',
      N1HUB_OWNER_ROUTE_SEGMENT: 'egor-n1-vault-7q4x',
    }
    await fs.rm(passwordFilePath, { force: true })
    await fs.rm(accessCodePath, { force: true })
  })

  afterEach(async () => {
    await fs.rm(passwordFilePath, { force: true })
    await fs.rm(accessCodePath, { force: true })
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('returns token for correct password', async () => {
    const req = new Request('http://localhost/api/auth', {
      method: 'POST',
      headers: sameOriginHeaders,
      body: JSON.stringify({
        login: 'egor-n1',
        password: 'secret-vault-pass',
        accessCode: 'n1x1',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    
    const data = await res.json()
    expect(typeof data.token).toBe('string')
    expect(getSessionFromToken(data.token)).toEqual(
      expect.objectContaining({
        sub: 'egor-n1',
        role: 'owner',
        factors: ['password', 'access_code'],
      }),
    )
  })

  it('returns 401 for incorrect password', async () => {
    const req = new Request('http://localhost/api/auth', {
      method: 'POST',
      headers: sameOriginHeaders,
      body: JSON.stringify({
        login: 'egor-n1',
        password: 'wrong',
        accessCode: 'n1x1',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('fails closed with 503 when production deploy auth env is incomplete', async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      N1HUB_OWNER_LOGIN: 'egor-n1',
      N1HUB_OWNER_ROUTE_SEGMENT: 'egor-n1-vault-7q4x',
    }

    const req = new Request('http://localhost/api/auth', {
      method: 'POST',
      headers: sameOriginHeaders,
      body: JSON.stringify({
        login: 'egor-n1',
        password: 'secret-vault-pass',
        accessCode: 'n1x1',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(503)

    const data = await res.json()
    expect(data.error).toMatch(/Deployment auth is not configured/i)
  })

  it('rejects login attempts from untrusted origins', async () => {
    const req = new Request('http://localhost/api/auth', {
      method: 'POST',
      headers: {
        Origin: 'https://evil.example',
      },
      body: JSON.stringify({
        login: 'egor-n1',
        password: 'secret-vault-pass',
        accessCode: 'n1x1',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'Forbidden: untrusted mutation origin.' })
  })
})
