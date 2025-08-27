/**
 * 🏓 Ping Pong Tournament Manager
 * Service Worker for PWA functionality
 * 
 * @version 1.0.0
 * @author Tournament Manager Team
 */

const CACHE_NAME = 'ping-pong-tournament-v1.0.0';
const STATIC_CACHE_NAME = 'ping-pong-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'ping-pong-dynamic-v1.0.0';

// Files to cache immediately
const STATIC_FILES = [
    '/pingpong/',
    '/pingpong/index.php',
    '/pingpong/js/app.js',
    '/pingpong/manifest.json',
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/lucide@latest/dist/umd/lucide.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// Files to cache on demand
const DYNAMIC_CACHE_PATTERNS = [
    /\/pingpong\/api\//,
    /\/pingpong\/assets\//,
    /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
    /\.(?:css|js)$/
];

// Files to never cache (always fetch from network)
const NETWORK_ONLY_PATTERNS = [
    /\/pingpong\/api\/.*\.php$/,
    /\/pingpong\/install\//
];

/**
 * Service Worker Installation
 */
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then((cache) => {
                console.log('📦 Service Worker: Caching static files');
                return cache.addAll(STATIC_FILES.map(url => {
                    // Handle external URLs differently
                    if (url.startsWith('http')) {
                        return new Request(url, { mode: 'cors' });
                    }
                    return url;
                }));
            })
            .catch((error) => {
                console.warn('⚠️ Service Worker: Some files failed to cache:', error);
                // Continue installation even if some files fail to cache
                return Promise.resolve();
            })
            .then(() => {
                console.log('✅ Service Worker: Installation complete');
                // Skip waiting to activate immediately
                return self.skipWaiting();
            })
    );
});

/**
 * Service Worker Activation
 */
self.addEventListener('activate', (event) => {
    console.log('🚀 Service Worker: Activating...');
    
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((cacheName) => {
                            return cacheName.startsWith('ping-pong-') && 
                                   cacheName !== STATIC_CACHE_NAME && 
                                   cacheName !== DYNAMIC_CACHE_NAME;
                        })
                        .map((cacheName) => {
                            console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            }),
            // Take control of all clients immediately
            self.clients.claim()
        ]).then(() => {
            console.log('✅ Service Worker: Activation complete');
        })
    );
});

/**
 * Fetch Event Handler
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip chrome-extension and other non-http(s) requests
    if (!url.protocol.startsWith('http')) {
        return;
    }
    
    // Check if this should never be cached (network only)
    const isNetworkOnly = NETWORK_ONLY_PATTERNS.some(pattern => pattern.test(url.pathname));
    
    if (isNetworkOnly) {
        // Always fetch from network for API calls and installation
        event.respondWith(fetch(request));
        return;
    }
    
    // Handle caching strategy
    event.respondWith(handleFetchRequest(request));
});

/**
 * Handle fetch requests with caching strategy
 */
async function handleFetchRequest(request) {
    const url = new URL(request.url);
    
    try {
        // Check if it's in static cache first
        const staticResponse = await caches.match(request, { cacheName: STATIC_CACHE_NAME });
        if (staticResponse) {
            return staticResponse;
        }
        
        // Check if it matches dynamic cache patterns
        const shouldCacheDynamically = DYNAMIC_CACHE_PATTERNS.some(pattern => 
            pattern.test(url.pathname) || pattern.test(url.href)
        );
        
        if (shouldCacheDynamically) {
            return handleDynamicCache(request);
        }
        
        // For everything else, try cache first, then network
        return handleCacheFirst(request);
        
    } catch (error) {
        console.error('Service Worker fetch error:', error);
        return handleFallback(request);
    }
}

/**
 * Cache First Strategy
 */
async function handleCacheFirst(request) {
    try {
        // Try cache first
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            // Update cache in background
            updateCacheInBackground(request);
            return cachedResponse;
        }
        
        // If not in cache, fetch from network
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        return handleFallback(request);
    }
}

/**
 * Dynamic Cache Strategy (Network First with Cache Fallback)
 */
async function handleDynamicCache(request) {
    try {
        // Try network first
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache successful response
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        // If network fails, try cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        return handleFallback(request);
    }
}

/**
 * Update cache in background
 */
async function updateCacheInBackground(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
    } catch (error) {
        // Ignore background update errors
        console.debug('Background cache update failed:', error);
    }
}

