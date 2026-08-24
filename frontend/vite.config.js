import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Matches CLIENT_URL in backend/.env. Keeping the two in step here means
    // `npm run dev` is enough — no --port flag to remember, and no silent CORS
    // failure when someone forgets it. Change both together or neither.
    port: 5174,
    // Fail loudly instead of hopping to 5175 if the port is busy, which would
    // put the app back on an origin the API does not accept.
    strictPort: true,
    host: true
  }
});
