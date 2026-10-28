import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' = aplikace funguje na libovolné adrese i v podsložce (GitHub Pages, Netlify, vlastní hosting)
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'es2020', sourcemap: false },
});
