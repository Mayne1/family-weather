# Family Weather — Public Site (Static UI)

Location (server):
  /var/www/family-weather-static/public-site

This folder is the static website (HTML/CSS/JS) served by nginx for:
  https://thefamilyweather.com

## What lives here
Pages:
  index.html       = Home page (weather dashboard + Fab Five)
  dashboard.html   = Plan an event (form + weather intelligence panel)
  events.html      = Events list page (tiles)
  settings.html    = Settings page (theme, preferences)
  about.html       = About page
  contact.html     = Contact page

Scripts:
  app.js           = Shared JS (used across pages; navigation, shared helpers)
  home.js          = Home page logic (Fab Five temps/icons + 10-day icons)
  dashboard.js     = Dashboard wiring (event form -> weather intelligence)
  events.js        = Events page wiring (render saved events, actions)

Styles:
  styles.css       = Global styling + themes (fonts, background gradients, contrast)

Icons:
  icons/weather/*.svg  = Weather icons used by home page + forecast rows

## The "Home Page Update Path" (known-good)
These are the only files you normally touch for home page changes:
  - index.html
  - home.js
  - styles.css

Deploy steps:
  1) edit file(s)
  2) cache-bust (recommended): add ?v=STAMP to styles.css / app.js / home.js in index.html
  3) reload nginx:
       nginx -t && systemctl reload nginx

Cache-bust snippet:
  STAMP="$(date +%s)"
  perl -0777 -i -pe "s/(href=\"styles\.css)(\")/\$1?v=${STAMP}\$2/g;
                    s/(src=\"app\.js)(\")/\$1?v=${STAMP}\$2/g;
                    s/(src=\"home\.js)(\")/\$1?v=${STAMP}\$2/g;" index.html
  nginx -t && systemctl reload nginx

## Data flow (mental model)
UI never talks to the worker.
UI talks to the API endpoints under /api/* (nginx reverse proxies to Node).

UI -> https://thefamilyweather.com/api/weather/*  -> API (Node/Express) -> Postgres cache
Worker separately refreshes the cache periodically.

## Troubleshooting quick hits
1) Page looks updated but JS doesn't run:
   - Confirm script tag exists on that page (dashboard.html should load dashboard.js if it contains form wiring).
   - Confirm the browser is loading the newest file (use ?v=STAMP).
   - Confirm home.js / app.js parse:
       node --check home.js
       node --check app.js

2) API calls work on server but not in browser:
   - Ensure the browser is calling https://thefamilyweather.com/api/... (not 127.0.0.1)
   - Check nginx proxy routes in /etc/nginx/sites-enabled/family-weather

3) Weather icons missing:
   - Confirm file exists:
       ls -lah icons/weather/*.svg
   - Confirm URL returns 200:
       curl -I https://thefamilyweather.com/icons/weather/clear-day.svg

## Upcoming feature: Home page "Upcoming Events" tiles
Goal:
  Add small tiles to home page showing next events with a status color:
    green  = RSVPs good / not urgent
    yellow = RSVP window closing / pending replies
    red    = event soon / needs attention

Implementation idea (MVP):
  - events saved in localStorage OR fetched from /api/events later
  - home page reads next 3-5 upcoming items and renders tiles
