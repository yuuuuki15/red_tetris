// write_to_file: @src/server/services/databaseService.js
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { createLogger } from '../../shared/logger.js';

const loginfo = createLogger('tetris:info');
const logerror = createLogger('tetris:error');

// Le chemin vers le fichier de la base de données.
// Il sera créé dans le répertoire racine du projet.
const DB_PATH = path.join(process.cwd(), 'leaderboard.db');

let db = null;

/**
 * Initialise la connexion à la base de données et crée la table si elle n'existe pas.
 * Cette fonction doit être appelée au démarrage du serveur.
 */
export async function initializeDatabase() {
  try {
    db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });

    await db.exec(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        score INTEGER NOT NULL,
        difficulty TEXT DEFAULT 'normal',
        date DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    loginfo('Database initialized successfully.');
  } catch (err) {
    logerror('Failed to initialize database:', err);
    process.exit(1); // Arrête le serveur si la DB ne peut pas être initialisée
  }
}

/**
 * Ajoute un score au leaderboard.
 * @param {{name: string, score: number, difficulty: string}} entry - L'entrée de score à ajouter.
 */
export async function addScore({ name, score, difficulty }) {
  if (!db) {
    logerror('Database not initialized. Cannot add score.');
    return;
  }
  // On n'enregistre que les scores supérieurs à 0
  if (score <= 0) return;

  try {
    await db.run(
      'INSERT INTO leaderboard (name, score, difficulty) VALUES (?, ?, ?)',
      [name, score, difficulty]
    );
    loginfo(`Score of ${score} for ${name} (difficulty: ${difficulty}) added to leaderboard.`);
  } catch (err) {
    logerror('Failed to add score to leaderboard:', err);
  }
}

/**
 * Récupère les meilleurs scores du leaderboard.
 * Le score est pondéré par la difficulté pour le classement.
 * @param {number} limit - Le nombre de scores à récupérer.
 * @returns {Promise<Array<{name: string, score: number, difficulty: string, date: string, weightedScore: number}>>}
 */
export async function getLeaderboard(limit = 10) {
  if (!db) {
    logerror('Database not initialized. Cannot get leaderboard.');
    return [];
  }
  try {
    const results = await db.all(`
      SELECT
        name,
        score,
        difficulty,
        date,
        CAST(score *
          CASE difficulty
            WHEN 'hardcore' THEN 2
            WHEN 'fast' THEN 1.5
            ELSE 1
          END
        AS INTEGER) AS weightedScore
      FROM leaderboard
      ORDER BY weightedScore DESC
      LIMIT ?
    `, [limit]);
    return results;
  } catch (err) {
    logerror('Failed to get leaderboard:', err);
    return [];
  }
}
