TaskFlow Version 2.1.0
Deploy all files in this folder to the root of your GitHub Pages repository.

Important:
- app.js keeps localStorage key taskflow-pro-v1 so existing tasks/history are preserved.
- sw.js uses a new cache name and skipWaiting/clientsClaim to force the new assets.
- index.html references versioned assets (?v=2.1.0).
- After upload, open the GitHub Pages URL in Safari and refresh once. If the old Home Screen app remains, remove the old Home Screen icon and add the site again.

v2.1 changes: templates, ringtones + snooze reminders, working notifications via service worker, iOS/Android safe-area layout, 7-day chart.
Note: web apps cannot fire a notification at an exact time when fully closed (no push server). Reminders ring while the app is open or backgrounded, and any missed within 2 hours fire when you reopen it.
