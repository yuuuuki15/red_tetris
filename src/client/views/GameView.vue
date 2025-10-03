<script setup>
import { onMounted, onUnmounted, ref, onBeforeUnmount, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { createLogger } from '../../shared/logger.js';
import { useGameStore } from '../stores/gameStore';
import { state as socketState } from '../services/socketService.js';
import GameBoard from '../components/GameBoard.vue';
import NextPieces from '../components/NextPieces.vue';
import MultiBoardGrid from '../components/MultiBoardGrid.vue';
import BaseButton from '../components/ui/BaseButton.vue';
import BaseCard from '../components/ui/BaseCard.vue';

const log = createLogger('GameView');
const gameStore = useGameStore();
const route = useRoute();
const router = useRouter();

const handlePlayerAction = (action) => {
  gameStore.sendPlayerAction(action);
};

const handleStartGame = () => {
  gameStore.sendStartGame();
};

const handleRestartGame = () => {
  gameStore.sendRestartGame();
};

const handleLeaveGame = () => {
  gameStore.leaveGame();
  router.push('/menu');
};

// --- Result overlay visibility states (players) ---
// Only show to players who actually witnessed the game end locally.
const playerResultOverlayClosed = ref(false);
const showPlayerResultOverlay = ref(false);

function closePlayerResultOverlay() {
  // Close the player result overlay only (spectators have a separate card)
  playerResultOverlayClosed.value = true;
}

function playAgain() {
  gameStore.sendRestartGame();
}

// --- Spectator join controls ---
const isRoomFull = computed(() => (gameStore.playerList?.length || 0) >= 4);

function handleSpectatorJoin() {
  // Guard: prevent joining when room is full
  if (isRoomFull.value) return;

  const roomName = route.params.roomName;
  const playerName = route.params.playerName;
  const difficulty = route.query.difficulty || 'normal';

  // To avoid being registered as both spectator and player on server,
  // leave current participation first, then re-join as a player.
  // Also proactively close the player overlay to prevent it from showing after join.
  playerResultOverlayClosed.value = true;
  showPlayerResultOverlay.value = false;
  gameStore.leaveGame();
  gameStore.connectAndJoin(roomName, playerName, { isSpectator: false, difficulty });
}

// --- Spectator result overlay visibility ---
// Show result overlay ONLY to spectators who witnessed the gameOver event live.
const spectatorOverlayVisible = ref(false);

watch(
  () => gameStore.gameState?.events,
  (events) => {
    if (!events || events.length === 0) return;
    if (gameStore.isCurrentUserSpectator && events.includes('gameOver')) {
      spectatorOverlayVisible.value = true;
    }
  }
);

// Reset spectator overlay when leaving or when a new game starts
watch(
  () => gameStore.gameStatus,
  (status) => {
    if (status === 'playing') {
      spectatorOverlayVisible.value = false;
    }
  }
);

// --- Auto-start logic for solo games ---
let stopWatchingHost = null;
if (route.query.solo === 'true') {
  // Watch for the player to become the host, then start the game automatically.
  stopWatchingHost = watch(
    () => gameStore.isCurrentUserHost,
    (isHost) => {
      if (isHost) {
        log('Auto-starting solo game...');
        gameStore.sendStartGame();
        if (stopWatchingHost) stopWatchingHost(); // Stop watching once the job is done.
      }
    }
  );
}
// -----------------------------------------

// --- DEBUG WATCHER for Spectator Mode ---
watch(
  () => [gameStore.gameStatus, gameStore.isCurrentUserSpectator],
  ([status, isSpectator]) => {
    log(`[Spectator Debug] Status: ${status}, IsSpectator: ${isSpectator}`);
  }
);
// ----------------------------------------

// onMounted s'exécute une seule fois lorsque le composant est monté.
// C'est le moment idéal pour rejoindre la partie, car la connexion
// globale est déjà gérée par App.vue.
onMounted(() => {
  const { roomName, playerName } = route.params;
  const isSpectator = route.query.spectate === 'true';
  const difficulty = route.query.difficulty || 'normal'; // Fallback à 'normal' si absent

  if (roomName && playerName) {
    log(`Joining game '${roomName}' as '${playerName}' (Spectator: ${isSpectator}, Difficulty: ${difficulty})`);
    gameStore.connectAndJoin(roomName, playerName, { isSpectator, difficulty });
  }
});

onUnmounted(() => {
  gameStore.leaveGame();
  // Clean up the watcher if it was created
  if (stopWatchingHost) {
    stopWatchingHost();
  }
});

// Responsive width tracking for MultiBoardGrid (to avoid horizontal scrolling)
const containerRef = ref(null);
const containerWidth = ref(0);
function updateWidth() {
  containerWidth.value = containerRef.value?.clientWidth || 0;
}
window.addEventListener('resize', updateWidth);
onMounted(updateWidth);
onBeforeUnmount(() => window.removeEventListener('resize', updateWidth));

// --- Player elimination overlay visibility ---
const showEliminatedOverlay = ref(false);
watch(
  () => gameStore.currentPlayer?.hasLost,
  (hasLost, prevHasLost) => {
    // Affiche le modal uniquement lors du passage de false à true.
    if (hasLost && !prevHasLost) {
      showEliminatedOverlay.value = true;
    }
  }
);


// --- Player result overlay visibility rules ---
// 1) Show when this client (not spectator) receives gameOver event
watch(
  () => gameStore.gameState?.events,
  (events) => {
    if (!events || events.length === 0) return;
    if (!gameStore.isCurrentUserSpectator && events.includes('gameOver')) {
      showPlayerResultOverlay.value = true;
      playerResultOverlayClosed.value = false;
      // La modale de résultat a la priorité sur la modale d'élimination
      showEliminatedOverlay.value = false;
    }
  }
);

// 2) Also show on local transition playing -> lobby with lastResult (end-of-game)
watch(
  () => gameStore.gameStatus,
  (status, prev) => {
    if (status === 'playing') {
      // New game started: reset overlay states
      showPlayerResultOverlay.value = false;
      playerResultOverlayClosed.value = false;
      showEliminatedOverlay.value = false;
      return;
    }
    if (
      prev === 'playing' &&
      status === 'lobby' &&
      !gameStore.isCurrentUserSpectator &&
      gameStore.gameState?.lastResult
    ) {
      showPlayerResultOverlay.value = true;
      playerResultOverlayClosed.value = false;
      // La modale de résultat a la priorité sur la modale d'élimination
      showEliminatedOverlay.value = false;
    }
  }
);
</script>

<template>
  <div class="game-container" ref="containerRef">
    <!-- Nouvel en-tête pour le bouton Quitter -->
    <div class="game-view-header">
      <BaseButton @click="handleLeaveGame" variant="danger">Quitter</BaseButton>
    </div>

    <!-- Modal d'élimination (pour le joueur courant) -->
    <div
      class="modal-overlay"
      v-if="showEliminatedOverlay"
    >
      <BaseCard>
        <template #header>
          <h2>Vous avez perdu !</h2>
        </template>
        <p>Vous avez été éliminé(e) de la partie.</p>
        <p>Vous pouvez continuer à observer la partie jusqu'à la fin.</p>
        <div class="modal-actions">
          <BaseButton @click="showEliminatedOverlay = false" variant="primary">Fermer</BaseButton>
        </div>
      </BaseCard>
    </div>

    <!-- Modal de fin de partie (players) -->
    <div
      class="modal-overlay"
      v-if="showPlayerResultOverlay && !playerResultOverlayClosed"
    >
      <BaseCard>
        <template #header>
          <h2>Partie terminée !</h2>
        </template>
        <p class="winner-message" v-if="gameStore.gameState?.lastResult && gameStore.gameMode !== 'solo'">Le gagnant est : <strong>{{ gameStore.gameState.lastResult.winner }}</strong></p>

        <div v-if="gameStore.gameMode === 'solo'">
          <h3>Scores finaux</h3>
          <ul class="final-scores">
            <li v-for="player in gameStore.playerList" :key="player.id">
              {{ player.name }}: <strong>{{ player.score }} points</strong>
            </li>
          </ul>
        </div>

        <div v-if="gameStore.gameMode == 'solo'" class="modal-actions">
          <BaseButton @click="handleLeaveGame" variant="primary">Retourner au menu</BaseButton>
          <BaseButton
            @click="playAgain"
            variant="success"
          >Rejouer</BaseButton>
        </div>
        <div v-else class="modal-actions"> 
          <BaseButton @click="closePlayerResultOverlay" variant="primary">Fermer</BaseButton>
        </div>
      </BaseCard>
    </div>

    <!-- Modal de fin de partie (spectators) -->
    <div
      class="modal-overlay"
      v-if="gameStore.isCurrentUserSpectator && spectatorOverlayVisible"
    >
      <BaseCard>
        <template #header>
          <h2>Partie terminée !</h2>
        </template>
        <p class="winner-message" v-if="gameStore.gameState?.lastResult && gameStore.gameMode !== 'solo'">Le gagnant est : <strong>{{ gameStore.gameState.lastResult.winner }}</strong></p>

        <div class="modal-actions">
          <BaseButton @click="handleLeaveGame" variant="primary">Retourner au menu</BaseButton>
          <BaseButton
            @click="handleSpectatorJoin"
            variant="success"
            :disabled="isRoomFull"
          >Rejoindre</BaseButton>
        </div>
        <p v-if="isRoomFull" style="margin-top:10px; text-align:center; color:#ccc;">La partie est complète (4/4).</p>
      </BaseCard>
    </div>

    <!-- Section Lobby -->
    <BaseCard v-if="gameStore.gameStatus === 'lobby'">
      <template #header>
        <h3>En attente de joueurs...</h3>
      </template>
      <ul class="lobby-player-list">
        <li v-for="player in gameStore.playerList" :key="player.id">
          <span>{{ player.name }} {{ player.isHost ? '(Hôte)' : '' }}</span>
          <span v-if="gameStore.gameMode === 'solo'">Score: {{ player.score || 0 }}</span>
        </li>
      </ul>
      <BaseButton
        v-if="gameStore.isCurrentUserHost && gameStore.playerList.length > 1"
        @click="handleStartGame"
        variant="success"
        style="padding: 15px 32px; font-size: 16px; margin: 10px 2px;"
      >
        Démarrer la Partie
      </BaseButton>
      <p v-else-if="gameStore.isCurrentUserHost && gameStore.playerList.length <= 1">
        En attente d'autres joueurs...
      </p>
      <p v-else>En attente que l'hôte démarre la partie.</p>
    </BaseCard>

    <!-- Section Jeu (pour les joueurs) -->
    <div class="game-main-area" v-if="!gameStore.isCurrentUserSpectator && (gameStore.gameStatus === 'playing' || (gameStore.gameStatus === 'finished' && gameStore.currentPlayer))">
      <!-- Colonne de Gauche: Panneau d'informations -->
      <div class="game-info-panel">
        <div class="info-block">
          <h3>Partie</h3>
          <p>Room: <strong>{{ route.params.roomName }}</strong></p>
          <p>Joueur: <strong>{{ gameStore.currentPlayer.name }}</strong></p>
        </div>
        <div class="info-block">
          <h3>Réseau</h3>
          <p>État: <strong :style="{ color: socketState.isConnected ? 'green' : 'red' }">{{ socketState.isConnected ? 'Connecté' : '...' }}</strong></p>
        </div>
        <div class="info-block" v-if="gameStore.gameState">
          <h3>Niveau: {{ gameStore.gameState.level }}</h3>
          <p>Lignes avant prochain niveau:</p>
          <div class="progress-bar-container">
            <div class="progress-bar" :style="{ width: `${(gameStore.gameState.linesPerLevel - gameStore.gameState.linesToNextLevel) / gameStore.gameState.linesPerLevel * 100}%` }"></div>
            <span>{{ gameStore.gameState.linesToNextLevel }}</span>
          </div>
        </div>
      </div>

      <!-- Colonne Centrale: Plateau de jeu, pièces suivantes et Score -->
      <div class="main-play-area">
        <div class="board-and-score">
          <div class="score-display" v-if="gameStore.gameMode === 'solo'">
            <span class="score-label">Score</span>
            <span class="score-value">{{ gameStore.currentPlayer?.score || 0 }}</span>
          </div>
          <GameBoard
            :board="gameStore.board"
            :active-piece="gameStore.activePiece"
            @player-action="handlePlayerAction"
          />
        </div>
        <NextPieces :pieces="gameStore.nextPieces" />
      </div>

      <!-- Colonne de Droite: Adversaires -->
      <MultiBoardGrid
        v-if="(gameStore.playerList?.length || 0) > 1"
        :players="gameStore.playerList.filter(p => p.id !== gameStore.currentPlayer.id)"
        :container-width="containerWidth"
      />
    </div>

    <!-- Section Spectateur -->
    <BaseCard v-if="gameStore.isCurrentUserSpectator">
      <template #header>
        <h2>Mode Spectateur</h2>
      </template>
      <p>Vous observez la partie. Voici les participants :</p>

      <div class="participant-lists">
        <div class="player-list">
          <h3>Joueurs</h3>
          <ul>
            <li v-for="player in gameStore.playerList" :key="player.id">
              {{ player.name }} {{ player.isHost ? '(Hôte)' : '' }}
            </li>
          </ul>
        </div>
        <div class="spectator-list">
          <h3>Spectateurs</h3>
          <ul>
            <li v-for="spectator in gameStore.spectatorList" :key="spectator.id">
              {{ spectator.name }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Live game view for spectators -->
      <div v-if="gameStore.gameStatus === 'playing' || gameStore.gameStatus === 'finished'" class="spectator-game-view">
        <MultiBoardGrid
          :players="gameStore.playerList"
          :container-width="containerWidth"
        />
      </div>
    </BaseCard>
  </div>
</template>

<style scoped>
.spectator-game-view {
  margin-top: 20px;
}

.game-view-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
  height: 50px; /* Hauteur fixe pour éviter les sauts de layout */
}

.game-main-area {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: start;
  justify-content: center;
  gap: 100px;
}

.game-info-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  text-align: left;
}

