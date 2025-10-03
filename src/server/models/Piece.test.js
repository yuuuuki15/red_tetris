import { describe, it, expect, vi } from 'vitest';
import Piece from './Piece.js';

// Mock the dependency to avoid pathing issues in the test environment
vi.mock('../../shared/tetrominos.js', () => ({
  TETROMINOS: {
    T: {
      shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
      color: 'rgb(128, 0, 128)',
    },
    X: { // Mock data for the invalid test case
      shape: [[1]],
      color: 'rgb(255, 255, 255)',
    }
  }
}));

describe('Piece', () => {
  it('should initialize with the correct properties for a given type', () => {
    const pieceType = 'T';
    const piece = new Piece(pieceType);

    const expectedTetromino = {
      shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
      color: 'rgb(128, 0, 128)',
    };

    expect(piece.type).toBe(pieceType);
    expect(piece.shape).toEqual(expectedTetromino.shape);
    expect(piece.color).toBe(expectedTetromino.color);

    expect(piece.position).toEqual({ x: 0, y: 0 });
  });

  it('should throw an error for an invalid piece type', () => {
    const invalidType = 'Y'; // A type not present in the mock
    expect(() => new Piece(invalidType)).toThrowError(`Invalid piece type: ${invalidType}`);
  });
});