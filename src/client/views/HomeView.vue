<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/userStore';
import BaseButton from '../components/ui/BaseButton.vue';
import BaseCard from '../components/ui/BaseCard.vue';

const userStore = useUserStore();
const router = useRouter();

// Utilise le nom du store ou une chaîne vide
const playerNameInput = ref(userStore.playerName);

const continueToMenu = () => {
  if (playerNameInput.value.trim()) {
    userStore.setPlayerName(playerNameInput.value.trim());
    router.push('/menu');
  } else {
    alert('Veuillez entrer un nom.');
  }
};
</script>

<template>
  <BaseCard>
    <template #header>
      <h2>Bienvenue sur Red Tetris !</h2>
    </template>
    <p>Pour commencer, veuillez entrer votre nom.</p>
    <form @submit.prevent="continueToMenu" class="name-form">
      <input
        v-model="playerNameInput"
        type="text"
        placeholder="Votre nom"
        required
        class="name-input"
      />
      <BaseButton type="submit">Continuer</BaseButton>
    </form>
  </BaseCard>
</template>

<style scoped>
.name-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-top: 20px;
}

.name-input {
  font-family: inherit; /* Pour utiliser VT323 */
  font-size: 1.1em;
  background-color: #111;
  color: var(--text-color, #e0e0e0);
  border: 2px solid var(--border-color, #444);
  border-radius: 0;
  padding: 10px;
  text-align: center;
}

.name-input::placeholder {
  color: #777;
}
</style>
