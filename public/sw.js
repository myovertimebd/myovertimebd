const CACHE_NAME = 'my-overtime-v2.0.0';
const NEW_HOME = new URL('/', self.location.origin).href;
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/hadi-icon.png',
  '/icon.svg',
  '/admin/',
  '/admin'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        PRECACHE_ASSETS.map((url) => {
          return fetch(url, { cache: 'reload' }).then(response => {
            if (!response.ok && response.status !== 0) {
              console.warn(`Service Worker: Failed to precache ${url}, status: ${response.status}`);
              return;
            }
            return cache.put(url, response);
          }).catch(err => {
            console.error(`Service Worker: Network error caching ${url}`, err);
          });
        })
      );
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  // Delete ONLY old caches, keeping the current version
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', k);
            return caches.delete(k);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  
  // Exclude sw.js from being cached/intercepted to ensure it can update
  if (url.pathname.includes('sw.js')) return;

  // *** NEVER cache API routes — always go to network ***
  // API responses must always be fresh (campaign notices, user data, etc.)
  if (url.pathname.startsWith('/api/') || url.pathname.includes('/api/')) return;

  const isCDN = url.hostname === 'cdn.jsdelivr.net' || 
                url.hostname === 'fonts.googleapis.com' || 
                url.hostname === 'fonts.gstatic.com';

  // 1. Navigation Requests — সব navigation নতুন domain এ redirect করো
  // এটা installed PWA users দের automatically নতুন domain এ নিয়ে যাবে
  if (event.request.mode === 'navigate') {
    event.respondWith(
      // প্রথমে try করো network থেকে load হয় কিনা (পুরানো domain active থাকলে)
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, cacheCopy);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline: serve the last cached home page when available.
          return caches.match('/').then((cached) => cached || new Response('You are offline. Please reconnect and try again.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }));
        })
    );
    return;
  }

  // 2. Static Assets Strategy: Stale-While-Revalidate
  if (
    isCDN ||
    url.pathname.includes('/_next/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|woff2?|ttf|otf|css|js)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, cacheCopy);
            });
          }
          return networkResponse;
        });
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 3. Everything else: Network-First
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cacheCopy);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(event.request);
        return cachedResponse || new Response('Offline: Network unavailable.', { 
          status: 503, 
          headers: { 'Content-Type': 'text/plain' } 
        });
      })
  );
});
// 4. Notifications with Vibration and Sound
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow(NEW_HOME);
    })
  );
});

// Sound and Vibration Support
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'My Overtime', body: 'আপনার কাজ সেভ করুন!' };
  const options = {
    body: data.body,
    icon: '/hadi-icon.png',
    badge: '/icon.svg',
    // Ultra-strong persistent vibration pattern for 100% noticeability
    vibrate: [500, 100, 500, 100, 500, 100, 500, 100, 500, 100, 500], 
    tag: 'daily-reminder',
    renotify: true,
    data: { url: '' },
    actions: [
      { action: 'open', title: 'Open App', icon: '/icon.svg' }
    ]
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});
