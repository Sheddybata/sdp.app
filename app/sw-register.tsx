"use client";

import { useEffect } from "react";

/**
 * Registers the service worker for PWA offline support
 * Only runs in browser environment
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      // Unregister old service workers first to clear stale caches
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          // Check if this is an old version
          if (registration.scope.includes(window.location.origin)) {
            registration.unregister().then(() => {
              console.log("Old service worker unregistered");
              // Clear all caches
              caches.keys().then((cacheNames) => {
                cacheNames.forEach((cacheName) => {
                  caches.delete(cacheName);
                });
              });
            });
          }
        });
      });

      // Register new service worker
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" }) // Always check for updates
        .then((registration) => {
          console.log("Service Worker registered:", registration.scope);

          // Force immediate update check
          registration.update();

          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60000); // Check every minute

          // Handle updates
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed") {
                  if (navigator.serviceWorker.controller) {
                    // New service worker available, reload to activate
                    console.log("New service worker available, reloading...");
                    window.location.reload();
                  } else {
                    // First time installation
                    console.log("Service worker installed for the first time");
                  }
                }
              });
            }
          });

          // Handle controller change (new service worker activated)
          navigator.serviceWorker.addEventListener("controllerchange", () => {
            console.log("Service worker controller changed, reloading...");
            window.location.reload();
          });
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });
    }
  }, []);

  return null;
}
