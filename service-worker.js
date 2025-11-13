const CACHE_NAME = 'gaji-pegawai-v1.2';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.json',
    '/service-worker.js'
];

// Install Event
self.addEventListener('install', (event) => {
    console.log('🛠 Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('📦 Caching app shell');
                return cache.addAll(urlsToCache).catch(error => {
                    console.error('Cache error:', error);
                });
            })
    );
    self.skipWaiting(); // Aktifkan segera
});

// Activate Event
self.addEventListener('activate', (event) => {
    console.log('🚀 Service Worker activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑 Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim(); // Take control immediately
});

// Fetch Event
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version
                if (response) {
                    console.log('📂 Serving from cache:', event.request.url);
                    return response;
                }

                // Fetch from network
                console.log('🌐 Fetching from network:', event.request.url);
                return fetch(event.request)
                    .then((response) => {
                        // Check if valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone response for cache
                        const responseToCache = response.clone();

                        // Add to cache
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                // Only cache same-origin requests
                                if (event.request.url.startsWith(self.location.origin)) {
                                    cache.put(event.request, responseToCache);
                                }
                            });

                        return response;
                    })
                    .catch((error) => {
                        console.error('Fetch failed:', error);
                        
                        // Return offline page for HTML requests
                        if (event.request.headers.get('accept').includes('text/html')) {
                            return caches.match('/index.html');
                        }
                        
                        return new Response('Aplikasi sedang offline', {
                            status: 503,
                            statusText: 'Service Unavailable',
                            headers: new Headers({
                                'Content-Type': 'text/plain'
                            })
                        });
                    });
            })
    );
});

// Background Sync (Optional)
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
        console.log('🔄 Background sync triggered');
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    // Implement background sync logic here
    console.log('Perbackground sync...');
}

// Push Notification (Optional)
self.addEventListener('push', (event) => {
    if (!event.data) return;
    
    const data = event.data.json();
    const options = {
        body: data.body || 'Notifikasi dari Aplikasi Gaji Pegawai',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%234f46e5"/><text x="50" y="70" font-family="Arial" font-size="60" text-anchor="middle" fill="white">💰</text></svg>',
        badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%234f46e5"/><text x="50" y="70" font-family="Arial" font-size="60" text-anchor="middle" fill="white">💰</text></svg>',
        tag: 'gaji-pegawai-notification',
        renotify: true,
        actions: [
            {
                action: 'open',
                title: 'Buka Aplikasi'
            },
            {
                action: 'close',
                title: 'Tutup'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'Aplikasi Gaji Pegawai', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'open') {
        event.waitUntil(
            clients.matchAll({type: 'window'}).then((clientList) => {
                for (const client of clientList) {
                    if (client.url === self.location.origin && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
        );
    }
});