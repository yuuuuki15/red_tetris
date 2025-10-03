import { describe, it, expect, beforeEach, vi } from 'vitest';
import Game from './Game.js';
import Player from './Player.js';
import { BOARD_WIDTH, BOARD_HEIGHT } from '../../shared/constants.js';

describe('Game Model', () => {

  describe('Player Management', () => {
    let game;
    const hostInfo = { id: 'host123', name: 'HostPlayer' };

    beforeEach(() => {
      game = new Game(hostInfo, 'multiplayer');
    });

    it('should add a new player', () => {
      game.addPlayer({ id: 'p2', name: 'Player2' });
      expect(game.players.length).toBe(2);
      expect(game.players[1].name).toBe('Player2');
    });

    it('should remove a player', () => {
      game.addPlayer({ id: 'p2', name: 'Player2' });
      game.removePlayer('p2');
      expect(game.players.length).toBe(1);
    });

    it('should migrate host when host leaves', () => {
      game.addPlayer({ id: 'p2', name: 'Player2' });
      game.removePlayer('host123');
      expect(game.players[0].isHost).toBe(true);
      expect(game.players[0].name).toBe('Player2');
    });

    it('should end the game when only one player remains', () => {
      game.addPlayer({ id: 'p2', name: 'Player2' });
      game.startGame(); // The game must be in 'playing' state

      game.removePlayer('p2');

      expect(game.players.length).toBe(1);
      expect(game.status).toBe('lobby');
      expect(game.winner).toBe(hostInfo.name);
    });

    it('should not add a player if the game has already started', () => {
      game.startGame();
      const result = game.addPlayer({ id: 'p3', name: 'Latecomer' });
      expect(result).toBe(false);
      expect(game.players.length).toBe(1);
    });
  });

  describe('Spectator Management', () => {
    let game;
    const hostInfo = { id: 'host123', name: 'HostPlayer' };

    beforeEach(() => {
      game = new Game(hostInfo, 'multiplayer');
    });

    it('should add a spectator', () => {
      const spectatorInfo = { id: 'spec1', name: 'Spectator1' };
      game.addSpectator(spectatorInfo);
      expect(game.spectators.length).toBe(1);
      expect(game.spectators[0].name).toBe('Spectator1');
    });

    it('should not add a duplicate spectator', () => {
      const spectatorInfo = { id: 'spec1', name: 'Spectator1' };
      game.addSpectator(spectatorInfo);
      game.addSpectator(spectatorInfo); // Add the same spectator again
      expect(game.spectators.length).toBe(1);
    });

    it('should remove a spectator', () => {
      const spectatorInfo = { id: 'spec1', name: 'Spectator1' };
      game.addSpectator(spectatorInfo);
      expect(game.spectators.length).toBe(1);

      game.removeSpectator(spectatorInfo.id);
      expect(game.spectators.length).toBe(0);
    });
  });

  describe('Game Logic and Collision', () => {
    let game;
    let player1;

    beforeEach(() => {
      const hostInfo = { id: 'p1', name: 'Player1' };
      game = new Game(hostInfo, 'solo');
      game.startGame(); // Start the game to assign the first piece
      player1 = game.players[0];
    });

    it('should not allow a piece to move beyond the left wall', () => {
      player1.activePiece.position = { x: 0, y: 5 };
      game.handlePlayerAction('p1', 'moveLeft');
      expect(player1.activePiece.position.x).toBe(0);
    });

    it('should not allow a piece to move beyond the right wall', () => {
      // Assuming a 2-width piece like 'O'
      player1.activePiece.shape = [[1,1],[1,1]];
      player1.activePiece.position = { x: BOARD_WIDTH - 2, y: 5 };
      game.handlePlayerAction('p1', 'moveRight');
      expect(player1.activePiece.position.x).toBe(BOARD_WIDTH - 2);
    });

    it('should not allow a piece to move into another piece', () => {
      // Place a block for the piece to collide with
      player1.board[10][6] = 1; // A block is at (x:6, y:10)

      // Position a 2x1 piece to the left of the block
      player1.activePiece.shape = [[1, 1]];
      player1.activePiece.position = { x: 4, y: 10 };

      // Attempt to move right, which would cause the right part of the piece
      // to overlap with the block at (x:6, y:10)
      game.handlePlayerAction('p1', 'moveRight');

      // The piece's X position should not have changed
      expect(player1.activePiece.position.x).toBe(4);
    });

    it('should allow a piece to move left when valid', () => {
      player1.activePiece.position = { x: 5, y: 5 };
      game.handlePlayerAction('p1', 'moveLeft');
      expect(player1.activePiece.position.x).toBe(4);
    });

    it('should allow a piece to rotate when valid (by coordinates)', () => {
      // Force a non-symmetric piece at a safe position
      player1.activePiece = {
        type: 'T',
        shape: [
          [1, 1, 1],
          [0, 1, 0],
        ],
        position: { x: 4, y: 0 },
      };

      const coordsOf = (piece) => {
        const result = [];
        for (let py = 0; py < piece.shape.length; py++) {
          for (let px = 0; px < piece.shape[py].length; px++) {
            if (piece.shape[py][px]) result.push([piece.position.x + px, piece.position.y + py]);
          }
        }
        return result;
      };

      const before = coordsOf(player1.activePiece);
      game.handlePlayerAction('p1', 'rotate');
      const after = coordsOf(player1.activePiece);

      expect(after).not.toEqual(before);
      expect(after.length).toBeGreaterThan(0);
      expect(after.every(([x, y]) => x >= 0 && x < BOARD_WIDTH && y >= 0 && y < BOARD_HEIGHT)).toBe(true);
    });

    it('should set the soft drop flag on player for softDrop action', () => {
      expect(player1.isSoftDropping).toBe(false);
      game.handlePlayerAction('p1', 'softDrop');
      expect(player1.isSoftDropping).toBe(true);
    });

    it('should perform a hard drop correctly', () => {
      // Piece starts at y=0 (from startGame)
      player1.activePiece.position = { x: 4, y: 0 };
      const initialPieceType = player1.activePiece.type;
      const initialScore = player1.score;

      // The piece should drop to the bottom row (y=19) as the board is empty.
      // Assuming piece height is 1 for simplicity.
      player1.activePiece.shape = [[1]];
      const dropDistance = (BOARD_HEIGHT - 1) - 0;

      game.handlePlayerAction('p1', 'hardDrop');

      // 1. A new piece should be assigned
      expect(player1.activePiece).not.toBeNull();
      expect(player1.activePiece.type).not.toBe(initialPieceType); // A new piece from the sequence
      expect(player1.activePiece.position.y).toBe(0); // New piece at the top

      // 2. The old piece should be locked on the board at the bottom
      expect(player1.board[BOARD_HEIGHT - 1][4]).not.toBe(0);

      // 3. Score should be added (solo mode)
      expect(player1.score).toBe(initialScore + (dropDistance * 2)); // SCORES.HARD_DROP is 2
    });
  });

  describe('Tick and Game Flow', () => {
    let game;
    let player1;

    beforeEach(() => {
      const hostInfo = { id: 'p1', name: 'Player1' };
      game = new Game(hostInfo, 'solo');
      game.startGame();
      player1 = game.players[0];
      // Mock Date.now() to control time
      vi.spyOn(Date, 'now').mockReturnValue(0);
    });

    it('should move the active piece down by one on a game tick', () => {
      player1.activePiece.position = { x: 5, y: 5 };

      // Simulate time passing
      Date.now.mockReturnValue(2000);
      game.tick();

      expect(player1.activePiece.position.y).toBe(6);
    });

    it('should lock the piece when it hits the bottom', () => {
      player1.activePiece.position = { x: 5, y: BOARD_HEIGHT - 1 };
      player1.activePiece.shape = [[1]]; // 1x1 piece for simplicity

      Date.now.mockReturnValue(2000);
      game.tick();

      // The piece should be locked, and a new piece should be active
      expect(player1.board[BOARD_HEIGHT - 1][5]).not.toBe(0);
      expect(player1.activePiece).not.toBeNull();
      // Verify that the old piece is no longer the active one
      expect(player1.activePiece.position.y).not.toBe(BOARD_HEIGHT);
    });

    it('should clear a completed line and add score', () => {
      // Manually create a board with one line almost full
      const almostFullRow = Array(BOARD_WIDTH).fill(1);
      almostFullRow[5] = 0; // Leave one gap
      player1.board[BOARD_HEIGHT - 1] = almostFullRow;

      // Position a 1x1 piece directly in the gap on the last row, ready to be locked
      player1.activePiece.shape = [[1]];
      player1.activePiece.type = 'I'; // Ensure a valid type for locking
      player1.activePiece.position = { x: 5, y: BOARD_HEIGHT - 1 };

      const initialScore = player1.score;

      // Let the piece fall and lock
      Date.now.mockReturnValue(2000);
      game.tick();

      // Assertions
      // The line should now be empty
      expect(player1.board[BOARD_HEIGHT - 1].every(cell => cell === 0)).toBe(true);
      // Score should have increased by SINGLE line score
      expect(player1.score).toBe(initialScore + 40); // Assuming SCORES.SINGLE is 40
    });
  });
});
