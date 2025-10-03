import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useGameStore } from './gameStore.js';

// --- Mocking Dependencies ---
// Nous simulons le socketService pour isoler le store de la couche réseau.
// 'vi.mock' intercepte toutes les importations de ce module et les remplace
// par notre objet factice.
vi.mock('../services/socketService.js', () => ({
  socketService: {
    emit: vi.fn(), // 'vi.fn()' crée un "espion" qui nous permet de vérifier les appels.
    on: vi.fn(),
    once: vi.fn(),
    connect: vi.fn(),
  },
  // Nous devons aussi mocker l'état réactif exporté par le service.
  state: {
    isConnected: false,
    socketId: null,
  },
}));

// Mock audio service to validate event-driven sounds
vi.mock('../services/audioService.js', () => ({
  playMove: vi.fn(),
  playRotate: vi.fn(),
  playHardDrop: vi.fn(),
  playLineClear: vi.fn(),
  playGameOver: vi.fn(),
}));

// On importe le service mocké APRES la configuration du mock.
import { socketService, state as socketState } from '../services/socketService.js';
import * as audioService from '../services/audioService.js';

describe('Game Store', () => {

  // 'beforeEach' s'exécute avant chaque test ('it').
  beforeEach(() => {
    // 1. Crée une nouvelle instance de Pinia pour garantir l'isolation des tests.
    setActivePinia(createPinia());

    // 2. Réinitialise l'état du mock et l'historique des appels entre les tests.
    vi.clearAllMocks();
    socketState.isConnected = false;
    socketState.socketId = null;

    // 3. Assure que l'état interne du store est propre pour chaque test
    const store = useGameStore();
    if (store.listenersRegistered) {
      store.listenersRegistered.value = false;
    }
  });

  describe('Getters', () => {
    it('`currentPlayer` should return the correct player object based on socketId', () => {
      // Arrange: Prépare l'état initial
      const store = useGameStore();
      const mockGameState = {
        status: 'playing',
        players: [
          { id: 'socket1', name: 'Player 1' },
          { id: 'socket2', name: 'Player 2' },
        ],
      };
      socketState.socketId = 'socket2'; // Simule que notre client est le Joueur 2
      store.gameState = mockGameState; // Définit l'état du jeu manuellement

      // Act & Assert: Exécute la logique et vérifie le résultat
      expect(store.currentPlayer).toBeDefined();
      expect(store.currentPlayer.name).toBe('Player 2');
    });

    it('`currentPlayer` should return null if gameState is not set', () => {
      // Arrange
      const store = useGameStore();
      socketState.socketId = 'socket1';
      store.gameState = null;

      // Act & Assert
      expect(store.currentPlayer).toBeNull();
    });

    it('`board` should return the board of the current player', () => {
        const store = useGameStore();
        const mockBoard = [[0, 0], [1, 1]];
        store.gameState = {
            players: [{ id: 'socket1', board: mockBoard }]
        };
        socketState.socketId = 'socket1';

        expect(store.board).toEqual(mockBoard);
    });

    it('`board` should return an empty array if there is no current player', () => {
        const store = useGameStore();
        store.gameState = { players: [] };
        socketState.socketId = 'socket1';

        expect(store.board).toEqual([]);
    });

    it('additional getters should reflect gameState correctly', () => {
      const store = useGameStore();
      // default without gameState
      expect(store.gameStatus).toBe('disconnected');
      expect(store.activePiece).toBeNull();
      expect(store.playerList).toEqual([]);
      expect(store.gameWinner).toBeNull();
      expect(store.gameMode).toBe('multiplayer');
      expect(store.isCurrentUserHost).toBe(false);
      expect(store.isCurrentUserSpectator).toBe(false);

      // with gameState
      store.gameState = {
        status: 'playing',
        gameMode: 'solo',
        winner: 'Alice',
        players: [
          { id: 'me', isHost: true, activePiece: { type: 'T', shape: [[1]], position: { x: 0, y: 0 } }, board: [[0]] },
          { id: 'p2', isHost: false, board: [[0]] },
        ],
        spectators: [{ id: 'spec' }],
      };
      socketState.socketId = 'me';

      expect(store.gameStatus).toBe('playing');
      expect(store.activePiece).toEqual({ type: 'T', shape: [[1]], position: { x: 0, y: 0 } });
      expect(store.playerList.length).toBe(2);
      expect(store.gameWinner).toBe('Alice');
      expect(store.gameMode).toBe('solo');
      expect(store.isCurrentUserHost).toBe(true);
      // Set spectator to current user
      store.gameState.spectators = [{ id: 'me' }];
      expect(store.isCurrentUserSpectator).toBe(true);
    });
  });

  describe('Actions', () => {
    it('`sendPlayerAction` should emit a "playerAction" event via socketService', () => {
      // Arrange
      const store = useGameStore();
      socketState.isConnected = true; // Simule une connexion active

      // Act
      store.sendPlayerAction('rotate');

      // Assert
      expect(socketService.emit).toHaveBeenCalledTimes(1);
      expect(socketService.emit).toHaveBeenCalledWith('playerAction', 'rotate');
    });

    it('`sendPlayerAction` should not emit if the socket is not connected', () => {
      // Arrange
      const store = useGameStore();
      socketState.isConnected = false; // Simule une connexion inactive

      // Act
      store.sendPlayerAction('moveLeft');

      // Assert
      expect(socketService.emit).not.toHaveBeenCalled();
    });

    it('`connectAndJoin` should emit "joinGame" if already connected', () => {
      // Arrange
      const store = useGameStore();
      socketState.isConnected = true;
      const roomName = 'testRoom';
      const playerName = 'Tester';

      // Act
      store.connectAndJoin(roomName, playerName);

      // Assert
      expect(socketService.emit).toHaveBeenCalledTimes(1);
      expect(socketService.emit).toHaveBeenCalledWith('joinGame', { roomName, playerName, isSpectator: false , difficulty: 'normal'});
    });

    it('`connectAndJoin` should register a "once connect" listener if not connected', () => {
      // Arrange
      const store = useGameStore();
      socketState.isConnected = false;
      const roomName = 'testRoom';
      const playerName = 'Tester';

      // Act
      store.connectAndJoin(roomName, playerName);

      // Assert
      expect(socketService.emit).not.toHaveBeenCalled();
      expect(socketService.once).toHaveBeenCalledTimes(1);
      expect(socketService.once).toHaveBeenCalledWith('connect', expect.any(Function));
    });

    it('`sendStartGame` should emit "startGame" when connected', () => {
      const store = useGameStore();
      socketState.isConnected = true;
      store.sendStartGame();
      expect(socketService.emit).toHaveBeenCalledWith('startGame');
    });

    it('`sendStartGame` should not emit when not connected', () => {
      const store = useGameStore();
      socketState.isConnected = false;
      store.sendStartGame();
      expect(socketService.emit).not.toHaveBeenCalled();
    });

    it('`sendRestartGame` should emit "restartGame" when connected', () => {
      const store = useGameStore();
      socketState.isConnected = true;
      store.sendRestartGame();
      expect(socketService.emit).toHaveBeenCalledWith('restartGame');
    });

    it('`leaveGame` should emit "leaveGame" and reset state', () => {
      const store = useGameStore();
      store.gameState = { status: 'playing' }; // Set some initial state
      socketState.isConnected = true;

      store.leaveGame();

      expect(socketService.emit).toHaveBeenCalledWith('leaveGame');
      expect(store.gameState).toBeNull();
    });

    it('`initializeStore` should call connect and register listeners', () => {
      const store = useGameStore();
      store.initializeStore();
      expect(socketService.connect).toHaveBeenCalledTimes(1);
      expect(socketService.on).toHaveBeenCalledWith('gameStateUpdate', expect.any(Function));
    });

    it('`initializeStore` should early return if already initialized', () => {
      const store = useGameStore();
      
      // 1. Appeler une première fois pour simuler l'état "déjà initialisé".
      store.initializeStore();
      
      // 2. Vider l'historique de l'espion après le premier appel.
      socketService.connect.mockClear();
      
      // 3. Appeler une seconde fois.
      store.initializeStore();
      
      // 4. Vérifier que le service n'a PAS été appelé cette seconde fois.
      expect(socketService.connect).not.toHaveBeenCalled();
    });

    it('`enterLobbyBrowser` should emit when connected', () => {
      const store = useGameStore();
      socketState.isConnected = true;
      store.enterLobbyBrowser();
      expect(socketService.emit).toHaveBeenCalledWith('enterLobbyBrowser');
    });

    it('`enterLobbyBrowser` should wait for connect if not connected', () => {
      const store = useGameStore();
      socketState.isConnected = false;
      store.enterLobbyBrowser();
      expect(socketService.once).toHaveBeenCalledWith('connect', expect.any(Function));
    });

    it('`leaveLobbyBrowser` should emit leaveLobbyBrowser', () => {
      const store = useGameStore();
      store.leaveLobbyBrowser();
      expect(socketService.emit).toHaveBeenCalledWith('leaveLobbyBrowser');
    });

    it('`fetchLeaderboard` should emit when connected', () => {
      const store = useGameStore();
      socketState.isConnected = true;
      store.fetchLeaderboard();
      expect(socketService.emit).toHaveBeenCalledWith('getLeaderboard');
    });

    it('`fetchLeaderboard` should wait for connect if not connected', () => {
      const store = useGameStore();
      socketState.isConnected = false;
      store.fetchLeaderboard();
      expect(socketService.once).toHaveBeenCalledWith('connect', expect.any(Function));
    });
  });

  describe('registerGameListeners side-effects', () => {
    it('should set gameState and play audio in priority order', () => {
      const store = useGameStore();
      // On appelle l'action publique qui, en interne, enregistre les listeners.
      store.initializeStore();
      // Find the registered callbacks
      const calls = socketService.on.mock.calls;
      const getCb = (event) => calls.find(c => c[0] === event)?.[1];
      const gameStateCb = getCb('gameStateUpdate');
      const lobbiesCb = getCb('lobbiesListUpdate');
      const leaderboardCb = getCb('leaderboardUpdate');

      // 1) Assign state and play move
      gameStateCb({ status: 'playing', players: [], spectators: [], events: ['move'] });
      expect(store.gameState.status).toBe('playing');
      expect(audioService.playMove).toHaveBeenCalled();

      // 2) Priority: gameOver over lineClear
      vi.clearAllMocks();
      gameStateCb({ status: 'finished', players: [], spectators: [], events: ['lineClear', 'gameOver'] });
      expect(audioService.playGameOver).toHaveBeenCalled();
      expect(audioService.playLineClear).not.toHaveBeenCalled();

      // 3) lobbies and leaderboard updates
      lobbiesCb([{ roomName: 'r1', numPlayers: 2, status: 'lobby', hostName: 'h' }]);
      expect(store.lobbies.length).toBe(1);
      leaderboardCb([{ name: 'A', score: 10 }]);
      expect(store.leaderboard.length).toBe(1);
    });
  });
});
