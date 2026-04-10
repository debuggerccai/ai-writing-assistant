module.exports = {
  apps: [
    {
      name: "ai-writing-assistant",
      script: "server.js",
      cwd: process.env.APP_CWD || "./.next/standalone",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || "3000",
      },
      error_file: process.env.PM2_ERROR_LOG || "./logs/pm2-error.log",
      out_file: process.env.PM2_OUT_LOG || "./logs/pm2-out.log",
      merge_logs: true,
      time: true,
    },
  ],
};
