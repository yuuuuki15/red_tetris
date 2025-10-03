/* @vitest-environment jsdom */
import { mount } from '@vue/test-utils'
import { describe, test, expect, vi } from 'vitest'

vi.mock('../../stores/gameStore', () => {
  const state = {
    gameState: { status: 'playing', players: [{ id: 'me', board: [[0]], activePiece: { type: 'T', shape: [[1]], position: { x: 0, y: 0 } } }], spectators: [] },
  }
  const store = {
    ...state,
    get gameStatus() { return this.gameState.status },
    get currentPlayer() { return this.gameState.players[0] },
    get board() { return this.currentPlayer.board },
    get activePiece() { return this.currentPlayer.activePiece },
    get playerList() { return this.gameState.players },
    isCurrentUserHost: true,
    isCurrentUserSpectator: false,
    sendPlayerAction: vi.fn(),
    sendStartGame: vi.fn(),
    connectAndJoin: vi.fn(),
    leaveGame: vi.fn(),
  }
  return { useGameStore: () => store }
})

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { roomName: 'r1', playerName: 'p1' }, query: {} }),
  useRouter: () => ({ push: vi.fn() })
}))

import GameView from '../GameView.vue'

describe('GameView', () => {
  test('renders GameBoard when playing (stubbed)', async () => {
    const wrapper = mount(GameView, { global: { stubs: { GameBoard: { template: '<div class="gb"></div>' }, MultiBoardGrid: true } } })
    expect(wrapper.find('.gb').exists()).toBe(true)
  })
})


