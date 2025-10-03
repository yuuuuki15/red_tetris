// @src/shared/logger.js

import debug from 'debug';

// Ce flag est utilisé pour détecter si nous sommes dans un environnement Node.js.
const isServer = typeof window === 'undefined';

/**
 * Crée une instance de logger avec un namespace spécifique.
 * Le comportement du logger s'adapte automatiquement à l'environnement (client/serveur)
 * et au mode (développement/production).
 *
 * @param {string} namespace - Le nom du module ou du contexte pour le logger (ex: 'gameStore', 'tetris:info').
 * @returns {Function} Une fonction de logging prête à l'emploi.
 */
export function createLogger(namespace) {
  if (isServer) {
    return debug(namespace);

  } else {
    if (import.meta.env.DEV) {
      return console.log.bind(
        console,
        `%c[${namespace}]`,
        'color: #71717a; font-weight: bold;'
      );
    } else {
      return () => {};
    }
  }
}
