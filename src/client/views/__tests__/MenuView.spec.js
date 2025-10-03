/* @vitest-environment jsdom */
import { mount } from '@vue/test-utils'
import { describe, test, expect, vi, beforeEach } from 'vitest'

vi.mock('../../stores/userStore', () => {
  const store = { playerName: 'Tester' }
  return { useUserStore: () => store }
})

const storeMock = {
  enterLobbyBrowser: vi.fn(),
  leaveLobbyBrowser: vi.fn(),
  fetchLeaderboard: vi.fn(),
  lobbies: [],
  leaderboard: [],
}

vi.mock('../../stores/gameStore', () => ({ useGameStore: () => storeMock }))

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))

import MenuView from '../MenuView.vue'

describe('MenuView', () => {
  beforeEach(() => {
    storeMock.enterLobbyBrowser.mockClear()
    storeMock.leaveLobbyBrowser.mockClear()
    storeMock.fetchLeaderboard.mockClear()
  })

  test('mount hooks subscribe/unsubscribe and fetch leaderboard', () => {
    const wrapper = mount(MenuView, { global: { stubs: { BaseCard: true, BaseButton: true } } })
    expect(storeMock.enterLobbyBrowser).toHaveBeenCalled()
    expect(storeMock.fetchLeaderboard).toHaveBeenCalled()
    wrapper.unmount()
    expect(storeMock.leaveLobbyBrowser).toHaveBeenCalled()
  })

  test('render leaderboard fallback when empty', () => {
    const wrapper = mount(MenuView, { global: { stubs: { BaseCard: { template: '<div><slot name="header"/><slot/></div>' }, BaseButton: true } } })
    // The message is inside BaseCard content
    expect(wrapper.text()).toContain('Aucun score')
  })
})


