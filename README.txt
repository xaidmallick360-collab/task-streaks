TaskFlow Version 2.0.0
Deploy all files in this folder to the root of your GitHub Pages repository.

Important:
- app.js keeps localStorage key taskflow-pro-v1 so existing tasks/history are preserved.
- sw.js uses a new cache name and skipWaiting/clientsClaim to force the new assets.
- index.html references versioned assets (?v=2.0.0).
- After upload, open the GitHub Pages URL in Safari and refresh once. If the old Home Screen app remains, remove the old Home Screen icon and add the site again.
