import { reactive } from 'vue';
import { io } from 'socket.io-client';
import { createLogger } from '../../shared/logger.js';

const log = createLogger('socketService');

/**
 * L'état réactif du service, accessible par toute l'application.
 */
export const state = reactive({
  isConnected: false,
  socketId: null,
});

// L'instance unique du socket, non exportée pour forcer l'utilisation de l'API du service.
const socket = io({
  // Désactive la connexion automatique pour la contrôler manuellement
  autoConnect: false,
});

// Les écouteurs fondamentaux qui mettent à jour l'état réactif.
socket.on('connect', () => {
  log(`Connected with ID ${socket.id}`);
  state.isConnected = true;
  state.socketId = socket.id;
});

socket.on('disconnect', () => {
  log('Disconnected');
  state.isConnected = false;
  state.socketId = null;
});

/**
 * L'API publique du service. C'est le seul moyen pour le reste de l'application
 * d'interagir avec le socket.
 */
export const socketService = {
  connect() {
    if (!socket.connected) {
      socket.connect();
    }
  },

  disconnect() {
    if (socket.connected) {
      socket.disconnect();
    }
  },

  /**
   * Méthode générique pour émettre un événement vers le serveur.
   * @param {string} event Le nom de l'événement.
   * @param {Object} payload Les données à envoyer.
   */
  emit(event, payload) {
    socket.emit(event, payload);
  },

  /**
   * Méthode générique pour écouter un événement venant du serveur.
   * @param {string} event Le nom de l'événement.
   * @param {Function} callback La fonction à exécuter à la réception.
   */
  on(event, callback) {
    socket.on(event, callback);
  },

  /**
   * Méthode générique pour écouter un événement venant du serveur une seule fois.
   * @param {string} event Le nom de l'événement.
   * @param {Function} callback La fonction à exécuter à la réception.
   */
  once(event, callback) {
    socket.once(event, callback);
  }
};
