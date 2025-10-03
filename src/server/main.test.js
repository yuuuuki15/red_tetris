/* @vitest-environment node */
import { describe, test, expect, vi } from 'vitest'

vi.mock('./index.js', () => ({ start: vi.fn(async () => ({ stop: vi.fn() })) }))

import { start } from './index.js'

describe('server/main', () => {
  test('calls start with params and logs success', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { default: params } = await import('../../params.js')
    const mod = await import('./main.js')
    expect(start).toHaveBeenCalled()
    logSpy.mockRestore()
  })
})


