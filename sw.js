const CACHE="taskflow-pro-v2-2-1-2026-10";
const ASSETS=["./","./index.html?v=2.2.1","./style.css?v=2.2.1","./app.js?v=2.2.1","./manifest.json?v=2.2.1","./icon-192.png?v=2.2.1","./icon-512.png?v=2.2.1"];

self.addEventListener("install",event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});
self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("taskflow-pro-")&&k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())
  );
});
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET") return;
  event.respondWith(
    fetch(event.request).then(r=>{
      const copy=r.clone();
      caches.open(CACHE).then(c=>c.put(event.request,copy)).catch(()=>{});
      return r;
    }).catch(()=>caches.match(event.request).then(r=>r||caches.match("./index.html")))
  );
});
self.addEventListener("notificationclick",event=>{
  event.notification.close();
  event.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{
    for(const c of list){if("focus"in c)return c.focus()}
    return clients.openWindow("./");
  }));
});

self.addEventListener("push",event=>{
  let d={};try{d=event.data.json()}catch{}
  event.waitUntil(self.registration.showNotification(d.title||"TaskFlow",{body:d.body||"",tag:d.tag,renotify:true,icon:"icon-192.png?v=2.2.1",badge:"icon-192.png?v=2.2.1",vibrate:[200,100,200]}));
});
