// @src/client/services/audioService.js

import { createLogger } from '../../shared/logger.js';

const log = createLogger('audioService');
const logWarn = createLogger('audioService:warn');

// Importation des fichiers sonores. Vite gère les chemins.
import moveSoundSrc from '../assets/sounds/move.mp3';
import rotateSoundSrc from '../assets/sounds/rotate.mp3';
import hardDropSoundSrc from '../assets/sounds/hard-drop.mp3';
import lineClearSoundSrc from '../assets/sounds/line-clear.mp3';
import gameOverSoundSrc from '../assets/sounds/game-over.mp3';

// Un objet pour contenir les instances Audio
const sounds = {};

/**
 * Méthode interne pour jouer un son.
 * Réinitialise le temps du son pour permettre des lectures rapides et successives.
 * @param {HTMLAudioElement} sound L'objet audio à jouer.
 */
function _playSound(sound) {
  if (sound) {
    sound.currentTime = 0;
    sound.play().catch(error => {
      // La lecture automatique a été bloquée par le navigateur.
      // C'est normal avant la première interaction de l'utilisateur.
      logWarn('La lecture du son a été empêchée :', error.message);
    });
  }
}

/**
 * Initialise le service en créant et chargeant les éléments audio.
 * Doit être appelée une seule fois au démarrage de l'application.
 */
export function init() {
  log('Initializing Audio Service...');
  sounds.move = new Audio(moveSoundSrc);
  sounds.rotate = new Audio(rotateSoundSrc);
  sounds.hardDrop = new Audio(hardDropSoundSrc);
  sounds.lineClear = new Audio(lineClearSoundSrc);
  sounds.gameOver = new Audio(gameOverSoundSrc);

  // Optionnel : Régler des propriétés globales comme le volume
  Object.values(sounds).forEach(sound => {
    sound.volume = 0.4; // Volume à 40%
  });
}

export function playMove() {
  _playSound(sounds.move);
}

export function playRotate() {
  _playSound(sounds.rotate);
}

export function playHardDrop() {
  _playSound(sounds.hardDrop);
}

export function playLineClear() {
  _playSound(sounds.lineClear);
}

export function playGameOver() {
  _playSound(sounds.gameOver);
}
