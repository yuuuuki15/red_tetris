/* @vitest-environment jsdom */
import { mount } from '@vue/test-utils'
import { test, expect } from 'vitest'
import MultiBoardGrid from '../MultiBoardGrid.vue'
import { BOARD_HEIGHT } from '../../../shared/constants.js'

function makePlayers(n, withSpectrum = true) {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i+1}`,
    name: `Player${i+1}`,
    spectrum: withSpectrum ? Array.from({ length: 10 }, (_, c) => c) : [],
  }))
}

test('uses 1 column for 1 player and 2 columns for 3 players', () => {
  const w1 = mount(MultiBoardGrid, { props: { players: makePlayers(1), containerWidth: 800 } })
  expect(w1.find('.grid-container').attributes('style')).toContain('grid-template-columns: repeat(1, 1fr);')

  const w3 = mount(MultiBoardGrid, { props: { players: makePlayers(3), containerWidth: 800 } })
  expect(w3.find('.grid-container').attributes('style')).toContain('grid-template-columns: repeat(2, 1fr);')
})

test('renders spectrum columns per player and computes bar heights from BOARD_HEIGHT', () => {
  const players = makePlayers(1)
  // first player spectrum: 0..9
  const wrapper = mount(MultiBoardGrid, { props: { players, containerWidth: 600 } })
  const cols = wrapper.findAll('.spectrum-column')
  expect(cols.length).toBe(players[0].spectrum.length)

  // Check one bar height mapping
  const sampleIndex = 5
  const bar = cols[sampleIndex].find('.spectrum-bar')
  const expected = `${(players[0].spectrum[sampleIndex] / BOARD_HEIGHT) * 100}%`
  expect(bar.attributes('style')).toContain(`height: ${expected}`)
})


