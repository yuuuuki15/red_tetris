<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/userStore';
import { useGameStore } from '../stores/gameStore';
import BaseButton from '../components/ui/BaseButton.vue';
import BaseCard from '../components/ui/BaseCard.vue';

const userStore = useUserStore();
const gameStore = useGameStore();
const router = useRouter();

const newRoomName = ref('');
const selectedDifficulty = ref('normal'); // 'normal', 'fast', 'hardcore'

if (!userStore.playerName) {
  router.push('/');
}

// S'abonne aux mises à jour et charge les données initiales en entrant dans la vue
onMounted(() => {
  gameStore.enterLobbyBrowser();
  gameStore.fetchLeaderboard();
});

// Se désabonne en quittant la vue pour ne pas recevoir de mises à jour inutiles
onUnmounted(() => {
  gameStore.leaveLobbyBrowser();
});

const startSoloGame = () => {
  const roomName = `solo-${Date.now()}`;
  router.push(`/${roomName}/${userStore.playerName}?solo=true&difficulty=${selectedDifficulty.value}`);
};

const createMultiplayerGame = () => {
  const roomName = newRoomName.value.trim();
  if (roomName) {
    router.push(`/${roomName}/${userStore.playerName}?difficulty=${selectedDifficulty.value}`);
  } else {
    alert('Veuillez donner un nom à votre partie.');
  }
};

const joinGame = (roomName) => {
  router.push(`/${roomName}/${userStore.playerName}`);
};

const spectateGame = (roomName) => {
  router.push(`/${roomName}/${userStore.playerName}?spectate=true`);
};

const handleChangeName = () => {
  router.push('/');
};

const formatDifficulty = (difficulty) => {
  switch (difficulty) {
    case 'hardcore':
      return 'Hardcore (x2)';
    case 'fast':
      return 'Rapide (x1.5)';
    case 'normal':
    default:
      return 'Normal (x1)';
  }
};

// Computed property to get the top 5 leaderboard entries
const top5Leaderboard = computed(() => {
  // Sort by weightedScore in descending order and take the top 5
  return [...gameStore.leaderboard]
    .sort((a, b) => b.weightedScore - a.weightedScore)
    .slice(0, 5);
});
</script>

<template>
  <div class="menu-container">
    <!-- Colonne de gauche (principale) -->
    <div class="left-column">
      <BaseCard>
        <template #header>
          <h2>Menu Principal</h2>
        </template>
        <div class="welcome-message">
          <p>Bonjour, <strong>{{ userStore.playerName }}</strong> !</p>
          <BaseButton @click="handleChangeName" variant="secondary" class="change-name-button">Changer</BaseButton>
        </div>

        <div class="game-options">
          <h4>Vitesse de départ</h4>
          <div class="difficulty-selector">
            <label :class="{ selected: selectedDifficulty === 'normal' }">
              <input type="radio" v-model="selectedDifficulty" value="normal" name="difficulty">
              <span>Normal</span>
            </label>
            <label :class="{ selected: selectedDifficulty === 'fast' }">
              <input type="radio" v-model="selectedDifficulty" value="fast" name="difficulty">
              <span>Rapide</span>
            </label>
            <label :class="{ selected: selectedDifficulty === 'hardcore' }">
              <input type="radio" v-model="selectedDifficulty" value="hardcore" name="difficulty">
              <span>Hardcore</span>
            </label>
          </div>
        </div>

        <div class="main-actions">
          <div class="action-panel solo-panel">
            <h3>Mode Solo</h3>
            <BaseButton @click="startSoloGame" variant="success">Lancer</BaseButton>
          </div>
          <div class="separator"></div>
          <div class="action-panel multi-panel">
            <h3>Multijoueur</h3>
            <form @submit.prevent="createMultiplayerGame" class="create-game-form">
              <input
                v-model="newRoomName"
                type="text"
                placeholder="Nom de la partie"
                required
                class="room-name-input"
              />
              <BaseButton type="submit" variant="info">Créer une partie</BaseButton>
            </form>
          </div>
        </div>
      </BaseCard>
    </div>
    <div class="right-column">
      <BaseCard>
        <template #header>
          <h3>🏆 Leaderboard 🏆</h3>
        </template>
        <div v-if="top5Leaderboard.length > 0" class="lobbies-table-container">
          <div class="grid-table leaderboard-grid">
            <div class="grid-header">#</div>
            <div class="grid-header">Nom</div>
            <div class="grid-header">Score</div>
            <div class="grid-header">Difficulté</div>
            <div class="grid-header">Date</div>
            <template v-for="(entry, index) in top5Leaderboard" :key="entry.id">
              <div>{{ index + 1 }}</div>
              <div>{{ entry.name }}</div>
              <div>{{ entry.weightedScore }}</div>
              <div class="difficulty-cell">{{ formatDifficulty(entry.difficulty) }}</div>
              <div>{{ new Date(entry.date).toLocaleDateString() }}</div>
            </template>
          </div>
        </div>
        <div v-else class="no-lobbies-message">
          <p>Aucun score enregistré. Soyez le premier à entrer dans la légende !</p>
        </div>
      </BaseCard>
    </div>

    <!-- Colonne de droite (secondaire) -->
    <div class="bottom-column">
      <BaseCard>
        <template #header>
          <h3>Parties en attente</h3>
        </template>
        <div v-if="gameStore.lobbies.length > 0" class="lobbies-table-container">
          <div class="grid-table lobbies-grid">
            <div class="grid-header">Nom de la Partie</div>
            <div class="grid-header">Hôte</div>
            <div class="grid-header">Joueurs</div>
            <div class="grid-header">Statut</div>
            <div class="grid-header grid-span-2">Action</div>
            <template v-for="lobby in gameStore.lobbies" :key="lobby.roomName">
              <div>{{ lobby.roomName }}</div>
              <div>{{ lobby.hostName }}</div>
              <div>{{ lobby.playerCount }} / 4</div>
              <div>
                <span :class="['status', `status-${lobby.status}`]">{{ lobby.status }}</span>
              </div>
              <div>
                <BaseButton
                  @click="joinGame(lobby.roomName)"
                  variant="success"
                  :disabled="lobby.status === 'playing' || lobby.playerCount >= 4"
                  style="padding: 8px 12px; font-size: 0.9em;"
                >Rejoindre</BaseButton>
              </div>
              <div>
                <BaseButton @click="spectateGame(lobby.roomName)" variant="secondary" style="padding: 8px 12px; font-size: 0.9em;">Spectateur</BaseButton>
              </div>
            </template>
          </div>
        </div>
        <div v-else class="no-lobbies-message">
          <p>Aucune partie en attente pour le moment. Pourquoi ne pas en créer une ?</p>
        </div>
      </BaseCard>
    </div>
  </div>
