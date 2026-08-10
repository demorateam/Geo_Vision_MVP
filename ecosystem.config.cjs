module.exports = {
  apps: [
    {
      name: "uemp-mobile-mvp",
      cwd: __dirname,
      script: "npm",
      args: "start",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "768M",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
