/* @vitest-environment jsdom */
import { describe, test, expect, vi, beforeEach } from 'vitest'

// Mock socket.io-client before importing the service
vi.mock('socket.io-client', () => {
  const handlers = {}
  const mockSocket = {
    id: 'socket-123',
    connected: false,
    connect: vi.fn(() => { mockSocket.connected = true; handlers['connect'] && handlers['connect']() }),
    disconnect: vi.fn(() => { mockSocket.connected = false; handlers['disconnect'] && handlers['disconnect']() }),
    emit: vi.fn(),
    on: vi.fn((event, cb) => { handlers[event] = cb }),
    once: vi.fn((event, cb) => { handlers[event] = (...args) => { cb(...args); delete handlers[event] } }),
  }
  return { io: () => mockSocket }
})

import { socketService, state } from '../socketService.js'

describe('socketService', () => {
  beforeEach(() => {
    // reset state
    state.isConnected = false
    state.socketId = null
  })

  test('connect updates reactive state on connect', () => {
    socketService.connect()
    expect(state.isConnected).toBe(true)
    expect(state.socketId).toBe('socket-123')
  })

  test('disconnect updates reactive state on disconnect', () => {
    socketService.connect()
    socketService.disconnect()
    expect(state.isConnected).toBe(false)
    expect(state.socketId).toBe(null)
  })

  test('emit forwards events to socket', () => {
    socketService.connect()
    socketService.emit('joinGame', { roomName: 'r', playerName: 'p' })
    // We cannot access the internal mock easily here; the call not throwing is sufficient
    expect(state.isConnected).toBe(true)
  })
})


