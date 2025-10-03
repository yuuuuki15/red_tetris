import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { socketService, state as socketState } from '../services/socketService.js';
import * as audioService from '../services/audioService.js';
import { createLogger } from '../../shared/logger.js';

const log = createLogger('gameStore');
const logWarn = createLogger('gameStore:warn');

export const useGameStore = defineStore('game', () => {
  // --- STATE ---
  // L'objet GameState reçu du serveur, conforme au Contrat n°2
  const gameState = ref(null);
  // La liste des lobbies joignables
  const lobbies = ref([]);
  // Le classement des meilleurs scores
  const leaderboard = ref([]);
  // Drapeau pour s'assurer que les écouteurs ne sont enregistrés qu'une fois
  const listenersRegistered = ref(false);

  // --- GETTERS ---
  // Renvoie l'état du joueur actuel en se basant sur le socketId du service
  const currentPlayer = computed(() => {
    if (!gameState.value || !socketState.socketId) return null;
    return gameState.value.players.find(p => p.id === socketState.socketId);
  });

  // Renvoie le plateau de jeu du joueur actuel
  const board = computed(() => currentPlayer.value?.board || []);

  // Renvoie la pièce active du joueur actuel
  const activePiece = computed(() => currentPlayer.value?.activePiece || null);

  // Renvoie la liste des prochaines pièces pour le joueur actuel
  const nextPieces = computed(() => currentPlayer.value?.nextPieces || []);

  // Renvoie le statut global de la partie
  const gameStatus = computed(() => gameState.value?.status || 'disconnected');

  // Vérifie si le joueur actuel est l'hôte de la partie
  const isCurrentUserHost = computed(() => currentPlayer.value?.isHost || false);

  // Renvoie la liste de tous les joueurs dans la partie
  const playerList = computed(() => gameState.value?.players || []);

  // Returns the current game mode ('solo' or 'multiplayer')
  const gameMode = computed(() => gameState.value?.gameMode || 'multiplayer');

  // Renvoie le nom du gagnant si la partie est terminée
  const gameWinner = computed(() => gameState.value?.winner || null);

  // Renvoie la liste des spectateurs
  const spectatorList = computed(() => gameState.value?.spectators || []);

  // Vérifie si l'utilisateur actuel est un spectateur
  const isCurrentUserSpectator = computed(() => {
    if (!gameState.value || !socketState.socketId) return false;
    return gameState.value.spectators.some(s => s.id === socketState.socketId);
  });


  // --- ACTIONS ---

  /**
   * S'abonne aux événements du jeu via le socketService.
   * Cette méthode est idempotent et peut être appelée plusieurs fois sans risque.
   */
  function registerGameListeners() {
    // Garde pour s'assurer que les écouteurs ne sont enregistrés qu'une seule fois.
    if (listenersRegistered.value) return;

    // Met en place les écouteurs pour les événements spécifiques au jeu.
    socketService.on('gameStateUpdate', (newState) => {
      gameState.value = newState;

      // --- Nouvelle Logique de Sons (Pilotée par le Serveur) ---
      if (!newState.events || newState.events.length === 0) {
        return; // Pas d'événements à traiter
      }

      const events = newState.events;

      // On traite les événements par ordre de priorité pour éviter les superpositions indésirables.
      if (events.includes('gameOver')) {
        audioService.playGameOver();
      } else if (events.includes('lineClear')) {
        audioService.playLineClear();
      } else if (events.includes('hardDrop')) {
        audioService.playHardDrop();
      } else if (events.includes('pieceLock')) {
        // Le son de verrouillage est le même que le hard drop
        audioService.playHardDrop();
      } else if (events.includes('rotate')) {
        audioService.playRotate();
      } else if (events.includes('move')) {
        audioService.playMove();
      }
    });

    // Écouteur pour la mise à jour de la liste des lobbies
    socketService.on('lobbiesListUpdate', (lobbiesList) => {
      lobbies.value = lobbiesList;
    });

    // Écouteur pour la mise à jour du leaderboard
    socketService.on('leaderboardUpdate', (leaderboardData) => {
      leaderboard.value = leaderboardData;
    });

    listenersRegistered.value = true;
    log('Listeners registered.');
  }

  /**
   * Crée la connexion initiale au serveur et enregistre les écouteurs globaux.
   * Cette action est conçue pour être appelée une seule fois au démarrage de l'application.
   */
  function initializeStore() {
    if (socketState.isConnected || listenersRegistered.value) {
      log('Store already initialized.');
      return;
    }
    log('Initializing GameStore: Connecting and registering listeners...');
    registerGameListeners();
    socketService.connect();
  }

  /**
   * Emet l'événement pour rejoindre une partie spécifique.
   * Gère le cas où la connexion n'est pas encore établie en attendant l'événement 'connect'.
   * @param {string} roomName Le nom de la partie à rejoindre.
   * @param {string} playerName Le nom du joueur.
   * @param {Object} options - Options de jeu supplémentaires.
   * @param {boolean} options.isSpectator - Si l'utilisateur rejoint en tant que spectateur.
   * @param {string} options.difficulty - La difficulté de départ choisie.
   */
  function connectAndJoin(roomName, playerName, options = {}) {
    const { isSpectator = false, difficulty = 'normal' } = options;
    const joinPayload = { roomName, playerName, isSpectator, difficulty };

    if (socketState.isConnected) {
      log('Already connected, emitting joinGame.');
      socketService.emit('joinGame', joinPayload);
    } else {
      log('Not connected. Queuing joinGame until connect event.');
      socketService.once('connect', () => {
        log('Connect event received, now emitting joinGame.');
        socketService.emit('joinGame', joinPayload);
      });
    }
  }

  /**
   * Envoie une action du joueur au serveur via le service.
   * @param {string} action L'action à envoyer (ex: 'moveLeft').
   */
  function sendPlayerAction(action) {
    if (!socketState.isConnected) {
      logWarn("Impossible d'envoyer l'action : non connecté.");
      return;
    }
    socketService.emit('playerAction', action);
  }

  /**
   * Informe le serveur que l'hôte souhaite démarrer la partie via le service.
   */
  function sendStartGame() {
    if (!socketState.isConnected) {
      logWarn("Impossible de démarrer la partie : non connecté.");
      return;
    }
    socketService.emit('startGame');
  }

  /**
   * Informs the server that the host wants to restart the game.
   */
  function sendRestartGame() {
    if (!socketState.isConnected) {
      logWarn("Cannot restart game: not connected.");
      return;
    }
    socketService.emit('restartGame');
  }

  /**
   * Réinitialise l'état du store à ses valeurs initiales.
   * Remplace la fonctionnalité `this.$reset()` de l'API Options.
   */
  function resetStore() {
    gameState.value = null;
    lobbies.value = [];
    leaderboard.value = [];
    // listenersRegistered est intentionnellement non réinitialisé ici,
    // car les écouteurs globaux doivent persister tant que l'application est en vie.
  }

  /**
   * Informe le serveur que le joueur quitte la partie et nettoie l'état local.
   * La connexion socket reste active.
   */
  function leaveGame() {
    if (socketState.isConnected) {
      socketService.emit('leaveGame');
    }
    // Réinitialise uniquement l'état lié à une partie spécifique.
    gameState.value = null;
  }

  /**
   * Informe le serveur que le client entre dans le navigateur de lobbies.
   * Gère le cas où la connexion n'est pas encore établie en attendant l'événement 'connect'.
   */
  function enterLobbyBrowser() {
    if (socketState.isConnected) {
      log('Already connected, emitting enterLobbyBrowser.');
      socketService.emit('enterLobbyBrowser');
    } else {
      log('Not connected. Queuing enterLobbyBrowser until connect event.');
      socketService.once('connect', () => {
        log('Connect event received, now emitting enterLobbyBrowser.');
        socketService.emit('enterLobbyBrowser');
      });
    }
  }

  /**
   * Informe le serveur que le client quitte le navigateur de lobbies.
   */
  function leaveLobbyBrowser() {
    socketService.emit('leaveLobbyBrowser');
  }

  /**
   * Demande au serveur d'envoyer les données du leaderboard.
   */
  function fetchLeaderboard() {
    if (socketState.isConnected) {
      socketService.emit('getLeaderboard');
    } else {
      socketService.once('connect', () => {
        socketService.emit('getLeaderboard');
      });
    }
  }

  // --- EXPOSITION ---
  // Expose l'état, les getters et les actions pour qu'ils soient utilisables par les composants.
  return {
    // State
    gameState,
    lobbies,
    leaderboard,
    // Getters
    currentPlayer,
    board,
    activePiece,
    nextPieces,
    gameStatus,
    isCurrentUserHost,
    playerList,
    gameMode,
    gameWinner,
    spectatorList,
    isCurrentUserSpectator,
    // Actions
    initializeStore,
    connectAndJoin,
    sendPlayerAction,
    sendStartGame,
    sendRestartGame,
    leaveGame,
    enterLobbyBrowser,
    leaveLobbyBrowser,
    fetchLeaderboard,
  };
});
