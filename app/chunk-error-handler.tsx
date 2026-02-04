"use client";

import { useEffect } from "react";

/**
 * Global chunk loading error handler
 * Automatically reloads the page when chunk loading fails
 */
export function ChunkErrorHandler() {
  useEffect(() => {
    const handleChunkError = (event: ErrorEvent) => {
      const error = event.error || event.message || "";
      const errorString = String(error);
      
      // Check if it's a chunk loading error
      if (
        errorString.includes("chunk") ||
        errorString.includes("Loading chunk") ||
        errorString.includes("ChunkLoadError") ||
        errorString.includes("Failed to fetch dynamically imported module")
      ) {
        console.warn("Chunk loading error detected, clearing cache and reloading...", error);
        event.preventDefault();
        
        // Clear all caches to remove stale chunks
        if (typeof caches !== "undefined") {
          caches.keys().then((cacheNames) => {
            cacheNames.forEach((cacheName) => {
              caches.delete(cacheName);
            });
          });
        }
        
        // Unregister service worker to force fresh fetch
        if (navigator.serviceWorker) {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            registrations.forEach((registration) => {
              registration.unregister();
            });
          });
        }
        
        // Reload after a short delay to allow cache clearing
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        
        return true;
      }
      return false;
    };

    // Listen for unhandled errors
    window.addEventListener("error", handleChunkError);
    
    // Listen for unhandled promise rejections (chunk errors often come as promises)
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const errorString = String(reason?.message || reason || "");
      
      if (
        errorString.includes("chunk") ||
        errorString.includes("Loading chunk") ||
        errorString.includes("ChunkLoadError")
      ) {
        console.warn("Chunk loading promise rejection detected, clearing cache and reloading...", reason);
        event.preventDefault();
        
        // Clear all caches to remove stale chunks
        if (typeof caches !== "undefined") {
          caches.keys().then((cacheNames) => {
            cacheNames.forEach((cacheName) => {
              caches.delete(cacheName);
            });
          });
        }
        
        // Unregister service worker to force fresh fetch
        if (navigator.serviceWorker) {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            registrations.forEach((registration) => {
              registration.unregister();
            });
          });
        }
        
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    };
    
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleChunkError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
