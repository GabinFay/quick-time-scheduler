
/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */

// This gives TypeScript the correct context that this file is a service worker
declare const self: ServiceWorkerGlobalScope;

import { precacheAndRoute } from 'workbox-precaching';

// Use the type provided by workbox-precaching for the manifest
precacheAndRoute(self.__WB_MANIFEST);

// Default behavior: return from the cache if available, otherwise fetch from the network
self.addEventListener('fetch', (event: FetchEvent) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
