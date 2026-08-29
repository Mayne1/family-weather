module.exports = {
  apps: [{
    name: "family-weather-frontend",
    cwd: "/var/www/family-weather-frontend",
    script: "node_modules/next/dist/bin/next",
    args: "start --hostname 127.0.0.1 --port 3001",
    instances: 1,
    exec_mode: "fork",
    autorestart: true,
    max_memory_restart: "512M",
    env: {
      NODE_ENV: "production",
      NEXT_PUBLIC_SITE_URL: "https://thefamilyweather.com",
      PUBLIC_ORIGIN: "https://thefamilyweather.com",
      FAMILY_WEATHER_API_ORIGIN: "http://127.0.0.1:3000",
    },
  }],
};
