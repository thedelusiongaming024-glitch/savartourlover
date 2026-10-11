module.exports = {
  apps: [
    {
      name: "savartourlover",
      script: "npm",
      args: "start",
      instances: 1, // Or 2 / 'max' depending on your Droplet CPU cores
      autorestart: true,
      watch: false,
      max_memory_restart: "600M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
