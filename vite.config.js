import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Charge le fichier .env dans le répertoire de travail actuel
  const env = loadEnv(mode, process.cwd(), '');
  const serverUrl = env.VITE_SERVER_URL || 'http://127.0.0.1:3004';

  console.log(`[Vite Config] Le proxy pour socket.io est configuré sur : ${serverUrl}`);

  return {
    plugins: [vue()],
    server: {
      port: 8080,
      proxy: {
        '/socket.io': {
          target: serverUrl,
          ws: true,
        },
      },
    },
  }
})
