// PM2 Ecosystem Configuration
// Run with: pm2 start ecosystem.config.js
// Save with: pm2 save

module.exports = {
  apps: [
    {
      name: "ajay-server",
      script: "./index.js",
      cwd: "/home/ajayexperience/theajayexperience.com/server",
      instances: 1,
      exec_mode: "fork",
      
      // If Node is installed via NVM and PM2 can't find it on boot, uncomment and set the full path:
      // To find your Node path: which node (should be something like /home/ajayexperience/.nvm/versions/node/v18.19.1/bin/node)
      // interpreter: "/home/ajayexperience/.nvm/versions/node/v18.19.1/bin/node",
      
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOST: "127.0.0.1",
      },
      // Logging
      error_file: "/home/ajayexperience/.pm2/logs/ajay-server-error.log",
      out_file: "/home/ajayexperience/.pm2/logs/ajay-server-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      
      // Restart behavior
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      
      // Node.js options
      node_args: "--max-old-space-size=512",
    },
  ],
};

