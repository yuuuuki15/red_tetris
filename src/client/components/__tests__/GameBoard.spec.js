/* @vitest-environment jsdom */
import { mount } from '@vue/test-utils'
import { test, expect } from 'vitest';
import GameBoard from '../../components/GameBoard.vue'
import { BOARD_WIDTH, BOARD_HEIGHT, TETROMINO_COLORS, PENALTY_CELL, PENALTY_COLOR } from '../../../shared/constants.js'

function makeEmptyBoard(rows = BOARD_HEIGHT, cols = BOARD_WIDTH) {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0))
}

test('renders frame around board', () => {
  const board = makeEmptyBoard()
  const wrapper = mount(GameBoard, { props: { board, activePiece: null, tileSize: 20 } })
  const tiles = wrapper.findAll('.tile')
  const rows = BOARD_HEIGHT + 2, cols = BOARD_WIDTH + 2
  expect(tiles.length).toBe(rows * cols)
  // top-left corner should be frame color
  const first = tiles[0]
  expect(first.attributes('style')).toContain('background-color: rgb(120, 120, 120)')
})

test('overlays active piece using TETROMINO_IDS', () => {
  const board = makeEmptyBoard()
  const activePiece = { type: 'T', shape: [[1,1,1],[0,1,0]], position: { x: 3, y: 2 } }
  const wrapper = mount(GameBoard, { props: { board, activePiece, tileSize: 20 } })
  const tColor = TETROMINO_COLORS.T
  // sample overlay cell
  const y = 2 + 0, x = 3 + 1 // center of the top row of T
  const rowIndex = (y + 1) // + frame
  const colIndex = (x + 1)
  const indexInFlat = rowIndex * (BOARD_WIDTH + 2) + colIndex
  const cell = wrapper.findAll('.tile')[indexInFlat]
  expect(cell.attributes('style')).toContain(`background-color: ${tColor}`)
})

test('penalty cells use PENALTY_COLOR', () => {
  const board = makeEmptyBoard()
  board[BOARD_HEIGHT - 1].fill(PENALTY_CELL)
  const wrapper = mount(GameBoard, { props: { board, activePiece: null, tileSize: 20 } })
  // bottom row inside frame
  const start = (BOARD_HEIGHT + 2 - 2) * (BOARD_WIDTH + 2) + 1
  const rowTiles = wrapper.findAll('.tile').slice(start, start + BOARD_WIDTH)
  rowTiles.forEach(t => expect(t.attributes('style')).toContain(`background-color: ${PENALTY_COLOR}`))
})

test('emits playerAction on arrow left key', async () => {
  const wrapper = mount(GameBoard, { props: { board: makeEmptyBoard(), activePiece: null }, attachTo: document.body })
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
  expect(wrapper.emitted('playerAction')?.[0]?.[0]).toBe('moveLeft')
})

test('emits playerAction on arrow right key', async () => {
  const wrapper = mount(GameBoard, { props: { board: makeEmptyBoard(), activePiece: null }, attachTo: document.body })
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
  expect(wrapper.emitted('playerAction')?.[0]?.[0]).toBe('moveRight')
})

test('emits playerAction on arrow up key', async () => {
  const wrapper = mount(GameBoard, { props: { board: makeEmptyBoard(), activePiece: null }, attachTo: document.body })
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
  expect(wrapper.emitted('playerAction')?.[0]?.[0]).toBe('rotate')
})

test('emits playerAction on arrow down key', async () => {
  const wrapper = mount(GameBoard, { props: { board: makeEmptyBoard(), activePiece: null }, attachTo: document.body })
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
  expect(wrapper.emitted('playerAction')?.[0]?.[0]).toBe('softDrop')
})

test('emits playerAction on space key', async () => {
  const wrapper = mount(GameBoard, { props: { board: makeEmptyBoard(), activePiece: null }, attachTo: document.body })
  window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))
  expect(wrapper.emitted('playerAction')?.[0]?.[0]).toBe('hardDrop')
})

test('on unmounted, removes event listener', async () => {
  const wrapper = mount(GameBoard, { props: { board: makeEmptyBoard(), activePiece: null }, attachTo: document.body })
  wrapper.unmount()
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
  expect(wrapper.emitted('playerAction')).toBeUndefined()
})
