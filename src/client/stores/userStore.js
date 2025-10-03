import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUserStore = defineStore('user', () => {
  // --- STATE ---
  const playerName = ref(localStorage.getItem('playerName') || '');

  // --- ACTION ---
  function setPlayerName(name) {
    playerName.value = name.trim();
    localStorage.setItem('playerName', name.trim());
  }

  // --- EXPOSITION ---
  return {
    playerName,
    setPlayerName,
  };
});