</template>

<style scoped>
.menu-container {
  display: grid;
  grid-template-columns: 2fr 1fr;
  grid-template-areas:
    "left right"
    "bottom bottom";
  gap: 40px;
  max-width: 1200px;
  margin: 20px auto;
  align-items: start;
}

@media (max-width: 1024px) {
  .menu-container {
    grid-template-areas:
    "left"
    "bottom"
    "right";
    grid-template-columns: 1fr;
  }
}

.left-column {
  grid-area: left;
  display: flex;
  flex-direction: column;
  gap: 40px;
  /* grid-column: 1 / 2; */
}
.right-column {
  grid-area: right;
  display: flex;
  flex-direction: column;
  gap: 40px;
  /* grid-column: 1 / 2; */
}

.bottom-column {
  grid-area: bottom;
  width: auto;
  /* grid-column: 1; */
}

.menu-container :deep(.base-card) {
  margin: 0;
  width: 100%;
  max-width: none;
}

.welcome-message {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}

.welcome-message p {
  margin: 0;
  font-size: 1.1em;
}

.change-name-button {
  padding: 5px 10px;
  font-size: 0.8em;
  border-bottom-width: 3px;
}
.change-name-button:active {
  transform: translateY(2px);
  border-bottom-width: 1px;
}

.game-options {
  margin-bottom: 25px;
  text-align: center;
}

.game-options h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: var(--primary-color);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.difficulty-selector {
  display: flex;
  justify-content: center;
  gap: 10px;
  background-color: #111;
  padding: 5px;
  border-radius: 5px;
  border: 2px solid var(--border-color, #444);
  max-width: 350px;
  margin: 0 auto;
}

.difficulty-selector label {
  flex: 1;
  padding: 8px 12px;
  cursor: pointer;
  text-align: center;
  border-radius: 3px;
  transition: background-color 0.2s;
  color: var(--text-color);
}

.difficulty-selector input[type="radio"] {
  display: none;
}

.difficulty-selector label.selected {
  background-color: var(--primary-color);
  color: #111;
  font-weight: bold;
}

.main-actions {
  display: flex;
  flex-direction: row;
  gap: 20px;
  align-items: stretch;
  margin-top: 20px;
  border-top: 2px solid var(--border-color, #444);
  padding-top: 20px;
}

.action-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 15px;
  padding: 0 10px;
}

.action-panel h3 {
  margin: 0 0 10px 0;
  color: var(--text-color);
  text-transform: uppercase;
  font-size: 1.1em;
  letter-spacing: 1px;
}

.separator {
  width: 2px;
  background-color: var(--border-color, #444);
}

.create-game-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  justify-content: center;
  flex-grow: 1;
}

.room-name-input {
  font-family: inherit;
  font-size: 1em;
  background-color: #111;
  color: var(--text-color, #e0e0e0);
  border: 2px solid var(--border-color, #444);
  border-radius: 0;
  padding: 10px;
}

.room-name-input::placeholder {
  color: #777;
}

.lobbies-table-container {
  overflow-x: auto;
}


.difficulty-cell {
  text-transform: capitalize;
}

.status {
  font-size: 0.9em;
  color: inherit;
}

.status-lobby { color: #28a745; }
.status-playing { color: #ffc107; }

.no-lobbies-message {
  padding: 20px;
  color: #777;
}

@media (max-width: 600px) {
  .main-actions {
    flex-direction: column;
  }
  .separator {
    width: 80%;
    height: 2px;
    margin: 10px auto;
  }
}
.grid-table {
  display: grid;
  width: 100%;
  margin-top: 15px;
}

/* Specific grid layouts */
.leaderboard-grid {
  grid-template-columns: 40px 1fr 1fr 1fr 1fr;
}
.lobbies-grid {
  grid-template-columns: minmax(120px, 1.5fr) 1fr 0.5fr 0.5fr auto auto;
}

.grid-table > div {
  padding: 12px 15px;
  border-top: 1px solid var(--border-color, #444);
  text-align: left;
  vertical-align: middle;
  display: flex; /* To vertically center content like buttons */
  align-items: center;
  overflow-wrap: break-word; /* Prevents long room names from breaking layout */
}

.grid-table > div:nth-child(-n+5) { /* Selects first 5 headers for leaderboard */
  border-top: none;
}
.lobbies-grid > div:nth-child(-n+5) { /* Selects first 5 headers for lobbies */
  border-top: none;
}


.grid-header {
  background-color: #111;
  font-size: 1.1em;
  font-weight: bold;
}

.grid-span-2 {
  grid-column: span 2;
  justify-content: center; /* Center the 'Action' header content */
}
</style>
