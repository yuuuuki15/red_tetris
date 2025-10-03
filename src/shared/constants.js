// Ce fichier contient les constantes de jeu partagées entre le client et le serveur.
// Il garantit que la logique de jeu et l'affichage sont basés sur les mêmes règles.

export const BOARD_WIDTH = 10; // Nombre de colonnes
export const BOARD_HEIGHT = 20; // Nombre de lignes

export const SERVER_TICK_RATE_MS = 50; // Server update rate (20 FPS)
export const PIECE_FALL_RATE_MS = 1000; // Time it takes for a piece to fall one step

// Représentation d'une cellule vide
export const CELL_EMPTY = 0;
export const PENALTY_CELL = -1; // Represents an indestructible penalty block

// Identifiants de Tetriminos partagés (client/serveur)
export const TETROMINO_IDS = {
  I: 1,
  O: 2,
  T: 3,
  S: 4,
  Z: 5,
  J: 6,
  L: 7,
};

export const ID_TO_TETROMINO = {
  1: 'I',
  2: 'O',
  3: 'T',
  4: 'S',
  5: 'Z',
  6: 'J',
  7: 'L',
};

// Couleurs par type (inspiré des conventions Tetris)
export const TETROMINO_COLORS = {
  I: 'rgb(0, 255, 255)', // Cyan
  O: 'rgb(255, 255, 0)', // Yellow
  T: 'rgb(128, 0, 128)', // Purple
  S: 'rgb(0, 255, 0)', // Green
  Z: 'rgb(255, 0, 0)', // Red
  J: 'rgb(0, 0, 255)', // Blue
  L: 'rgb(255, 165, 0)', // Orange
};

export const PENALTY_COLOR = 'rgb(102, 102, 102)'; // Gray for penalty lines
export const FRAME_COLOR = 'rgb(120, 120, 120)'; // Gray for frame

// Scoring system
// https://tetris.wiki/Scoring
export const SCORES = {
  SINGLE: 40,
  DOUBLE: 100,
  TRIPLE: 300,
  TETRIS: 1200,
  SOFT_DROP: 1, // Points per cell
  HARD_DROP: 2, // Points per cell
};

// Taille minimale d'un carré (pour le rendu responsive)
export const MIN_TILE_PX = 12;
export const MAX_TILE_PX = 32;

// Game difficulty settings
export const DIFFICULTY_SETTINGS = {
  normal: { startLevel: 1, linesPerLevel: 5 },
  fast: { startLevel: 8, linesPerLevel: 5 },
  hardcore: { startLevel: 15, linesPerLevel: 5 },
};
