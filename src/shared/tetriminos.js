import { TETROMINO_COLORS } from './constants.js';

/**
 * Defines the shape and color for each type of tetromino.
 * The shape is represented by a 2D array where 1s are filled cells.
 * These are the initial orientations (0-degree rotation).
 */
export const TETROMINOS = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: TETROMINO_COLORS.I,
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: TETROMINO_COLORS.J,
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: TETROMINO_COLORS.L,
  },
  O: {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: TETROMINO_COLORS.O,
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    color: TETROMINO_COLORS.S,
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: TETROMINO_COLORS.T,
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    color: TETROMINO_COLORS.Z,
  },
};
