module.exports = {
  apps: [
    {
      name: "coursenova",
      script: "./server.js",
      instances: "max",
      exec_mode: "cluster",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 5000
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      merge_logs: true,
      max_memory_restart: "1G"
    }
  ]
};
