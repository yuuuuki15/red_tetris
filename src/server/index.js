import http from 'http'
import express from 'express'
import { Server } from 'socket.io'
import Game from './models/Game.js'
import { SERVER_TICK_RATE_MS } from '../shared/constants.js'
import { createLogger } from '../shared/logger.js'
import path from 'path'
import { fileURLToPath } from 'url'
import { initializeDatabase, getLeaderboard } from './services/databaseService.js'

const logerror = createLogger('tetris:error')
const loginfo = createLogger('tetris:info')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const LOBBY_ROOM = 'global-lobby';

const activeGames = {};
const gameIntervals = {};

/**
 * Construit et diffuse la liste des parties joignables à tous les clients dans le menu.
 * @param {Server} io L'instance du serveur Socket.io.
 */
const broadcastLobbies = (io) => {
  const joinableLobbies = Object.entries(activeGames)
    .filter(([roomName, game]) => (game.status === 'lobby' || game.status === 'playing' || game.status === 'finished') && game.gameMode !== 'solo')
    .map(([roomName, game]) => ({
      roomName: roomName,
      hostName: game.players[0].name,
      playerCount: game.players.length,
      status: game.status,
    }));

  io.to(LOBBY_ROOM).emit('lobbiesListUpdate', joinableLobbies);
  loginfo('Broadcasted lobbies list to clients in menu.');
};

