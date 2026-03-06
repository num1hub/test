import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeCapsule } from '@/__tests__/fixtures/capsuleFactory'

async function setupDataDir() {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'n1hub-branch-manager-'))
  await fs.mkdir(path.join(dataDir, 'capsules'), { recursive: true })
  await fs.mkdir(path.join(dataDir, 'branches'), { recursive: true })
  process.env.DATA_DIR = dataDir
  vi.resetModules()
  return dataDir
}

describe('branch-manager', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('falls back to legacy dream files when canonical files are absent', async () => {
    const dataDir = await setupDataDir()
    const real = makeCapsule('capsule.test.legacy.v1')
    const dream = makeCapsule('capsule.test.legacy.v1', {
      neuro_concentrate: { summary: 'legacy dream summary' },
    })

    await fs.writeFile(path.join(dataDir, 'capsules', 'capsule.test.legacy.v1.json'), JSON.stringify(real, null, 2))
    await fs.writeFile(path.join(dataDir, 'capsules', 'capsule.test.legacy.v1.dream.json'), JSON.stringify(dream, null, 2))

    const branchManager = await import('@/lib/diff/branch-manager')
    const capsule = await branchManager.readOverlayCapsule('capsule.test.legacy.v1', 'dream')

    expect(capsule?.neuro_concentrate.summary).toBe('legacy dream summary')
  })

  it('prefers canonical @branch files over legacy dream files', async () => {
    const dataDir = await setupDataDir()
    const real = makeCapsule('capsule.test.priority.v1')
    const legacy = makeCapsule('capsule.test.priority.v1', {
      neuro_concentrate: { summary: 'legacy dream summary' },
    })
    const canonical = makeCapsule('capsule.test.priority.v1', {
      neuro_concentrate: { summary: 'canonical dream summary' },
    })

    await fs.writeFile(path.join(dataDir, 'capsules', 'capsule.test.priority.v1.json'), JSON.stringify(real, null, 2))
    await fs.writeFile(path.join(dataDir, 'capsules', 'capsule.test.priority.v1.dream.json'), JSON.stringify(legacy, null, 2))
    await fs.writeFile(path.join(dataDir, 'capsules', 'capsule.test.priority.v1@dream.json'), JSON.stringify(canonical, null, 2))

    const branchManager = await import('@/lib/diff/branch-manager')
    const capsule = await branchManager.readOverlayCapsule('capsule.test.priority.v1', 'dream')

    expect(capsule?.neuro_concentrate.summary).toBe('canonical dream summary')
  })
})
