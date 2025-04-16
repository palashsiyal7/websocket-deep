// Service Worker for offline support
const CACHE_NAME = 'websocket-app-cache-v1';
const OFFLINE_URL = '/offline.html';

// Assets to cache
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/offline.html',
  // Add any other static assets here
];

// Install event - Cache assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  
  // Activate immediately
  self.skipWaiting();
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  
  // Ensure the service worker takes control immediately
  return self.clients.claim();
});

// Fetch event - Serve from cache or network
self.addEventListener('fetch', (event) => {
  // Skip WebSocket connections
  if (event.request.url.startsWith('ws://')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached response if found
      if (response) {
        return response;
      }
      
      // Clone the request (it's a one-time use stream)
      const fetchRequest = event.request.clone();
      
      // Try network request
      return fetch(fetchRequest)
        .then((response) => {
          // Check for valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response (it's a one-time use stream)
          const responseToCache = response.clone();
          
          // Cache the new response
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        })
        .catch((error) => {
          console.log('[Service Worker] Fetch failed; returning offline page instead.', error);
          
          // If main page request fails, show offline page
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
          
          // Otherwise, let the error propagate
          return new Response('Network error', {
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

// Handle connection status changes
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CONNECTION_STATUS') {
    // For future expansion - could sync with other tabs
    console.log('[Service Worker] Connection status update:', event.data.status);
  }
}); 