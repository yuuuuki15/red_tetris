import Player from './Player.js';
import Piece from './Piece.js';
import { addScore } from '../services/databaseService.js';
import { TETROMINOS } from '../../shared/tetriminos.js';
import {
  TETROMINO_IDS,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  PENALTY_CELL,
  SCORES,
  DIFFICULTY_SETTINGS
} from '../../shared/constants.js';

/**
 * @typedef {Object} GameState
 * @property {('lobby'|'playing'|'finished')} status - L'état actuel de la partie.
 * @property {string|null} winner - Le nom du gagnant si la partie est terminée.
 * @property {string} gameMode - Le mode de jeu ('solo' ou 'multiplayer').
 * @property {number} level - Le niveau actuel de la partie.
 * @property {number} linesToNextLevel - Le nombre de lignes restantes avant le prochain niveau.
 * @property {Array<PlayerState>} players - La liste des états de chaque joueur.
 * @property {Array<{id: string, name: string}>} spectators - La liste des spectateurs.
 * @property {Array<string>} events - Une liste d'événements qui viennent de se produire (ex: 'lineClear', 'gameOver').
 */

/**
 * @typedef {Object} PlayerState
 * @property {string} id - L'identifiant du joueur.
 * @property {string} name - Le nom du joueur.
 * @property {boolean} hasLost - Si le joueur a perdu.
 * @property {number} score - Le score actuel du joueur.
 * @property {Array<Array<number>>} board - La grille de jeu du joueur.
 * @property {Object} activePiece - La pièce active du joueur.
 * @property {string} activePiece.shape - La forme de la pièce.
 * @property {string} activePiece.color - La couleur de la pièce.
 * @property {Object} activePiece.position - La position (x, y) de la pièce.
 * @property {Array<Object>} nextPieces - La liste des 2-3 prochaines pièces.
 */


/**
 * La classe Game ("Machine à Tetris") gère toute la logique d'une partie.
 * Elle est agnostique de la manière dont les données sont transmises (Socket.io, etc.).
 */
class Game {
  /**
   * @param {Object} hostInfo - Objet contenant les infos du premier joueur ({ id, name }).
   * @param {('solo'|'multiplayer')} gameMode - The mode of the game.
   * @param {Object} options - Options de la partie.
   * @param {string} options.difficulty - La difficulté de départ ('normal', 'fast', 'hardcore').
   */
  constructor(hostInfo, gameMode = 'multiplayer', options = {}) {
    this.players = [new Player(hostInfo.id, hostInfo.name, true)];
    this.spectators = [];
    this.masterPieceSequence = [];
    this.gameMode = gameMode;
    this.difficulty = options.difficulty || 'normal';
    this._generateNewBag();
    this.status = 'lobby'; // 'lobby' | 'playing' | 'finished'
    this.winner = null;
    this.lastResult = null; // Summary of the last finished game
    this.events = []; // Accumulateur d'événements pour les sons/animations
    this.level = 1;
    this.linesToNextLevel = 10; // Default value, will be set properly in startGame
  }

  /**
   * Generates a new "bag" of 7 unique tetrominoes and adds it to the master sequence.
   */
  _generateNewBag() {
    const pieceTypes = Object.keys(TETROMINO_IDS);

    // Fisher-Yates shuffle algorithm
    for (let i = pieceTypes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pieceTypes[i], pieceTypes[j]] = [pieceTypes[j], pieceTypes[i]];
    }

