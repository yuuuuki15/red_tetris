/* @vitest-environment node */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'

describe('databaseService', () => {
  let svc
  let tmpdir

  beforeEach(async () => {
    vi.resetModules()
    // Use a temporary working directory so the DB file is isolated per test run
    tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'red-tetris-db-'))
    vi.spyOn(process, 'cwd').mockReturnValue(tmpdir)
    svc = await import('./databaseService.js')
    await svc.initializeDatabase()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('initializeDatabase creates DB file and table', async () => {
    const dbPath = path.join(tmpdir, 'leaderboard.db')
    expect(fs.existsSync(dbPath)).toBe(true)
  })

  test('addScore persists and getLeaderboard orders by weightedScore', async () => {
    await svc.addScore({ name: 'Alice', score: 100, difficulty: 'normal' }) // 100
    await svc.addScore({ name: 'Bob', score: 80, difficulty: 'hardcore' })  // 160
    await svc.addScore({ name: 'Carol', score: 90, difficulty: 'fast' })    // 135
    await svc.addScore({ name: 'Zero', score: 0, difficulty: 'normal' })    // ignored

    const rows = await svc.getLeaderboard(10)
    expect(rows.length).toBe(3)
    expect(rows[0].name).toBe('Bob')    // 160
    expect(rows[1].name).toBe('Carol')  // 135
    expect(rows[2].name).toBe('Alice')  // 100
  })

  test('getLeaderboard applies limit', async () => {
    await svc.addScore({ name: 'A', score: 10, difficulty: 'normal' })
    await svc.addScore({ name: 'B', score: 20, difficulty: 'normal' })
    const rows = await svc.getLeaderboard(1)
    expect(rows.length).toBe(1)
  })
})

describe('databaseService without initialization', () => {
  test('addScore/getLeaderboard are safe before init', async () => {
    vi.resetModules()
    const svc = await import('./databaseService.js')
    // Should not throw even if not initialized
    await svc.addScore({ name: 'X', score: 50, difficulty: 'normal' })
    const rows = await svc.getLeaderboard(5)
    expect(rows).toEqual([])
  })
})


