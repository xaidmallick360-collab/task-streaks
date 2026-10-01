TASK STREAKS PWA
================

Files:
- index.html
- style.css
- app.js
- manifest.json
- sw.js
- icon-192.png
- icon-512.png

IMPORTANT:
A PWA must be served over HTTPS (or localhost) for the service worker/install features to work.

Quick local test:
1. Install Python.
2. Open a terminal in this folder.
3. Run: python -m http.server 8000
4. Open: http://localhost:8000

For iPhone:
Deploy these files to any HTTPS web host. Open the HTTPS address in Safari, then:
Share -> Add to Home Screen.

The current version stores tasks/history in the browser's localStorage. It does not yet have cloud login/sync.