/**
 * Handle fallbacks for failed requests
 */
async function handleFallback(request) {
    const url = new URL(request.url);
    
    // For HTML pages, return the main page
    if (request.headers.get('Accept')?.includes('text/html')) {
        const fallbackResponse = await caches.match('/pingpong/');
        if (fallbackResponse) {
            return fallbackResponse;
        }
    }
    
    // For API requests, return a basic error response
    if (url.pathname.includes('/api/')) {
        return new Response(JSON.stringify({
            success: false,
            message: 'Network error - using offline mode',
            data: [],
            offline: true
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
    
    // For images, return a placeholder if available
    if (request.destination === 'image') {
        // Return a basic 1x1 transparent pixel
        return new Response(
            new Uint8Array([
                71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 128, 0, 0, 0, 0, 0,
                255, 255, 255, 33, 249, 4, 1, 0, 0, 0, 0, 44, 0, 0, 0, 0,
                1, 0, 1, 0, 0, 2, 2, 68, 1, 0, 59
            ]), 
            {
                headers: { 'Content-Type': 'image/gif' }
            }
        );
    }
    
    // Default fallback
    return new Response('Offline - Content not available', {
        status: 503,
        headers: {
            'Content-Type': 'text/plain'
        }
    });
}

/**
 * Background Sync for offline actions
 */
self.addEventListener('sync', (event) => {
    console.log('🔄 Service Worker: Background sync triggered:', event.tag);
    
    if (event.tag === 'tournament-sync') {
        event.waitUntil(syncTournamentData());
    }
    
    if (event.tag === 'score-sync') {
        event.waitUntil(syncScoreData());
    }
});

/**
 * Push Notifications
 */
self.addEventListener('push', (event) => {
    if (!event.data) {
        return;
    }
    
    const data = event.data.json();
    
    const options = {
        body: data.body || 'New tournament update available',
        icon: '/pingpong/assets/icon-192.png',
        badge: '/pingpong/assets/badge-72.png',
        data: data.data || {},
        actions: [
            {
                action: 'view',
                title: 'View',
                icon: '/pingpong/assets/action-view.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/pingpong/assets/action-close.png'
            }
        ],
        vibrate: [200, 100, 200],
        tag: data.tag || 'tournament-update',
        requireInteraction: data.requireInteraction || false
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'Tournament Update', options)
    );
});

/**
 * Notification Click Handler
 */
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow('/pingpong/')
        );
    }
});

/**
 * Message Handler (for communication with main app)
 */
self.addEventListener('message', (event) => {
    const { type, data } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'GET_VERSION':
            event.ports[0].postMessage({ version: CACHE_NAME });
            break;
            
        case 'CLEAR_CACHE':
            clearAllCaches().then(() => {
                event.ports[0].postMessage({ success: true });
            });
            break;
            
        case 'CACHE_TOURNAMENT':
            cacheTournamentData(data).then(() => {
                event.ports[0].postMessage({ success: true });
            });
            break;
            
        default:
            console.log('Unknown message type:', type);
    }
});

/**
 * Sync tournament data when back online
 */
async function syncTournamentData() {
    try {
        // Get pending tournament actions from IndexedDB or localStorage
        // This would sync any offline changes when back online
        console.log('🔄 Syncing tournament data...');
        // Implementation would depend on your offline storage strategy
        return Promise.resolve();
    } catch (error) {
        console.error('Failed to sync tournament data:', error);
        throw error;
    }
}

/**
 * Sync score data when back online
 */
async function syncScoreData() {
    try {
        console.log('🔄 Syncing score data...');
        // Implementation for syncing offline score entries
        return Promise.resolve();
    } catch (error) {
        console.error('Failed to sync score data:', error);
        throw error;
    }
}

/**
 * Clear all caches
 */
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    return Promise.all(
        cacheNames
            .filter(name => name.startsWith('ping-pong-'))
            .map(name => caches.delete(name))
    );
}

/**
 * Cache tournament data for offline use
 */
async function cacheTournamentData(tournamentData) {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const response = new Response(JSON.stringify(tournamentData), {
        headers: { 'Content-Type': 'application/json' }
    });
    return cache.put('/pingpong/api/tournaments.php', response);
}

console.log('🏓 Service Worker loaded successfully');