<script setup>
defineProps({
  variant: {
    type: String,
    default: 'primary', // primary, success, danger, secondary, info
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  type: {
    type: String,
    default: 'button',
  },
});
</script>

<template>
  <button
    :class="['base-button', `variant-${variant}`]"
    :type="type"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<style scoped>
.base-button {
  color: white;
  background-color: #4A4A4A; /* Un gris neutre par défaut */
  border: 2px solid black;
  border-radius: 0; /* Adieu les coins arrondis */
  padding: 10px 20px;
  font-size: 1em;
  font-weight: bold;
  text-transform: uppercase; /* Look plus "jeu" */
  letter-spacing: 1px;
  cursor: pointer;
  
  /* L'astuce pour l'effet 3D : une bordure inférieure plus épaisse et foncée */
  border-bottom: 5px solid #222;
  
  transition: all 0.1s ease-in-out;
}

.base-button:hover {
  filter: brightness(1.1); /* Éclaircit légèrement au survol */
}

.base-button:active {
  /* On simule l'enfoncement du bouton */
  transform: translateY(3px);
  border-bottom-width: 2px; /* La bordure du bas se réduit */
}

.base-button:disabled {
  background-color: #555;
  border-color: #333;
  border-bottom-color: #333;
  color: #999;
  cursor: not-allowed;
  transform: none; /* Pas d'effet d'enfoncement */
  filter: none;
}

/* --- Palettes de couleurs pour les variants --- */
.variant-primary { background-color: #03A9F4; border-bottom-color: #0288D1; }
.variant-success { background-color: #4CAF50; border-bottom-color: #388E3C; }
.variant-danger { background-color: #F44336; border-bottom-color: #D32F2F; }
.variant-secondary { background-color: #78909C; border-bottom-color: #546E7A; }
.variant-info { background-color: #17a2b8; border-bottom-color: #0D8A9C; }
</style>
