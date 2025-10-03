<script setup>
import { onMounted, onUnmounted, computed } from 'vue';
import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  CELL_EMPTY,
  TETROMINO_COLORS,
  ID_TO_TETROMINO,
  TETROMINO_IDS,
  PENALTY_CELL,
  PENALTY_COLOR,
  FRAME_COLOR
} from '../../shared/constants.js';

// Contrat n°3 : "Câbles d'Entrée" (Props)
// Le composant attend de recevoir le plateau de jeu et la pièce active.
const props = defineProps({
  board: {
    type: Array,
    required: true,
    default: () => [],
  },
  activePiece: {
    type: Object,
    required: false,
    default: null,
  },
  tileSize: {
    type: Number,
    required: false,
    default: 24,
  },
});

// Contrat n°3 : "Signaux de Sortie" (Emits)
// Le composant signale qu'une action du joueur doit être envoyée au serveur.
const emit = defineEmits(['playerAction']);

const handleKeydown = (event) => {
  let action = null;
  switch (event.key) {
    case 'ArrowLeft':
      action = 'moveLeft';
      break;
    case 'ArrowRight':
      action = 'moveRight';
      break;
    case 'ArrowUp':
      action = 'rotate';
      break;
    case 'ArrowDown':
      action = 'softDrop';
      break;
    case ' ': // Espace
      action = 'hardDrop';
      break;
  }

  if (action) {
    event.preventDefault();
    // Le composant ne modifie pas l'état lui-même, il émet un événement.
    emit('playerAction', action);
  }
};

// Ajoute et retire les écouteurs d'événements lorsque le composant est monté/démonté.
onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});

// Dimensions de secours si le plateau n'est pas fourni
const cols = computed(() => (props.board?.[0]?.length ?? BOARD_WIDTH));
const rows = computed(() => (props.board?.length ?? BOARD_HEIGHT));

// Fusionne le plateau avec la pièce active (superposition)
const mergedGrid = computed(() => {
  const base = Array.from({ length: rows.value }, (_, y) => {
    return Array.from({ length: cols.value }, (_, x) => (props.board?.[y]?.[x] ?? CELL_EMPTY));
  });

  const piece = props.activePiece;
  if (!piece || !piece.shape || !piece.position) return base;

  const pieceId = TETROMINO_IDS[piece.type];
  if (!pieceId) return base;

  for (let py = 0; py < piece.shape.length; py++) {
    for (let px = 0; px < piece.shape[py].length; px++) {
      const cell = piece.shape[py][px];
      if (!cell) continue;
      const gx = (piece.position.x || 0) + px;
      const gy = (piece.position.y || 0) + py;
      if (gy >= 0 && gy < rows.value && gx >= 0 && gx < cols.value) {
        base[gy][gx] = pieceId; // Mark with the tetromino ID
      }
    }
  }
  return base;
});

function resolveCellColor(val) {
  const frameColor = FRAME_COLOR;
  if (!val || val === CELL_EMPTY) return 'transparent';
  if (val === PENALTY_CELL) return PENALTY_COLOR;
  if (typeof val === 'number') {
    const key = ID_TO_TETROMINO[val];
    return (key && TETROMINO_COLORS[key]) || frameColor;
  }
  if (typeof val === 'string') {
    // Allow direct CSS colors like '#787878'
    if (val.startsWith && val.startsWith('#')) return val;
    return TETROMINO_COLORS[val] || frameColor;
  }
  if (typeof val === 'object' && val.color) return val.color;
  return frameColor;
}

// Create a framed grid with one-tile border around playfield using #787878 tiles
const displayCols = computed(() => cols.value + 2);
const displayRows = computed(() => rows.value + 2);
const framedGrid = computed(() => {
  const inner = mergedGrid.value;
  const out = Array.from({ length: displayRows.value }, (_, oy) =>
    Array.from({ length: displayCols.value }, (_, ox) => {
      const isBorder = oy === 0 || oy === displayRows.value - 1 || ox === 0 || ox === displayCols.value - 1;
      if (isBorder) return FRAME_COLOR; // hex color string handled by resolver
      const iy = oy - 1;
      const ix = ox - 1;
      return inner[iy]?.[ix] ?? CELL_EMPTY;
    })
  );
  return out;
});
</script>

<template>
  <div class="game-board">
      <div class="board-grid" :style="{ '--cols': displayCols, '--rows': displayRows, '--tile-size': props.tileSize + 'px' }">
        <template v-for="(row, y) in framedGrid" :key="y">
          <div
            v-for="(cell, x) in row"
            :key="x"
            class="tile"
            :style="{ backgroundColor: resolveCellColor(cell) }"
          />
        </template>
      </div>
    </div>
</template>

<style scoped>
.game-board {
  padding: 8px;
  background-color: transparent;
  display: inline-block;
}
.board-grid {
  --tile-size: 24px;
  display: grid;
  grid-template-columns: repeat(var(--cols), var(--tile-size));
  grid-template-rows: repeat(var(--rows), var(--tile-size));
  gap: 1px;
  background-color: #111;
  /* Prevent overflow: size is exactly tiles + gaps */
  width: calc(var(--cols) * var(--tile-size) + (var(--cols) - 1) * 1px);
  height: calc(var(--rows) * var(--tile-size) + (var(--rows) - 1) * 1px);
  padding: 5px;
}
.tile {
  width: var(--tile-size);
  height: var(--tile-size);
  background-color: transparent;
  border: none;
  box-sizing: border-box;
  border-radius: 3px;
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.25);
}
</style>
