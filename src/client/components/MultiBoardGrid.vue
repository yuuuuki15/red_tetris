<script setup>
import { computed } from 'vue';
import { BOARD_WIDTH, BOARD_HEIGHT } from '../../shared/constants.js';

const props = defineProps({
  players: { type: Array, required: true, default: () => [] },
  containerWidth: { type: Number, required: true },
});

// Compute responsive columns based on number of players to avoid horizontal scroll
const cols = computed(() => {
  const n = Math.max(1, Math.min(4, props.players.length));
  if (n <= 2) return n;
  return 2;
});
</script>

<template>
  <div class="grid-container" :style="{ gridTemplateColumns: `repeat(${cols}, 1fr)` }">
    <div v-for="p in players" :key="p.id" class="player-cell">
      <div class="player-name">{{ p.name }}</div>
      <div class="spectrum-board">
        <div class="spectrum-grid">
          <div
            v-for="(height, index) in p.spectrum"
            :key="index"
            class="spectrum-column"
          >
            <div
              class="spectrum-bar"
              :style="{ height: `${(height / BOARD_HEIGHT) * 100}%` }"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grid-container {
  display: grid;
  grid-gap: 20px;
  justify-items: center;
}
.player-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.player-name {
  margin-bottom: 8px;
  color: inherit;
  font-size: 1em;
  font-weight: bold;
  text-align: center;
}

.spectrum-board {
  width: 120px;
  height: 240px;
  background-color: #1a1a1a;
  border: 4px solid #555;
  border-bottom-color: #888;
  border-right-color: #888;
  padding: 5px;
  box-sizing: border-box;
}

.spectrum-grid {
  display: flex;
  flex-direction: row;
  height: 100%;
  width: 100%;
  gap: 1px;
}

.spectrum-column {
  flex: 1;
  display: flex;
  flex-direction: column-reverse; /* Bars grow from the bottom */
  background-color: #000;
}

.spectrum-bar {
  width: 100%;
  background-color: #777;
  transition: height 0.05s ease-out; /* Smooth transitions for spectrum changes */
}
</style>
