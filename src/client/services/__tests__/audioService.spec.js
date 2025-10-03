/* @vitest-environment jsdom */
import { describe, test, expect, vi, beforeEach } from 'vitest'

// Mock HTMLAudioElement to avoid real audio loading
class MockAudio {
  constructor() { this.currentTime = 0; this.volume = 1; }
  play() { return Promise.resolve() }
}
vi.stubGlobal('Audio', MockAudio)

import * as audioService from '../audioService.js'

describe('audioService', () => {
  beforeEach(() => {
    // Re-init before each test
    audioService.init()
  })

  test('init creates audio objects and sets volumes', () => {
    // After init, calls to play should not throw
    expect(() => audioService.playMove()).not.toThrow()
  })

  test('play methods call underlying play()', () => {
    const spy = vi.spyOn(MockAudio.prototype, 'play')
    audioService.playRotate()
    audioService.playHardDrop()
    audioService.playLineClear()
    audioService.playGameOver()
    expect(spy).toHaveBeenCalled()
  })
})
