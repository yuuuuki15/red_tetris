<script setup>
defineProps({
  pieces: {
    type: Array,
    default: () => [],
  },
});

const getCellStyle = (cell, color) => {
  return {
    backgroundColor: cell ? color : 'transparent',
  };
};
</script>

<template>
  <div class="next-pieces-container">
    <h3>Suivants</h3>
    <div v-for="(piece, index) in pieces" :key="index" class="piece-preview">
      <div
        class="piece-grid"
        :style="{
          gridTemplateColumns: `repeat(${piece.shape[0].length}, 1fr)`,
          gridTemplateRows: `repeat(${piece.shape.length}, 1fr)`,
        }"
      >
        <div
          v-for="(cell, cellIndex) in piece.shape.flat()"
          :key="cellIndex"
          class="cell"
          :style="getCellStyle(cell, piece.color)"
        ></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.next-pieces-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-left: 15px;
  width: 120px; /* Fixed width */
}

h3 {
  margin-top: 0;
  margin-bottom: 10px;
  text-align: center;
  font-size: 1.2em;
  color: var(--primary-color);
}

.piece-preview {
  background-color: #111;
  border: 2px solid var(--border-color);
  padding: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80px; /* Fixed height for each preview box */
}

.piece-grid {
  display: grid;
  gap: 1px;
}

.cell {
  width: 16px; /* Size of a mini-cell */
  height: 16px;
  border-radius: 2px;
}
</style>
