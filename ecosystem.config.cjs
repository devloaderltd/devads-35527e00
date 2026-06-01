// PM2 process file for VPS deployment.
// Usage:
//   bun install && bun run build
//   pm2 start ecosystem.config.cjs && pm2 save
module.exports = {
  apps: [
    {
      name: "callescort",
      script: ".output/server/index.mjs",
      cwd: ".",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOST: "0.0.0.0",
      },
      max_memory_restart: "512M",
      autorestart: true,
      watch: false,
    },
  ],
};
