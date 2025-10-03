import { BOARD_WIDTH, BOARD_HEIGHT } from '../../shared/constants.js';

/**
 * Crée une grille de jeu vide.
 * @returns {Array<Array<number>>} Une matrice remplie de 0.
 */
function createEmptyBoard() {
  return Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0));
}

/**
 * Représente un joueur dans la partie.
 */
class Player {
  /**
   * @param {string} id - L'identifiant unique du joueur (par exemple, l'ID du socket).
   * @param {string} name - Le nom du joueur.
   * @param {boolean} isHost - Indique si le joueur est l'hôte de la partie.
   */
  constructor(id, name, isHost = false) {
    this.id = id;
    this.name = name;
    this.isHost = isHost;
    this.board = createEmptyBoard(); // Le plateau est maintenant initialisé.
    this.activePiece = null; // La pièce actuellement contrôlée par le joueur.
    this.pieceIndex = 0; // Tracks the player's position in the master piece sequence.
    this.lastFallTime = 0; // Timestamp of the last time the piece fell naturally.
    this.isSoftDropping = false; // True if the player is holding the soft drop key.
    this.hasLost = false;
    this.score = 0;
  }

  /**
   * Resets a player's state for a new game.
   */
  reset() {
    this.board = createEmptyBoard();
    this.activePiece = null;
    this.pieceIndex = 0;
    this.lastFallTime = 0;
    this.isSoftDropping = false;
    this.hasLost = false;
    this.score = 0;
  }

  /**
   * Assigns a new piece to the player.
   * @param {Piece} piece - The new piece object to be controlled by the player.
   */
  assignNewPiece(piece) {
    this.activePiece = piece;
  }
}

export default Player;
