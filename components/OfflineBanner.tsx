"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/** Shows a banner when the user is offline. PWA-friendly. */
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    setIsOffline(typeof navigator !== "undefined" && !navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-amber-500 px-4 py-3 text-sm font-medium text-white shadow-lg"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
      <span>You&apos;re offline. Enrollment save and verification require a connection.</span>
    </div>
  );
}
