import { defineConfig } from 'vite'
import path from 'path';

console.log(path.resolve(__dirname, './src/los.js'));

export default defineConfig({
  resolve: {
    alias: {
      '@bucky24/los': path.resolve(__dirname, '..', '..', './src/los.js'),
    },
  },
  server: {
    port: 8080,
  },
});