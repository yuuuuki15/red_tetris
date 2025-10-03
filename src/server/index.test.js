/* @vitest-environment node */
import { describe, test, expect, vi, beforeEach } from 'vitest'

// --- Mocks for infra modules ---
const serverStub = {
  on: vi.fn(),
  listen: vi.fn((port, host, cb) => { cb && cb(); return serverStub }),
  close: vi.fn((cb) => { cb && cb() }),
  unref: vi.fn(),
}

vi.mock('http', () => ({ default: { createServer: vi.fn(() => serverStub) } }))

vi.mock('express', () => {
  const fn = vi.fn(() => {
    const app = { use: vi.fn(), get: vi.fn() }
    // expose last app instance for assertions
    fn.lastApp = app
    return app
  })
  fn.static = vi.fn(() => 'STATIC_MW')
  return { default: fn }
})

const ioStub = {
  on: vi.fn(),
  to: vi.fn(() => ({ emit: vi.fn() })),
  close: vi.fn(),
}
vi.mock('socket.io', () => ({ Server: vi.fn(() => ioStub) }))

vi.mock('./services/databaseService.js', () => ({
  initializeDatabase: vi.fn(async () => {}),
  getLeaderboard: vi.fn(async () => []),
}))

// Import after mocks
import { start } from './index.js'

describe('server/index start()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns stop() and starts listening', async () => {
    const params = { host: '127.0.0.1', port: 0, url: 'http://127.0.0.1:0' }
    const { stop } = await start(params)
    expect(serverStub.listen).toHaveBeenCalled()
    expect(typeof stop).toBe('function')

    await new Promise((resolve) => {
      stop(() => resolve())
    })
    expect(ioStub.close).toHaveBeenCalled()
    expect(serverStub.close).toHaveBeenCalled()
    expect(serverStub.unref).toHaveBeenCalled()
  })
})

describe('server/index connection handlers', () => {
  test('enter/leave lobby and getLeaderboard', async () => {
    const params = { host: '127.0.0.1', port: 0, url: 'http://127.0.0.1:0' }
    await start(params)

    // Capture the connection handler registered on io
    const connectionCb = ioStub.on.mock.calls.find(c => c[0] === 'connection')[1]
    expect(typeof connectionCb).toBe('function')

    // Fake socket with event registry
    const handlers = {}
    const socket = {
      id: 'sock1',
      data: {},
      join: vi.fn(),
      leave: vi.fn(),
      emit: vi.fn(),
      on: vi.fn((event, cb) => { handlers[event] = cb }),
    }

    // Prepare io.to(room).emit spy
    const roomEmitter = { emit: vi.fn() }
    ioStub.to.mockReturnValue(roomEmitter)

    // Initialize per-connection handlers
    connectionCb(socket)

    // enter lobby
    handlers['enterLobbyBrowser']()
    expect(socket.join).toHaveBeenCalledWith('global-lobby')
    expect(socket.emit).toHaveBeenCalledWith('lobbiesListUpdate', expect.any(Array))

    // get leaderboard
    const db = await import('./services/databaseService.js')
    db.getLeaderboard.mockResolvedValueOnce([{ name: 'A', score: 1, difficulty: 'normal', date: 'x', weightedScore: 1 }])
    await handlers['getLeaderboard']()
    expect(socket.emit).toHaveBeenCalledWith('leaderboardUpdate', expect.any(Array))

    // leave lobby
    handlers['leaveLobbyBrowser']()
    expect(socket.leave).toHaveBeenCalledWith('global-lobby')
  })

  test('joinGame as host creates room and broadcasts state', async () => {
    const params = { host: '127.0.0.1', port: 0, url: 'http://127.0.0.1:0' }
    await start(params)
    const connectionCb = ioStub.on.mock.calls.find(c => c[0] === 'connection')[1]
    const handlers = {}
    const socket = {
      id: 'sock2',
      data: {},
      join: vi.fn(),
      leave: vi.fn(),
      emit: vi.fn(),
      on: vi.fn((event, cb) => { handlers[event] = cb }),
    }
    const roomEmitter = { emit: vi.fn() }
    ioStub.to.mockReturnValue(roomEmitter)

    connectionCb(socket)
    handlers['joinGame']({ roomName: 'room1', playerName: 'Host', isSpectator: false, difficulty: 'normal' })
    expect(socket.join).toHaveBeenCalledWith('room1')
    expect(roomEmitter.emit).toHaveBeenCalledWith('gameStateUpdate', expect.any(Object))
  })
})

describe('server/index production and error paths', () => {
  test('serves static files when NODE_ENV=production', async () => {
    const params = { host: '127.0.0.1', port: 0, url: 'http://127.0.0.1:0' }
    const prev = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    await start(params)
    const { default: expressMock } = await import('express')
    expect(expressMock.static).toHaveBeenCalled()
    expect(expressMock.lastApp.use).toHaveBeenCalledWith('STATIC_MW')
    expect(expressMock.lastApp.get).toHaveBeenCalled()
    process.env.NODE_ENV = prev
  })

  test('listen error path rejects', async () => {
    // Make the next listen call return an object that immediately triggers error callback
    serverStub.listen.mockImplementationOnce((port, host, cb) => {
      // Do NOT call cb, so resolve is not triggered
      return { on: (event, handler) => { if (event === 'error') handler(new Error('boom')) } }
    })
    const params = { host: '127.0.0.1', port: 0, url: 'http://127.0.0.1:0' }
    await expect(start(params)).rejects.toBeInstanceOf(Error)
  })
})

describe('server/index disconnect flow', () => {
  test('disconnect calls leave and broadcasts', async () => {
    const params = { host: '127.0.0.1', port: 0, url: 'http://127.0.0.1:0' }
    await start(params)
    const connectionCb = ioStub.on.mock.calls.find(c => c[0] === 'connection')[1]
    const handlers = {}
    const socket = {
      id: 'sock3',
      data: {},
      join: vi.fn(),
      leave: vi.fn(),
      emit: vi.fn(),
      on: vi.fn((event, cb) => { handlers[event] = cb }),
    }
    const roomEmitter = { emit: vi.fn() }
    ioStub.to.mockReturnValue(roomEmitter)
    connectionCb(socket)

    // Join then disconnect
    handlers['joinGame']({ roomName: 'roomX', playerName: 'Alice', isSpectator: false, difficulty: 'normal' })
    handlers['disconnect']()
    expect(socket.leave).toHaveBeenCalledWith('roomX')
    expect(roomEmitter.emit).toHaveBeenCalledWith('gameStateUpdate', expect.any(Object))
  })
})


