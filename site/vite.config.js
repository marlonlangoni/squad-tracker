import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// O site fica em https://<usuario>.github.io/squad-tracker/
export default defineConfig({
  base: '/squad-tracker/',
  plugins: [react()],
  server: { port: 5180 },
});
