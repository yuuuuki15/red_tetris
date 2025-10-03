/* @vitest-environment jsdom */
import { describe, test, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { vi } from 'vitest'

// Mock store and audio service used in App.vue
vi.mock('./stores/gameStore', () => {
  const store = { initializeStore: vi.fn() }
  return { useGameStore: () => store, __storeMock: store }
})

// On mock le module en retournant un objet qui contient les fonctions exportées.
vi.mock('./services/audioService', () => ({
  init: vi.fn()
}))

import App from './App.vue'
import { __storeMock } from './stores/gameStore'
// On importe la fonction 'init' mockée *après* la déclaration du vi.mock.
import { init as initAudioService } from './services/audioService'

describe('App.vue', () => {
  test('calls initializeStore and audio init on mount', () => {
    mount(App, { global: { stubs: { 'router-view': true } } })
    expect(__storeMock.initializeStore).toHaveBeenCalled()
    // On vérifie que la fonction mockée importée a bien été appelée.
    expect(initAudioService).toHaveBeenCalled()
  })
})
