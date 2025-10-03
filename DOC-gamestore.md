# Guide d'Utilisation du Store Pinia (`gameStore`)

Ce document explique comment interagir avec le store Pinia (`gameStore`) depuis n'importe quel composant Vue.js de l'application client. Le store est la **source de vérité unique** pour tout ce qui concerne l'état du jeu et la communication avec le serveur.

**Fichier concerné :** `@src/client/stores/gameStore.js`

## Philosophie

Le `gameStore` a trois responsabilités principales :

1.  **Gérer la connexion `socket.io`** : Il initialise, maintient et nettoie la connexion au serveur. Les composants n'ont jamais à interagir directement avec l'objet `socket`.
2.  **Stocker l'état du jeu** : Il conserve la dernière "photographie" du jeu (`GameState`) envoyée par le serveur.
3.  **Fournir une API simple** : Il expose des `getters` pour lire les données et des `actions` pour envoyer des commandes, masquant ainsi toute la complexité sous-jacente.

---

## Comment Utiliser le Store

Pour utiliser le store dans un composant Vue 3 avec `<script setup>`, il suffit de suivre deux étapes simples.

### 1. Importer et Instancier le Store

Au début de votre `<script setup>`, importez la fonction `useGameStore` et appelez-la pour obtenir une instance du store.

```vue
<script setup>
import { useGameStore } from './stores/gameStore';

// 'gameStore' est maintenant un objet réactif connecté à notre store.
const gameStore = useGameStore();
</script>
```

### 2. Interagir avec le Store

Une fois que vous avez l'instance `gameStore`, vous pouvez accéder à ses `getters` et appeler ses `actions`.

#### A. Lire des Données (avec les Getters)

Les **Getters** sont utilisés pour lire des données de l'état, souvent de manière calculée. Ils sont en lecture seule. C'est la méthode **préférée** pour accéder aux données du jeu.

**Exemple : Afficher le plateau de jeu et l'état de la connexion**

```vue
<script setup>
import { useGameStore } from './stores/gameStore';
import GameBoard from './components/GameBoard.vue';

const gameStore = useGameStore();

// On accède aux getters directement sur l'instance du store.
// Ces valeurs sont réactives : si elles changent dans le store,
// le template se mettra à jour automatiquement.
</script>

<template>
  <div>
    <p v-if="gameStore.isConnected">Connecté au serveur !</p>
    <p v-else>Déconnecté.</p>

    <!--
      On passe les données des getters directement comme props
      à notre composant enfant.
    -->
    <GameBoard
      :board="gameStore.board"
      :active-piece="gameStore.activePiece"
    />
  </div>
</template>```

**Getters disponibles :**

*   `gameStore.currentPlayer` : Renvoie l'objet complet du joueur actuel.
*   `gameStore.board` : Renvoie la grille de jeu (un tableau 2D) du joueur actuel.
*   `gameStore.activePiece` : Renvoie l'objet de la pièce active du joueur actuel.
*   *(On peut en ajouter d'autres au besoin, comme `gameStore.opponents`, `gameStore.isGameOver`, etc.)*

#### B. Envoyer des Commandes (avec les Actions)

Les **Actions** sont utilisées pour déclencher des modifications d'état ou pour communiquer avec le serveur. C'est la **seule** manière de modifier l'état ou d'envoyer des événements.

**Exemple : Envoyer une action de jeu et démarrer la partie**

```vue
<script setup>
import { useGameStore } from './stores/gameStore';

const gameStore = useGameStore();

// Cette fonction est appelée par un @click sur un bouton, par exemple.
function handlePlayerAction(actionType) {
  // On appelle l'action 'sendPlayerAction' du store.
  // Le store s'occupe d'émettre l'événement socket.
  gameStore.sendPlayerAction(actionType);
}
</script>

<template>
  <div>
    <!--
      Quand l'utilisateur clique, on appelle notre méthode
      qui elle-même appelle l'action du store.
    -->
    <button @click="handlePlayerAction('hardDrop')">
      Hard Drop !
    </button>
  </div>
</template>
```

**Actions disponibles :**

*   `gameStore.initializeSocket()` : Doit être appelée une fois au démarrage de l'application (généralement dans `onMounted` du composant racine `App.vue`).
*   `gameStore.disconnectSocket()` : Doit être appelée à la fermeture de l'application (dans `onUnmounted` de `App.vue`).
*   `gameStore.sendPlayerAction(action)` : Envoie une action de jeu (ex: 'moveLeft', 'rotate') au serveur.

---

## Résumé / "Cheat Sheet"

| Pour...                                             | Utiliser...                                             | Type      |
| :-------------------------------------------------- | :------------------------------------------------------ | :-------- |
| Savoir si on est connecté                           | `gameStore.isConnected`                                 | State     |
| Obtenir la grille de jeu du joueur                  | `gameStore.board`                                       | Getter    |
| Obtenir la pièce active du joueur                   | `gameStore.activePiece`                                 | Getter    |
| Se connecter au serveur au démarrage                | `gameStore.initializeSocket()`                          | Action    |
| Envoyer un mouvement de pièce (ex: 'rotate') au serveur | `gameStore.sendPlayerAction('rotate')`                  | Action    |
| Se déconnecter proprement                           | `gameStore.disconnectSocket()`                          | Action    |
