import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'fs/promises'
import { getRecentActivity, logActivity } from '@/lib/activity'

vi.mock('fs/promises', () => {
  const access = vi.fn()
  const mkdir = vi.fn()
  const appendFile = vi.fn()
  const readFile = vi.fn()
  return {
    default: { access, mkdir, appendFile, readFile },
    access,
    mkdir,
    appendFile,
    readFile,
  }
})

describe('lib/activity.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('logActivity', () => {
    it('appends formatted JSON-line to the log file', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined)

      await logActivity('create', { capsule_id: 'test.v1' })

      expect(fs.appendFile).toHaveBeenCalledTimes(1)

      const [filePath, content] = vi.mocked(fs.appendFile).mock.calls[0]
      expect(filePath).toMatch(/data[/\\]activity\.log$/)

      const parsedEntry = JSON.parse(content as string) as Record<string, unknown>
      expect(parsedEntry.action).toBe('create')
      expect((parsedEntry.details as Record<string, unknown>).capsule_id).toBe('test.v1')
      expect(parsedEntry.timestamp).toBeDefined()
      expect(content).toMatch(/\n$/)
    })

    it('creates the directory if it does not exist', async () => {
      vi.mocked(fs.access).mockRejectedValue({ code: 'ENOENT' })

      await logActivity('login')

      expect(fs.mkdir).toHaveBeenCalledTimes(1)
      expect(fs.appendFile).toHaveBeenCalledTimes(1)
    })
  })

  describe('getRecentActivity', () => {
    it('reads, parses, reverses lines, and obeys limit', async () => {
      const mockFileContent = `
{"id":"1","timestamp":"2026-01-01T12:00:00Z","action":"login"}
{"id":"2","timestamp":"2026-01-01T12:01:00Z","action":"create"}
{"id":"3","timestamp":"2026-01-01T12:02:00Z","action":"logout"}
      `.trim()

      vi.mocked(fs.readFile).mockResolvedValue(mockFileContent as never)

      const activities = await getRecentActivity(2)

      expect(activities).toHaveLength(2)
      expect(activities[0].action).toBe('logout')
      expect(activities[1].action).toBe('create')
    })

    it('returns empty array when file does not exist', async () => {
      vi.mocked(fs.readFile).mockRejectedValue({ code: 'ENOENT' })

      const activities = await getRecentActivity()
      expect(activities).toEqual([])
    })

    it('ignores invalid lines gracefully', async () => {
      const mockContent = `
{"id":"1","timestamp":"2026-01-01T12:00:00Z","action":"login"}
invalid-json-string
{"id":"2","timestamp":"2026-01-01T12:02:00Z","action":"logout"}
      `.trim()

      vi.mocked(fs.readFile).mockResolvedValue(mockContent as never)

      const activities = await getRecentActivity()
      expect(activities).toHaveLength(2)
      expect(activities[0].action).toBe('logout')
      expect(activities[1].action).toBe('login')
    })
  })
})
