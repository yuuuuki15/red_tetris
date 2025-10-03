<script setup>
import { onMounted } from 'vue';
import { useGameStore } from './stores/gameStore';
import { init as initAudioService } from './services/audioService';

// Le composant App.vue est la "coquille" principale de l'application.
// C'est le meilleur endroit pour initialiser des services globaux comme le store de jeu.

const gameStore = useGameStore();

// onMounted est appelé une seule fois lorsque le composant App est créé.
// C'est le moment idéal pour établir la connexion socket qui persistera
// pendant toute la durée de vie de l'application.
onMounted(() => {
  gameStore.initializeStore();
  initAudioService();
});
</script>

<template>
  <div id="main-container">
    <header>
      <h1>Red Tetris</h1>
    </header>
    <main>
      <router-view />
    </main>
  </div>
</template>

<style>
/* --- Styles Globaux --- */
@import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');

:root {
  --background-color: #1a1a1a;
  --background-color-card: #2c2c2c;
  --text-color: #e0e0e0;
  --primary-color: #FFD700; /* Jaune doré arcade */
  --border-color: #444;
  --red-pelican: #c0392b;
  --grid-color: rgba(0, 255, 255, 0.1); /* Cyan très subtil */
}

/* --- Animation pour la grille 2D --- */
@keyframes scroll-background {
  from { background-position: 0 0; }
  to { background-position: -50px -50px; } /* Défilement diagonal */
}

body {
  font-family: 'VT323', monospace;
  font-size: 20px;
  background-color: var(--background-color);
  color: var(--text-color);
  margin: 0;
  padding: 0;
  -webkit-font-smoothing: none;
  -moz-osx-font-smoothing: grayscale;
  image-rendering: pixelated;

  /* La nouvelle grille 2D appliquée à tout le corps de la page */
  background-image:
    repeating-linear-gradient(to right, var(--grid-color), var(--grid-color) 1px, transparent 1px, transparent 50px),
    repeating-linear-gradient(to bottom, var(--grid-color), var(--grid-color) 1px, transparent 1px, transparent 50px);
  background-size: 50px 50px;
  animation: scroll-background 5s linear infinite;
}

#main-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  position: relative; /* Gardé pour la robustesse du layout, mais sans 3D */
}

header {
  text-align: center;
  margin-bottom: 20px;
}

h1, h2, h3, h4, h5, h6 {
  color: var(--primary-color);
  letter-spacing: 2px;
  text-transform: uppercase;
}

h1 {
  color: var(--red-pelican);
  font-size: 3em;
  text-shadow: 4px 4px 0px #000;
}
</style>
