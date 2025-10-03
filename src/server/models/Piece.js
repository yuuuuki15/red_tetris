/**
 * Représente une pièce de Tetris (Tetrimino).
 * L'implémentation de la forme, de la rotation, etc., sera ajoutée plus tard.
 */
import { TETROMINOS } from '../../shared/tetriminos.js';

/**
 * Represents a Tetris piece (Tetrimino).
 */
class Piece {
  constructor(type) {
    const tetromino = TETROMINOS[type];
    if (!tetromino) {
      throw new Error(`Invalid piece type: ${type}`);
    }

    this.shape = tetromino.shape;
    this.color = tetromino.color;
    this.type = type;
    // Position will be set when the piece is added to the board,
    // typically centered horizontally at the top.
    this.position = { x: 0, y: 0 };
  }
}

export default Piece;
