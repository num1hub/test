import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'fs/promises'
import { matchesAuthorizedLogin, verifyAccessCode } from '@/lib/authFactors'

vi.mock('fs/promises', () => {
  const mkdir = vi.fn()
  const readFile = vi.fn()
  const writeFile = vi.fn()
  return {
    default: { mkdir, readFile, writeFile },
    mkdir,
    readFile,
    writeFile,
  }
})

describe('lib/authFactors.ts', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      N1HUB_OWNER_LOGIN: 'egor-n1',
      N1HUB_ACCESS_CODE: 'n1x1',
    }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('accepts only the configured owner login alias', () => {
    expect(matchesAuthorizedLogin('egor-n1')).toBe(true)
    expect(matchesAuthorizedLogin('EGOR-N1')).toBe(true)
    expect(matchesAuthorizedLogin('architect')).toBe(false)
  })

  it('verifies the access code from env-backed production auth without touching the filesystem', async () => {
    await expect(verifyAccessCode('n1x1')).resolves.toBe(true)
    await expect(verifyAccessCode('nope')).resolves.toBe(false)
    expect(fs.readFile).not.toHaveBeenCalled()
    expect(fs.writeFile).not.toHaveBeenCalled()
  })
})
