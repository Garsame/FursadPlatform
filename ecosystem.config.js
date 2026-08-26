// PM2 process definition for the Fursad API.
// Place at the repo root: /var/www/fursad/fursad/ecosystem.config.js
// Start with: pm2 start ecosystem.config.js
//
// cwd is set to backend/ so that `require('dotenv').config()` in server.js
// finds backend/.env the same way it does in local development — nothing in
// the app needed to change for production.
module.exports = {
  apps: [
    {
      name: 'fursad-api',
      cwd: './backend',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      max_restarts: 10,
      restart_delay: 2000,
      // Keeps a rolling log rather than one file growing forever.
      max_memory_restart: '400M'
    }
  ]
};
