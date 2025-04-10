
import { precacheAndRoute } from 'workbox-precaching';

// This will precache all the assets that are part of this build
precacheAndRoute(self.__WB_MANIFEST);

// Default behavior: return from the cache if available, otherwise fetch from the network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
