const CACHE="myovertimebd-pwa-v1";
const ASSETS=["./","./index.html","./styles.css","./src/core.js","./src/app.js","./manifest.webmanifest","./assets/icon.svg"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("myovertimebd-pwa-")&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",event=>{const req=event.request;if(req.method!=="GET"||new URL(req.url).origin!==self.location.origin)return;event.respondWith((async()=>{const cached=await caches.match(req);if(cached)return cached;try{const res=await fetch(req);if(res.ok&&res.type==="basic"){const c=await caches.open(CACHE);c.put(req,res.clone());}return res;}catch{return req.mode==="navigate"?(await caches.match("./index.html"))||Response.error():Response.error();}})());});
