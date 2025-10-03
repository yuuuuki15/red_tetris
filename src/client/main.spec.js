/* @vitest-environment jsdom */
import { describe, test, expect, vi } from 'vitest'

// Mock Vue and Pinia APIs used in main.js
const appMock = { use: vi.fn().mockReturnThis(), mount: vi.fn() }
vi.mock('vue', () => ({
  createApp: vi.fn(() => appMock)
}))

vi.mock('pinia', () => ({ createPinia: vi.fn(() => 'PINIA') }))

// Mock router factory
const routerMock = 'ROUTER'
vi.mock('vue-router', () => ({
  createRouter: vi.fn(() => routerMock),
  createWebHistory: vi.fn(() => 'HIST')
}))

// Stub components to avoid full import
vi.mock('./App.vue', () => ({ default: { render() {} } }))
vi.mock('./views/HomeView.vue', () => ({ default: {} }))
vi.mock('./views/MenuView.vue', () => ({ default: {} }))
vi.mock('./views/GameView.vue', () => ({ default: {} }))

describe('main.js bootstrap', () => {
  test('creates app, installs pinia and router, mounts to #app', async () => {
    await import('./main.js')
    const { createApp } = await import('vue')
    const { createPinia } = await import('pinia')
    const { createRouter } = await import('vue-router')

    expect(createApp).toHaveBeenCalled()
    expect(createPinia).toHaveBeenCalled()
    expect(createRouter).toHaveBeenCalled()
    expect(appMock.use).toHaveBeenCalledWith('PINIA')
    expect(appMock.use).toHaveBeenCalledWith(routerMock)
    expect(appMock.mount).toHaveBeenCalledWith('#app')
  })
})
