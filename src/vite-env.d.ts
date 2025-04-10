
/// <reference types="vite/client" />

// Add service worker type for Workbox
interface ServiceWorkerGlobalScope {
  __WB_MANIFEST: Array<{
    revision: string | null;
    url: string;
  }>;
}
