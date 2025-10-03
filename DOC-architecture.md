# Red Tetris - Référence de l'Architecture et des Contrats

Ce document sert de référence pour l'architecture de base du projet Red Tetris. Il décrit les "contrats" d'interface entre les différentes parties du système (logique de jeu, serveur réseau, client) et leur implémentation concrète dans le code.

## Philosophie

L'architecture est conçue pour être modulaire et découplée, en suivant une séparation claire des responsabilités :

1.  **Logique de Jeu (Le Cerveau)** : Une "machine" pure qui ne connaît ni `socket.io` ni `Vue.js`. Elle reçoit des commandes et retourne le nouvel état du jeu.
2.  **Couche Réseau (Le Système Nerveux)** : Responsable de la communication entre le client et le serveur. Elle transmet les actions des joueurs à la Logique de Jeu et diffuse l'état du jeu mis à jour à tous les clients.
3.  **Client (L'Affichage et les Contrôles)** : Uniquement responsable de l'affichage des informations reçues du serveur et de la capture des entrées de l'utilisateur.

---

## Contrat n°1 : La "Machine à Tetris" (Serveur)

Ce contrat définit l'API de la logique de jeu principale, encapsulée dans la classe `Game`. C'est le cœur du gameplay.

**Fichiers concernés :**
*   `@src/server/models/Game.js` (La machine elle-même)
*   `@src/server/models/Player.js` (Représente un joueur dans la partie)
*   `@src/server/models/Piece.js` (Représente un tetrimino)

### API de la Classe `Game`

#### `new Game(playerInfoList, pieceSequence)`
-   **Rôle** : Crée et initialise une nouvelle instance de partie.
-   **Paramètres** :
    -   `playerInfoList` (`Array<Object>`): Une liste d'objets décrivant chaque participant (ex: `{ id, name, isHost }`).
    -   `pieceSequence` (`Array<string>`): La séquence de pièces prédéterminée pour garantir que tous les joueurs reçoivent les mêmes tetriminos.
-   **Localisation** : Constructeur de la classe `Game` dans `@src/server/models/Game.js`.

#### `game.tick()`
-   **Rôle** : Fait avancer l'état du jeu d'une unité de temps (ex: la pièce tombe d'une case). Cette méthode est destinée à être appelée à intervalle régulier par la boucle de jeu du serveur.
-   **Retourne** : Un objet `GameState` (voir Contrat n°2) représentant la "photographie" complète et à jour du jeu.
-   **Localisation** : Méthode `tick` sur le prototype de `Game` dans `@src/server/models/Game.js`.

#### `game.handlePlayerAction(playerId, action)`
-   **Rôle** : Traite une action effectuée par un joueur (ex: bouger une pièce).
-   **Paramètres** :
    -   `playerId` (`string`): L'identifiant unique du joueur qui a initié l'action.
    -   `action` (`string`): L'action à effectuer (ex: `'moveLeft'`, `'rotate'`).
-   **Retourne** : Un objet `GameState` (voir Contrat n°2) mis à jour après l'action.
-   **Localisation** : Méthode `handlePlayerAction` sur le prototype de `Game` dans `@src/server/models/Game.js`.

---

## Contrat n°2 : La "Photographie du Jeu" (Structure de Données)

Ce contrat définit la structure de l'objet `GameState`, qui est l'unique source de vérité sur l'état du jeu à un instant T. C'est l'information qui est échangée entre la logique de jeu et le reste du système, et qui est envoyée aux clients.

**Source de Vérité de la Définition :** Les commentaires JSDoc dans `@src/server/models/Game.js`.

### Structure de l'Objet `GameState`

```javascript
/**
 * @typedef {Object} GameState
 * @property {('playing'|'finished')} status - L'état actuel de la partie.
 * @property {string|null} winner - Le nom du gagnant si la partie est terminée.
 * @property {Array<PlayerState>} players - La liste des états de chaque joueur.
 */
```

### Structure de l'Objet `PlayerState`

```javascript
/**
 * @typedef {Object} PlayerState
 * @property {string} id - L'identifiant du joueur.
 * @property {string} name - Le nom du joueur.
 * @property {boolean} hasLost - Si le joueur a perdu.
 * @property {Array<Array<number>>} board - La grille de jeu du joueur.
 * @property {Object} activePiece - La pièce active du joueur.
 * @property {Array<Object>} nextPieces - La liste des 2-3 prochaines pièces.
 */
```

-   **Producteur** : La méthode `getCurrentGameState` dans `@src/server/models/Game.js`.
-   **Consommateurs** :
    1.  La couche réseau du serveur, qui envoie cet objet aux clients via `socket.io`.
    2.  Le store `Pinia` (ou `Redux`) côté client, qui stockera cet état.

---

## Contrat n°3 : Le "Moniteur de Jeu" (Client)

Ce contrat définit l'API du composant Vue `GameBoard.vue`, qui est responsable de l'affichage du jeu et de la capture des entrées utilisateur.

**Fichier concerné :** `@src/client/components/GameBoard.vue`

### API du Composant `GameBoard.vue`

#### Props (Les "Câbles d'Entrée")

Le composant est piloté par son parent (`App.vue` pour l'instant) via les props suivantes :

-   **`board: Array`**
    -   **Rôle** : Reçoit la grille de jeu 2D à afficher.
    -   **Exemple d'utilisation** : `<GameBoard :board="gameState.players[0].board" />`

-   **`activePiece: Object`**
    -   **Rôle** : Reçoit l'objet représentant la pièce en cours de mouvement, avec sa forme et sa position.
    -   **Exemple d'utilisation** : `<GameBoard :active-piece="gameState.players[0].activePiece" />`

#### Emits (Les "Signaux de Sortie")

Le composant ne modifie jamais l'état lui-même. Il notifie son parent des actions de l'utilisateur via un événement.

-   **`@playerAction`**
    -   **Rôle** : Émis lorsqu'une touche de jeu est pressée.
    -   **Payload** : Une chaîne de caractères décrivant l'action (ex: `'moveLeft'`, `'hardDrop'`).
    -   **Exemple d'écoute** : `<GameBoard @player-action="sendActionToServer" />`

Ce découplage est crucial : `GameBoard.vue` ne sait pas ce qui se passe quand l'utilisateur appuie sur une touche ; il se contente de le signaler. C'est le composant parent (`App.vue`) qui est responsable d'envoyer ce signal au serveur.
```