const initEngine = (io) => {
  io.on('connection', (socket) => {
    loginfo(`Socket connected: ${socket.id}`);

    socket.on('enterLobbyBrowser', () => {
      socket.join(LOBBY_ROOM);
      loginfo(`Socket ${socket.id} entered lobby browser.`);
      // Envoie la liste actuelle dès qu'un utilisateur ouvre le menu
      const joinableLobbies = Object.entries(activeGames)
        .filter(([roomName, game]) => (game.status === 'lobby' || game.status === 'playing' || game.status === 'finished') && game.gameMode !== 'solo')
        .map(([roomName, game]) => ({
          roomName: roomName,
          hostName: game.players[0].name,
          playerCount: game.players.length,
          status: game.status,
        }));
      socket.emit('lobbiesListUpdate', joinableLobbies);
    });

    socket.on('leaveLobbyBrowser', () => {
      socket.leave(LOBBY_ROOM);
      loginfo(`Socket ${socket.id} left lobby browser.`);
    });

    socket.on('getLeaderboard', async () => {
      loginfo(`Socket ${socket.id} requested leaderboard.`);
      const leaderboardData = await getLeaderboard();
      socket.emit('leaderboardUpdate', leaderboardData);
    });

    socket.on('joinGame', ({ roomName, playerName, isSpectator, difficulty }) => {
      // If the socket is already in a room, handle the leave process first.
      if (socket.data.roomName && socket.data.roomName !== roomName) {
        loginfo(`Socket ${socket.id} is switching rooms. Leaving '${socket.data.roomName}' first.`);
        handleParticipantLeave(socket);
      }

      loginfo(`User ${playerName} (${socket.id}) trying to join room '${roomName}' as ${isSpectator ? 'spectator' : 'player'} with difficulty '${difficulty}'`);
      socket.join(roomName);
      socket.data.roomName = roomName;

      let game = activeGames[roomName];

      if (isSpectator) {
        if (game) {
          game.addSpectator({ id: socket.id, name: playerName });
        } else {
          // Ne peut pas spectate une partie qui n'existe pas
          socket.emit('error', { message: 'Cette partie n\'existe pas.' });
          socket.leave(roomName);
          return;
        }
      } else {
        // Logique pour les joueurs
        if (!game) {
          loginfo(`Creating new game in room '${roomName}' for host ${playerName}`);
          const hostInfo = { id: socket.id, name: playerName };
          const gameMode = roomName.startsWith('solo-') ? 'solo' : 'multiplayer';
          const gameOptions = { difficulty: difficulty || 'normal' }; // Fallback serveur
          game = new Game(hostInfo, gameMode, gameOptions);
          activeGames[roomName] = game;
        } else {
          loginfo(`Player ${playerName} is joining existing game in room '${roomName}'`);
          const added = game.addPlayer({ id: socket.id, name: playerName });
          if (!added) {
            // The game is full or in progress, so add the user as a spectator instead.
            loginfo(`Game full/playing. Adding ${playerName} as spectator to room '${roomName}'`);
            game.addSpectator({ id: socket.id, name: playerName });
          }
        }
      }

      io.to(roomName).emit('gameStateUpdate', game.getCurrentGameState());
      broadcastLobbies(io);
    });

    socket.on('startGame', () => {
      const roomName = socket.data.roomName;
      const game = activeGames[roomName];
      // Check if the game can start (host + more than one player in multiplayer)
      const canStart = game.gameMode === 'solo' || (game.players.length > 1);

      if (game && game.players[0].id === socket.id && canStart) { // Vérifie si le joueur est l'hôte
        // Prevent the game from being started multiple times
        if (game.status !== 'lobby' || gameIntervals[roomName]) {
          loginfo(`Attempted to start an already running game in room '${roomName}'. Ignoring.`);
          return;
        }

        loginfo(`Host ${socket.id} is starting the game in room '${roomName}'`);
        game.startGame();

        // Démarre la boucle de jeu UNIQUEMENT lorsque la partie commence.
        const intervalId = setInterval(() => {
          const newState = game.tick();
          io.to(roomName).emit('gameStateUpdate', newState);

          // Stop the loop whenever the game is no longer in playing state
          if (newState.status !== 'playing') {
            loginfo(`Game in room '${roomName}' is no longer playing. Stopping game loop.`);
            clearInterval(gameIntervals[roomName]);
            delete gameIntervals[roomName]; // Clean up the interval ID
            // Update the lobby browser so users see this room as joinable again
            broadcastLobbies(io);
          }
        }, SERVER_TICK_RATE_MS);
        gameIntervals[roomName] = intervalId;

        io.to(roomName).emit('gameStateUpdate', game.getCurrentGameState());
        // Met à jour la liste des lobbies car cette partie n'est plus joignable
        broadcastLobbies(io);
      }
    });

    socket.on('restartGame', () => {
      const roomName = socket.data.roomName;
      const game = activeGames[roomName];
      // Only the host can restart, and only if there are enough players in multiplayer
      const canRestart = game.gameMode === 'solo' || (game.players.length > 1);

      if (game && game.players.find(p => p.id === socket.id)?.isHost && canRestart) {
        loginfo(`Host ${socket.id} is restarting the game in room '${roomName}'`);
        game.restart();

        // Start a new game loop for the restarted game
        const newIntervalId = setInterval(() => {
          const newState = game.tick();
          io.to(roomName).emit('gameStateUpdate', newState);

          if (newState.status === 'finished') {
            loginfo(`Game in room '${roomName}' has finished after restart. Stopping game loop.`);
            clearInterval(gameIntervals[roomName]);
            delete gameIntervals[roomName];
          }
        }, SERVER_TICK_RATE_MS);
        gameIntervals[roomName] = newIntervalId;

        io.to(roomName).emit('gameStateUpdate', game.getCurrentGameState());
      }
    });

    socket.on('playerAction', (action) => {
      const roomName = socket.data.roomName;
      const game = activeGames[roomName];
      if (game) {
        loginfo(`Action '${action}' from ${socket.id} in room '${roomName}'`);
        const newState = game.handlePlayerAction(socket.id, action);
        // Immediately broadcast the new state after a player action for responsiveness.
        io.to(roomName).emit('gameStateUpdate', newState);
      }
    });

    /**
     * Gère la logique de départ d'un participant (joueur ou spectateur).
     * @param {import('socket.io').Socket} socket Le socket du participant qui part.
     */
    const handleParticipantLeave = (socket) => {
      const roomName = socket.data.roomName;
      if (!roomName) return;

      // Make the socket leave the Socket.IO room to stop receiving broadcasts.
      socket.leave(roomName);
      loginfo(`Socket ${socket.id} has left Socket.IO room '${roomName}'`);

      const game = activeGames[roomName];
      if (!game) return;

      const initialPlayerCount = game.players.length;
      const playersLeft = game.removePlayer(socket.id);

      if (playersLeft < initialPlayerCount) {
        // Un joueur a été retiré
        if (playersLeft === 0) {
          loginfo(`Room '${roomName}' is empty. Stopping game loop and deleting game.`);
          clearInterval(gameIntervals[roomName]);
          delete gameIntervals[roomName];
          delete activeGames[roomName];
        } else {
          io.to(roomName).emit('gameStateUpdate', game.getCurrentGameState());
        }
      } else {
        // Aucun joueur n'a été retiré, c'était donc un spectateur
        game.removeSpectator(socket.id);
        io.to(roomName).emit('gameStateUpdate', game.getCurrentGameState());
      }

      broadcastLobbies(io);
    };

    socket.on('leaveGame', () => {
      loginfo(`Participant ${socket.id} is leaving the game via button.`);
      handleParticipantLeave(socket);
      // Oublie la room pour ce socket pour éviter une double action à la déconnexion
      socket.data.roomName = null;
    });

    socket.on('disconnect', () => {
      loginfo(`Socket disconnected: ${socket.id}`);
      handleParticipantLeave(socket);
    });
  });
};

export const start = (params) => {
  return new Promise(async (resolve, reject) => {
    // Initialise la base de données avant toute chose
    await initializeDatabase();

    const app = express()
    const server = http.createServer(app)
    const io = new Server(server, {
      cors: {
        origin: '*', // Adjust for production
        methods: ['GET', 'POST'],
      },
    })

    initEngine(io)

    // Serve static files from the Vite build output in production
    if (process.env.NODE_ENV === 'production') {
      const clientBuildPath = path.join(__dirname, '../../dist')
      app.use(express.static(clientBuildPath))
      app.get('*', (req, res) => {
        res.sendFile(path.join(clientBuildPath, 'index.html'))
      })
    }

    server.listen(params.port, params.host, () => {
      loginfo(`Server listening on ${params.url}`)

      const stop = (cb) => {
        io.close()
        server.close(() => {
          server.unref()
          loginfo('Server stopped.')
          if (cb) cb()
        })
      }

      resolve({ stop })
    }).on('error', (err) => {
      logerror(err)
      reject(err)
    })
  })
}
