/**
 * PM2 process definition for the Fursad API.
 *
 * Lives at the repository root:  /var/www/fursad/fursad/ecosystem.config.js
 *
 *   pm2 start ecosystem.config.js
 *   pm2 save
 *   pm2 startup      # run the command it prints — this is what survives reboot
 *
 * cwd is backend/ so that `require('dotenv').config()` in server.js finds
 * backend/.env exactly as it does in development. Nothing in the application
 * needed changing for production.
 */
module.exports = {
  apps: [
    {
      name: 'fursad-api',
      cwd: './backend',
      script: 'server.js',

      // One process, deliberately. Socket.IO keeps per-connection state in
      // memory, so a second instance would split the chat rooms between them
      // and messages would reach only whichever process happened to hold that
      // socket. Clustering here requires a Redis adapter first.
      instances: 1,
      exec_mode: 'fork',

      env: {
        NODE_ENV: 'production',
      },

      // The server calls process.exit(1) on a bad secret. Retrying forever
      // would hide that behind a restart loop, so cap it and let PM2 stop.
      max_restarts: 10,
      restart_delay: 3000,
      min_uptime: '20s',

      // Restart if it leaks past this. Normal footprint is well under 300MB;
      // the PDF parser is the one component that spikes.
      max_memory_restart: '500M',

      // Never restart on file changes — a deploy is an explicit act.
      watch: false,

      out_file: './logs/out.log',
      error_file: './logs/error.log',
      merge_logs: true,
      time: true,   // timestamp every line, so logs are readable after the fact
    },
  ],
};
