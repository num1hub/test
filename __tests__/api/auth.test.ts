import fs from 'fs/promises'
import path from 'path'
import { POST } from '@/app/api/auth/route'

describe('POST /api/auth', () => {
  const originalEnv = process.env
  const passwordFilePath = path.join(process.cwd(), 'data', 'password.txt')

  beforeEach(async () => {
    vi.resetModules()
    process.env = { ...originalEnv, VAULT_PASSWORD: 'secret-vault-pass' }
    await fs.rm(passwordFilePath, { force: true })
  })

  afterEach(async () => {
    await fs.rm(passwordFilePath, { force: true })
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('returns token for correct password', async () => {
    const req = new Request('http://localhost/api/auth', {
      method: 'POST',
      body: JSON.stringify({ password: 'secret-vault-pass' })
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    
    const data = await res.json()
    expect(data.token).toBe('n1-authorized-architect-token-777')
  })

  it('returns 401 for incorrect password', async () => {
    const req = new Request('http://localhost/api/auth', {
      method: 'POST',
      body: JSON.stringify({ password: 'wrong' })
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})