    this.masterPieceSequence.push(...pieceTypes);
  }

  /**
   * Gets the next piece type for a specific player from the master sequence.
   * @param {Player} player - The player for whom to get the next piece.
   * @returns {string} The type of the next piece (e.g., 'T', 'L').
   */
  _getPieceTypeForPlayer(player) {
    // If the player is about to need a piece that doesn't exist yet, generate a new bag.
    if (player.pieceIndex >= this.masterPieceSequence.length) {
      this._generateNewBag();
      // console.log('Master piece sequence extended. New length:', this.masterPieceSequence.length);
    }

    const pieceType = this.masterPieceSequence[player.pieceIndex];
    player.pieceIndex++; // Crucially, advance the index for this player
    return pieceType;
  }

  /**
   * Checks if a piece's position and shape are valid on a given board.
   * @param {Player} player - The player whose board we are checking against.
   * @param {Piece} piece - The piece object to validate.
   * @returns {boolean} - True if the position is valid, false otherwise.
   */
  _isValidPosition(player, piece) {
    const { shape, position } = piece;
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        // If it's an empty part of the piece's shape, skip it
        if (shape[y][x] === 0) {
          continue;
        }

        const boardX = position.x + x;
        const boardY = position.y + y;

        // 1. Check if it's outside the board's horizontal bounds
        if (boardX < 0 || boardX >= BOARD_WIDTH) {
          return false;
        }
        // 2. Check if it's outside the board's vertical bounds (below the floor)
        if (boardY >= BOARD_HEIGHT) {
          return false;
        }
        // 3. Check if it's colliding with an existing piece on the board
        // (We only need to check if boardY is non-negative)
        if (boardY >= 0 && player.board[boardY][boardX] !== 0) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Rotates a piece's shape matrix clockwise.
   * @param {Array<Array<number>>} shape - The shape matrix to rotate.
   * @returns {Array<Array<number>>} The new, rotated shape matrix.
   */
  _rotateShape(shape) {
    const size = shape.length;
    const newShape = Array(size).fill(0).map(() => Array(size).fill(0));

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // The formula for a 90-degree clockwise rotation is:
        // newX = size - 1 - y
        // newY = x
        newShape[x][size - 1 - y] = shape[y][x];
      }
    }
    return newShape;
  }

  /**
   * Locks a player's active piece onto their board.
   * @param {Player} player - The player whose piece is to be locked.
   */
  _lockPiece(player) {
    this.events.push('pieceLock');
    const { shape, position } = player.activePiece;
    const pieceId = TETROMINO_IDS[player.activePiece.type];

    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] !== 0) {
          const boardX = position.x + x;
          const boardY = position.y + y;
          // Ensure we don't try to lock parts of the piece that are off-screen
          if (boardY >= 0 && boardY < BOARD_HEIGHT) {
            player.board[boardY][boardX] = pieceId;
          }
        }
      }
    }
    this._clearLines(player);
  }

  /**
   * Checks for and clears any completed lines on a player's board.
   * @param {Player} player - The player whose board to check.
   */
  _clearLines(player) {
    let linesCleared = 0;
    // A new board to build, filtering out completed lines
    const newBoard = player.board.filter(row => {
      // A line is kept if it has an empty cell OR if it's a penalty line.
      // A line is only cleared if it's full of tetromino pieces (no 0s) and not a penalty line.
      return row.includes(0) || row.includes(PENALTY_CELL);
    });

    linesCleared = BOARD_HEIGHT - newBoard.length;

    if (linesCleared > 0) {
      this.events.push('lineClear');
      // console.log(`Player ${player.name} cleared ${linesCleared} lines.`);
      // Add new empty rows at the top of the board for each line cleared
      for (let i = 0; i < linesCleared; i++) {
        newBoard.unshift(Array(BOARD_WIDTH).fill(0));
      }
      // Replace the old board with the new one
      player.board = newBoard;

      // Add score based on lines cleared
      if (this.gameMode === 'solo') {
        switch (linesCleared) {
          case 1:
            player.score += SCORES.SINGLE;
            break;
          case 2:
            player.score += SCORES.DOUBLE;
            break;
          case 3:
            player.score += SCORES.TRIPLE;
            break;
          case 4:
            player.score += SCORES.TETRIS;
            break;
        }
      }

      // Send penalty lines to opponents if more than one line was cleared
      if (linesCleared > 1) {
        const penaltyLinesToSend = linesCleared - 1;
        this.players.forEach(opponent => {
          if (opponent.id !== player.id && !opponent.hasLost) {
            this._addPenaltyLines(opponent, penaltyLinesToSend);
          }
        });
      }

      // TODO: Add score based on lines cleared.

      // --- Level Progression Logic ---
      this.linesToNextLevel -= linesCleared;
      if (this.linesToNextLevel <= 0) {
        this.level++;
        // Reset the counter, carrying over any extra lines
        const settings = DIFFICULTY_SETTINGS[this.difficulty];
        this.linesToNextLevel = settings.linesPerLevel + this.linesToNextLevel;
        // console.log(`Level up! Game is now level ${this.level}.`);
      }
    }
  }

  /**
   * Adds a specified number of penalty lines to a player's board.
   * @param {Player} player - The player receiving the penalty.
   * @param {number} lineCount - The number of penalty lines to add.
   */
  _addPenaltyLines(player, lineCount) {
    // console.log(`Sending ${lineCount} penalty lines to player ${player.name}`);
    for (let i = 0; i < lineCount; i++) {
      // Remove the top line to make space
      player.board.shift();

      // Create a solid, indestructible penalty line.
      const penaltyLine = Array(BOARD_WIDTH).fill(PENALTY_CELL);

      // Add the penalty line to the bottom
      player.board.push(penaltyLine);

      // Crucially, the active piece must also be shifted up to stay in sync with the board.
      if (player.activePiece) {
        if (player.activePiece.position.y > 0) {
          player.activePiece.position.y -= 1;
        }
      }
    }
  }

  /**
   * Calculates the piece fall speed in milliseconds based on the current game level.
   * The speed increases as the level goes up, with a minimum cap.
   * @returns {number} The time in milliseconds for a piece to fall one step.
   */
  _calculateFallSpeed() {
    // Formula: Start at 1000ms, decrease by 50ms per level. Minimum speed is 100ms.
    const speed = 1000 - ((this.level - 1) * 50);
    return Math.max(100, speed);
  }

  /**
   * Helper method to assign a new piece to a player, including game over check.
   * @param {Player} player - The player to assign a new piece to.
   */
  _assignNewPieceToPlayer(player) {
    const nextPieceType = this._getPieceTypeForPlayer(player);
    const newPiece = new Piece(nextPieceType);

    // Center the new piece horizontally
    newPiece.position.x = Math.floor(BOARD_WIDTH / 2) - Math.floor(newPiece.shape[0].length / 2);

    // --- Game Over Check (Pre-spawn validation) ---
    // If the new piece is invalid *before* being assigned (i.e., it collides at spawn), the player has lost.
    if (!this._isValidPosition(player, newPiece)) {
      player.hasLost = true;
      // Clear the active piece for the lost player so it doesn't render overlapping.
      player.activePiece = null;
      // console.log(`Player ${player.name} has lost the game.`);
    } else {
      // If the position is valid, assign the new piece to the player
      player.assignNewPiece(newPiece);
    }
  }

  /**
   * Fait avancer le jeu d'une unité de temps (un "tick").
   * @returns {GameState} La "photographie" complète et à jour de l'état du jeu.
   */
  tick() {
    this.events = []; // Réinitialise les événements à chaque tick
    const now = Date.now();
    // La boucle de jeu ne doit agir que si la partie est en cours.
    if (this.status === 'playing') {
      this.players.forEach(player => {
        if (player.hasLost || !player.activePiece) {
          return; // Skip players who have lost or have no piece
        }
        if (!player.activePiece) {
            // This player needs a piece, typically after a game over or initial spawn.
            // If they don't have one, try to give them one.
            this._assignNewPieceToPlayer(player);
            if (player.hasLost) { // Check if assigning the piece immediately caused a loss
                const activePlayers = this.players.filter(p => !p.hasLost);
                if (activePlayers.length <= 1) {
                    this._endGame();
                }
                return;
            }
        }

        // Check if it's time for the piece to fall
        const fallSpeed = this._calculateFallSpeed();
        const isTimeToFall = now - player.lastFallTime >= fallSpeed;

        if (player.isSoftDropping || isTimeToFall) {
          if (isTimeToFall) {
            player.lastFallTime = now;
          } else if (this.gameMode === 'solo') {
            // This fall was caused by a soft drop, so add score
            player.score += SCORES.SOFT_DROP;
          }

          const piece = player.activePiece;
          // Create a temporary piece to test movement
          const testPiece = new Piece(piece.type);
          testPiece.shape = piece.shape;
          testPiece.position = { ...piece.position };
          testPiece.position.y += 1; // Move down by one step

          if (this._isValidPosition(player, testPiece)) {
            // If the new position is valid, update the piece's position.
            player.activePiece.position.y += 1;
          } else {
            // If not valid, the piece has landed.
            this._lockPiece(player);
            // Now, try to assign a new piece. This is where the game-over condition should be checked.
            this._assignNewPieceToPlayer(player);

            if (player.hasLost) {
              const activePlayers = this.players.filter(p => !p.hasLost);
              if (activePlayers.length <= 1) {
                this._endGame();
              }
            }
          }
          // After a soft drop move, reset the flag. The client must send the action continuously.
          player.isSoftDropping = false;
        }
      });
    }

    // On retourne toujours l'état actuel, même si la partie est finie,
    // pour que tous les clients reçoivent l'état final.
    return this.getCurrentGameState();
  }

  /**
   * Ends the game, calculates scores, and sets the winner.
   */
  _endGame() {
    this.events.push('gameOver');
    this.status = 'finished';

    if (this.gameMode === 'solo') {
      this.winner = this.players[0] ? this.players[0].name : 'N/A';
    } else { // multiplayer
      const activePlayers = this.players.filter(p => !p.hasLost);
      if (activePlayers.length === 1) {
        this.winner = activePlayers[0].name;
      } else {
        const highestScorer = this.players.reduce((prev, current) => (prev.score > current.score) ? prev : current);
        this.winner = highestScorer ? highestScorer.name : 'Personne';
      }
    }

    // console.log(`Game finished. Winner: ${this.winner}. Saving scores...`);

    // Save the final, calculated scores.
    if (this.gameMode === 'solo') {
      this.players.forEach(player => {
        addScore({
          name: player.name,
          score: player.score,
          difficulty: this.difficulty,
        });
      });
    } else {
      // Build last result summary and immediately reopen the room as lobby
      this.lastResult = {
        winner: this.winner,
        mode: this.gameMode,
        difficulty: this.difficulty,
        timestamp: Date.now(),
        players: this.players.map(p => ({ id: p.id, name: p.name, score: p.score })),
      };
      this.status = 'lobby';
    }
  }

  /**
   * Calculates the spectrum of a player's board.
   * The spectrum is an array of the heights of each column.
   * @param {Player} player - The player whose board to analyze.
   * @returns {number[]} An array of 10 numbers representing column heights.
   */
  _calculateSpectrum(player) {
    const spectrum = Array(BOARD_WIDTH).fill(0);
    const { board } = player;

    for (let x = 0; x < BOARD_WIDTH; x++) {
      for (let y = 0; y < BOARD_HEIGHT; y++) {
        if (board[y][x] !== 0) {
          spectrum[x] = BOARD_HEIGHT - y;
          break; // Move to the next column once the top block is found
        }
      }
    }
    return spectrum;
  }

  /**
   * Resets the game to its initial state for a new round.
   */
  restart() {
    // Reset game-level properties
    this.status = 'playing';
    this.winner = null;
    this.lastResult = null;

    // Reset piece sequence
    this.masterPieceSequence = [];
    this._generateNewBag();
    this._generateNewBag();

    // Reset each player
    this.players.forEach(player => {
      player.reset();
      this._assignNewPieceToPlayer(player);
    });

    // console.log('Game has been restarted!');
  }

  /**
   * Gère une action effectuée par un joueur.
   * @param {string} playerId - L'ID du joueur qui effectue l'action.
   * @param {('moveLeft'|'moveRight'|'rotate'|'softDrop'|'hardDrop')} action - L'action effectuée.
   * @returns {GameState} La "photographie" complète et à jour de l'état du jeu.
   */
  handlePlayerAction(playerId, action) {
    this.events = []; // Réinitialise les événements à chaque action
    const player = this.players.find(p => p.id === playerId);
    if (!player || !player.activePiece) {
      return this.getCurrentGameState();
    }

    const { activePiece } = player;
    const testPiece = new Piece(activePiece.type);
    testPiece.shape = activePiece.shape; // Keep current rotation
    testPiece.position = { ...activePiece.position };

    switch (action) {
      case 'moveLeft':
        testPiece.position.x -= 1;
        break;
      case 'moveRight':
        testPiece.position.x += 1;
        break;
      case 'rotate': {
        // The 'O' piece does not rotate.
        if (activePiece.type === 'O') {
          return this.getCurrentGameState();
        }

        const rotatedShape = this._rotateShape(activePiece.shape);

        // --- Wall Kick Logic ---
        // Test potential positions: 1. default, 2. kick left, 3. kick right ...
        const kickOffsets = [
          [0, 0],  // Default position
          [-1, 0], // Kick one unit to the left
          [1, 0],  // Kick one unit to the right
          [-2, 0], // Kick two units to the left
          [2, 0], // Kick two units to the right
        ];

        for (const [dx, dy] of kickOffsets) {
          const tempPiece = new Piece(activePiece.type);
          tempPiece.shape = rotatedShape;
          tempPiece.position = {
            x: activePiece.position.x + dx,
            y: activePiece.position.y + dy,
          };

          if (this._isValidPosition(player, tempPiece)) {
            // Found a valid position, apply rotation and kick
            this.events.push('rotate');
            player.activePiece.shape = tempPiece.shape;
            player.activePiece.position = tempPiece.position;
            return this.getCurrentGameState(); // Success, exit handler
          }
        }

        // If no valid position was found after all kick attempts, do nothing.
        return this.getCurrentGameState();
      }
      case 'softDrop':
        // The actual movement is handled in the tick, we just set the flag here.
        player.isSoftDropping = true;
        // We can return early as the tick will handle the movement.
        return this.getCurrentGameState();
      case 'hardDrop': {
        this.events.push('hardDrop');
        const originalY = activePiece.position.y;
        let testY = originalY;
        // Find the lowest valid position by checking downwards
        while (this._isValidPosition(player, { ...activePiece, position: { x: activePiece.position.x, y: testY + 1 } })) {
          testY++;
        }

        // Calculate score based on distance
        if (this.gameMode === 'solo') {
          const distance = testY - originalY;
          if (distance > 0) {
            player.score += distance * SCORES.HARD_DROP;
          }
        }

        // Directly update the player's piece position
        player.activePiece.position.y = testY;

        // Lock the piece and get a new one immediately
        this._lockPiece(player);
        // Immediately try to assign a new piece and check for game over
        this._assignNewPieceToPlayer(player);

        // Check for game over *right here* after the hard drop and new piece assignment
        if (player.hasLost) {
          const activePlayers = this.players.filter(p => !p.hasLost);
          if (activePlayers.length <= 1) {
            this._endGame();
          }
        }

        // Since the state is immediately and drastically changed, we can return early
        // The regular validation path isn't needed for hard drop.
        return this.getCurrentGameState();
      }
      // case 'rotate':
      //   // Rotation logic will go here
      //   break;
      // case 'softDrop':
      //   testPiece.position.y += 1;
      //   break;
    }

    if (this._isValidPosition(player, testPiece)) {
      // If the new position is valid, update the actual active piece
      if (action === 'moveLeft' || action === 'moveRight') {
        this.events.push('move');
      }
      player.activePiece.position = testPiece.position;
      player.activePiece.shape = testPiece.shape;
    }

    return this.getCurrentGameState();
  }

  /**
   * Génère la "photographie" actuelle du jeu.
   * @returns {GameState}
   */
  getCurrentGameState() {
    const state = {
      status: this.status,
      winner: this.winner,
      gameMode: this.gameMode,
      level: this.level,
      linesToNextLevel: this.linesToNextLevel,
      linesPerLevel: DIFFICULTY_SETTINGS[this.difficulty].linesPerLevel,
      players: this.players.map(player => {
        const nextPieces = [];
        const nextPieceCount = 3; // How many pieces to show in advance
        for (let i = 0; i < nextPieceCount; i++) {
          const pieceIndex = player.pieceIndex + i;
          // Ensure the master sequence is long enough
          if (pieceIndex >= this.masterPieceSequence.length) {
            this._generateNewBag();
          }
          const pieceType = this.masterPieceSequence[pieceIndex];
          const tetromino = TETROMINOS[pieceType];
          if (tetromino) {
            nextPieces.push({
              type: pieceType,
              shape: tetromino.shape,
              color: tetromino.color,
            });
          }
        }

        return {
          id: player.id,
          name: player.name,
          isHost: player.isHost,
          hasLost: player.hasLost,
          score: player.score,
          board: player.board,
          activePiece: player.activePiece,
          spectrum: this._calculateSpectrum(player),
          nextPieces: nextPieces,
        };
      }),
      spectators: this.spectators,
      events: [...this.events], // Envoie une copie des événements
      lastResult: this.lastResult,
    };
    this.events = []; // Vide la liste après l'envoi
    return state;
  }

  /**
   * Ajoute un nouveau joueur à la partie.
   * @param {Object} playerInfo - Informations sur le joueur ({ id, name }).
   * @returns {boolean} - True si le joueur a été ajouté, false sinon.
   */
  addPlayer(playerInfo) {
    // Allow joining when the game is not actively playing (lobby or finished)
    if (this.status === 'playing') {
      // console.log(`Game is already playing. Cannot add player ${playerInfo.name}.`);
      return false;
    }
    // Enforce a maximum of 4 players per game
    if (this.players.length >= 4) {
      // console.log(`Game is full (4/4). Cannot add player ${playerInfo.name}.`);
      return false;
    }
    if (this.players.filter((p) => p.name === playerInfo.name)) {
      let finalPlayerName = playerInfo.name;
      let suffix = 1;
      let nameExists = this.players.filter(p => p.name === finalPlayerName).length > 0;
      while (nameExists) {
        suffix++;
        finalPlayerName = `${playerInfo.name} (${suffix})`;
        nameExists = this.players.filter(p => p.name === finalPlayerName).length > 0;
      }
      playerInfo.name = finalPlayerName;
    }
    
    const newPlayer = new Player(playerInfo.id, playerInfo.name, false);
    this.players.push(newPlayer);
    // console.log(`Player ${playerInfo.name} added to the game. Total players: ${this.players.length}`);
    return true;
  }

  /**
   * Ajoute un nouveau spectateur à la partie.
   * @param {Object} spectatorInfo - Informations sur le spectateur ({ id, name }).
   * @returns {boolean} - Toujours true.
   */
  addSpectator(spectatorInfo) {
    if (!this.spectators.some(s => s.id === spectatorInfo.id)) {
      this.spectators.push({ id: spectatorInfo.id, name: spectatorInfo.name });
      // console.log(`Spectator ${spectatorInfo.name} added. Total spectators: ${this.spectators.length}`);
    }
    return true;
  }

  /**
   * Supprime un joueur de la partie et gère la migration de l'hôte si nécessaire.
   * @param {string} playerId - L'ID du joueur à supprimer.
   * @returns {number} Le nombre de joueurs restants.
   */
  removePlayer(playerId) {
    const playerToRemove = this.players.find(p => p.id === playerId);
    if (!playerToRemove) return this.players.length;

    const wasHost = playerToRemove.isHost;

    this.players = this.players.filter(p => p.id !== playerId);
    // console.log(`Player ${playerId} removed. Total players: ${this.players.length}`);

    // Si l'hôte est parti et qu'il reste des joueurs, le plus ancien devient le nouvel hôte.
    if (wasHost && this.players.length > 0) {
      this.players[0].isHost = true;
      // console.log(`Host migrated to player ${this.players[0].name} (${this.players[0].id}).`);
    }

    // Si la partie était en cours et qu'il ne reste qu'un joueur, terminer proprement la partie
    if (this.status === 'playing' && this.players.length === 1) {
      this._endGame();
    }

    return this.players.length;
  }

  /**
   * Supprime un spectateur de la partie.
   * @param {string} spectatorId - L'ID du spectateur à supprimer.
   */
  removeSpectator(spectatorId) {
    this.spectators = this.spectators.filter(s => s.id !== spectatorId);
    // console.log(`Spectator ${spectatorId} removed. Total spectators: ${this.spectators.length}`);
  }

  /**
   * Démarre la partie, changeant son statut de 'lobby' à 'playing'.
   */
  startGame() {
    if (this.status === 'lobby') {
      this.status = 'playing';

      // Initialize level based on difficulty settings
      const settings = DIFFICULTY_SETTINGS[this.difficulty];
      this.level = settings.startLevel;
      this.linesToNextLevel = settings.linesPerLevel;
      this.winner = null;
      this.lastResult = null;

      // Reset the master sequence so a new round has a fresh piece stream
      this.masterPieceSequence = [];
      this._generateNewBag();
      this._generateNewBag();

      // console.log(`Game has started! Mode: ${this.gameMode}, Difficulty: ${this.difficulty}, Start Level: ${this.level}`);

      // Assign the first piece to every player
      this.players.forEach(player => {
        // Ensure players start with a clean state for the new round
        player.reset();
        this._assignNewPieceToPlayer(player);
      });
    }
  }
}

export default Game;
