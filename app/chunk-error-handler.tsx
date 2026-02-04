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
        console.warn("Chunk loading error detected, reloading page...", error);
        event.preventDefault();
        
        // Reload after a short delay to allow error to be logged
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
        console.warn("Chunk loading promise rejection detected, reloading page...", reason);
        event.preventDefault();
        
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
