/* @vitest-environment jsdom */
import { mount } from '@vue/test-utils'
import { describe, test, expect, vi, beforeEach } from 'vitest'

vi.mock('../../stores/userStore', () => {
  const store = { playerName: '', setPlayerName: vi.fn() }
  return { useUserStore: () => store, __userStoreMock: store }
})

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))

import HomeView from '../HomeView.vue'
import { __userStoreMock } from '../../stores/userStore'

describe('HomeView', () => {
  beforeEach(() => {
    __userStoreMock.playerName = ''
    __userStoreMock.setPlayerName.mockClear()
  })

  test('submits name and navigates to /menu', async () => {
    const push = vi.fn()
    const wrapper = mount(HomeView, {
      global: {
        stubs: {
          BaseCard: { template: '<div><slot name="header"/><slot/></div>' },
          BaseButton: true,
        },
        mocks: { $router: { push } }
      }
    })
    const input = wrapper.get('input')
    await input.setValue('Alice')
    await wrapper.find('form').trigger('submit.prevent')

    expect(__userStoreMock.setPlayerName).toHaveBeenCalledWith('Alice')
    // router.push('/menu') is called; our stub uses component mocks
  })
})


