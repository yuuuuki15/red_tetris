<script setup>
// Ce composant n'a pas besoin de script pour le moment.
// Il est purement structurel et stylistique.
</script>

<template>
  <div class="base-card">
    <header v-if="$slots.header" class="card-header">
      <slot name="header" />
    </header>
    <main class="card-content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.base-card {
  background-color: var(--background-color-card, #2c2c2c);
  border: 2px solid #000;
  box-shadow: 4px 4px 0px 0px #000;
  border-radius: 0;
  margin: 40px auto;
  max-width: 800px;
  color: var(--text-color, #e0e0e0);
}

.card-header {
  padding: 10px 15px;
  background-color: #000;
  border-bottom: 2px solid var(--border-color, #444);
  text-align: center;
}

.card-header > :first-child {
  margin: 0;
}

.card-content {
  padding: 20px;
  text-align: center;
}
</style>
