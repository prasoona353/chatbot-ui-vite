// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/chatbot.ts', // 👈 Points directly to your code file
      name: 'TradingChatbot', 
      formats: ['es'],
      fileName: 'chatbot'      // 👈 Forces it to output exactly one bundle name
    },
    rollupOptions: {
      external: []
    }
  }
});
