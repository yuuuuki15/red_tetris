/* @vitest-environment jsdom */
import { describe, test, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from './userStore.js'

describe('User Store', () => {
  beforeEach(() => {
    // Fresh pinia instance and storage for each test
    setActivePinia(createPinia())
    localStorage.clear()
  })

  test('initializes from localStorage if playerName exists', () => {
    localStorage.setItem('playerName', 'Alice')
    const store = useUserStore()
    expect(store.playerName).toBe('Alice')
  })

  test('setPlayerName updates state and persists to localStorage', () => {
    const store = useUserStore()
    store.setPlayerName('Bob')
    expect(store.playerName).toBe('Bob')
    expect(localStorage.getItem('playerName')).toBe('Bob')
  })
})


