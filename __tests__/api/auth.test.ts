import fs from 'fs/promises'
import path from 'path'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/auth/route'
import { getSessionFromToken } from '@/lib/apiSecurity'

describe('POST /api/auth', () => {
  const originalEnv = process.env
  const passwordFilePath = path.join(process.cwd(), 'data', 'password.txt')
  const accessCodePath = path.join(process.cwd(), 'data', 'private', 'auth', 'access-code.txt')

  beforeEach(async () => {
    vi.resetModules()
    process.env = {
      ...originalEnv,
      VAULT_PASSWORD: 'secret-vault-pass',
      N1HUB_OWNER_LOGIN: 'egor-n1',
      N1HUB_ACCESS_CODE: 'n1x1',
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
      body: JSON.stringify({
        login: 'egor-n1',
        password: 'wrong',
        accessCode: 'n1x1',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})
