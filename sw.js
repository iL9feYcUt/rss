self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  clients.claim()
})

// Simple fetch passthrough — extend caching as needed
self.addEventListener('fetch', (event) => {
  // By default, let the network handle it.
})