.info-block h3 {
  margin-top: 0;
  margin-bottom: 10px;
  border-bottom: 2px solid var(--border-color);
  padding-bottom: 5px;
}

.info-block p {
  margin: 0 0 8px 0;
  word-break: break-all; /* Pour les noms de room longs */
}

.main-play-area {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
}

.board-and-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.score-display {
  text-align: center;
}

.score-label {
  display: block;
  font-size: 1.2em;
  color: var(--text-color);
}

.score-value {
  display: block;
  font-size: 2.5em;
  color: var(--primary-color);
  line-height: 1;
}

.winner-message {
  font-size: 1.2em;
  margin-bottom: 20px;
}

.game-container {
  display: flex;
  flex-direction: column;
  flex-grow: 1; /* Permet au conteneur de prendre la hauteur disponible */
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: 20px;
}

.lobby-container ul {
  list-style-type: none;
  padding: 0;
}

.lobby-container li {
  margin: 5px 0;
  font-size: 1.1em;
}


.final-scores {
  list-style-type: none;
  padding: 0;
  margin-bottom: 20px;
}

.final-scores li {
  font-size: 1.1em;
  margin: 5px 0;
}

.lobby-player-list li {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
}

.participant-lists {
  display: flex;
  justify-content: space-around;
  text-align: left;
}

.progress-bar-container {
  width: 100%;
  background-color: #111;
  border: 2px solid var(--border-color);
  height: 24px;
  position: relative;
  text-align: center;
  color: white;
}

.progress-bar {
  background-color: var(--primary-color);
  height: 100%;
  transition: width 0.3s ease-in-out;
}

.progress-bar-container span {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  text-shadow: 1px 1px 2px black;
}

</style>
