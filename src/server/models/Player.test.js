// Player.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Player from './Player.js';
import Piece from './Piece.js';

// Mock the Piece class so we don't depend on its actual implementation
vi.mock('./Piece.js', () => {
  return {
    default: vi.fn().mockImplementation((type) => ({
      type: type,
      shape: [[1]],
      position: { x: 0, y: 0 },
    })),
  };
});

describe('Player', () => {
  let player;
  const playerId = 'socket123';
  const playerName = 'Alice';

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    player = new Player(playerId, playerName, true);
  });

  // Test Case 1: Constructor
  describe('constructor', () => {
    it('should initialize player properties correctly', () => {
      expect(player.id).toBe(playerId);
      expect(player.name).toBe(playerName);
      expect(player.isHost).toBe(true);
      expect(player.score).toBe(0);
      expect(player.hasLost).toBe(false);
      expect(player.activePiece).toBe(null);
      expect(player.pieceIndex).toBe(0);
    });

    it('should create an empty board of the correct dimensions', () => {
      // Assuming BOARD_HEIGHT and BOARD_WIDTH are imported or mocked
      // For this test, let's use the known dimensions
      const BOARD_HEIGHT = 20;
      const BOARD_WIDTH = 10;
      expect(player.board).toBeInstanceOf(Array);
      expect(player.board.length).toBe(BOARD_HEIGHT);
      expect(player.board[0].length).toBe(BOARD_WIDTH);
      expect(player.board[0][0]).toBe(0); // Check if cells are empty
    });
  });

  // Test Case 2: assignNewPiece
  describe('assignNewPiece', () => {
    it('should assign a new piece to the activePiece property', () => {
      const newPiece = new Piece('T');
      player.assignNewPiece(newPiece);
      expect(player.activePiece).toBe(newPiece);
      expect(player.activePiece.type).toBe('T');
    });
  });

  // Test Case 3: reset
  describe('reset', () => {
    it('should reset all game-related properties to their initial state', () => {
      // Modify some properties to simulate a game in progress
      player.score = 1000;
      player.hasLost = true;
      player.board[10][5] = 1;
      player.assignNewPiece(new Piece('L'));
      player.pieceIndex = 5;

      // Perform the reset
      player.reset();

      // Check if properties are back to their initial values
      expect(player.score).toBe(0);
      expect(player.hasLost).toBe(false);
      expect(player.activePiece).toBe(null);
      expect(player.pieceIndex).toBe(0);
      expect(player.board[10][5]).toBe(0); // Check if board is cleared
    });
  });
});
