import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'fs/promises'
import { getPasswordHash, setPasswordHash, verifyPassword } from '@/lib/password'

vi.mock('fs/promises', () => {
  const access = vi.fn()
  const mkdir = vi.fn()
  const readFile = vi.fn()
  const writeFile = vi.fn()
  return {
    default: { access, mkdir, readFile, writeFile },
    access,
    mkdir,
    readFile,
    writeFile,
  }
})

describe('lib/password.ts', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv, VAULT_PASSWORD: 'env-secret' }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('getPasswordHash', () => {
    it('returns the hash if file exists', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('existing-hash\n' as never)

      const hash = await getPasswordHash()
      expect(hash).toBe('existing-hash')
      expect(fs.readFile).toHaveBeenCalledTimes(1)
    })

    it('creates a new scrypt hash file when file is missing', async () => {
      vi.mocked(fs.readFile).mockRejectedValue({ code: 'ENOENT' })
      vi.mocked(fs.access).mockResolvedValue(undefined)

      const hash = await getPasswordHash()

      expect(hash.startsWith('scrypt$')).toBe(true)
      expect(fs.writeFile).toHaveBeenCalledTimes(1)
      const [filePath, content] = vi.mocked(fs.writeFile).mock.calls[0]
      expect(filePath).toMatch(/data[/\\]password\.txt$/)
      expect(typeof content).toBe('string')
      expect((content as string).startsWith('scrypt$')).toBe(true)
    })
  })

  describe('setPasswordHash', () => {
    it('hashes password and writes it to file', async () => {
      await setPasswordHash('new-user-pass')

      expect(fs.writeFile).toHaveBeenCalledTimes(1)
      const [, content] = vi.mocked(fs.writeFile).mock.calls[0]
      expect((content as string).startsWith('scrypt$')).toBe(true)
    })
  })

  describe('verifyPassword', () => {
    it('validates password against generated hash', async () => {
      vi.mocked(fs.readFile).mockRejectedValue({ code: 'ENOENT' })
      vi.mocked(fs.access).mockResolvedValue(undefined)
      const hash = await getPasswordHash()

      await expect(verifyPassword('env-secret', hash)).resolves.toBe(true)
      await expect(verifyPassword('wrong-pass', hash)).resolves.toBe(false)
    })
  })
})
