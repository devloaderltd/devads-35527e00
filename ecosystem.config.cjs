// PM2 process file for VPS deployment.
// Usage on the VPS:
//   bun install && bun run build
//   pm2 start ecosystem.config.cjs
//   pm2 save && pm2 startup
module.exports = {
  apps: [
    {
      name: "callescort",
      script: "dist/server/server.js",
      cwd: ".",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOST: "127.0.0.1",
      },
      max_memory_restart: "512M",
      autorestart: true,
      watch: false,
    },
  ],
};
