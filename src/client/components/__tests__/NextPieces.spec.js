/* @vitest-environment jsdom */
import { mount } from '@vue/test-utils';
import { test, expect } from 'vitest';
import NextPieces from '../NextPieces.vue';
import { TETROMINOS } from '../../../shared/tetriminos.js';

test('renders a list of upcoming pieces', () => {
  const mockPieces = [
    { type: 'T', shape: TETROMINOS.T.shape, color: TETROMINOS.T.color },
    { type: 'I', shape: TETROMINOS.I.shape, color: TETROMINOS.I.color },
  ];

  const wrapper = mount(NextPieces, {
    props: {
      pieces: mockPieces,
    },
  });

  // Check if two preview containers are rendered
  const previews = wrapper.findAll('.piece-preview');
  expect(previews.length).toBe(2);

  // Check the T piece specifically
  const tPiecePreview = previews[0];
  const tCells = tPiecePreview.findAll('.cell');
  // T shape is 3x3 = 9 cells
  expect(tCells.length).toBe(9);

  // The center of the T piece shape is at index 4 (row 1, col 1)
  // shape: [[0,1,0],[1,1,1],[0,0,0]]
  const centerCell = tCells[4];
  expect(centerCell.attributes('style')).toContain(`background-color: ${TETROMINOS.T.color}`);

  // An empty cell should be transparent
  const firstCell = tCells[0];
  expect(firstCell.attributes('style')).toContain('background-color: transparent');
});

test('renders nothing if pieces array is empty', () => {
  const wrapper = mount(NextPieces, {
    props: {
      pieces: [],
    },
  });

  expect(wrapper.find('.piece-preview').exists()).toBe(false);
});
