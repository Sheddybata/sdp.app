"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<{ prompt: () => Promise<void> } | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (isStandalone) return;
    try {
      const stored = localStorage.getItem("sdp-install-dismissed");
      if (stored && Date.now() - Number(stored) < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
        return;
      }
    } catch { /* ignore */ }
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua);
    if (ios) { setIsIOS(true); return; }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as unknown as { prompt: () => Promise<void> });
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) { await deferredPrompt.prompt(); setDeferredPrompt(null); }
    setDismissed(true);
  };

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem("sdp-install-dismissed", String(Date.now())); } catch { /* ignore */ }
  };

  if (dismissed || (!deferredPrompt && !isIOS)) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between gap-4 border-t border-neutral-200 bg-white px-4 py-3 shadow-lg">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-neutral-900">Add to Home Screen</p>
        <p className="text-xs text-neutral-600">Install for quick access — works offline</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {deferredPrompt ? (
          <button
            type="button"
            onClick={handleInstall}
            className="flex items-center gap-2 rounded-lg bg-sdp-primary px-4 py-2 text-sm font-medium text-white hover:bg-[#e0762a] min-h-[44px]"
          >
            <Download className="h-4 w-4" />
            Install
          </button>
        ) : isIOS ? (
          <p className="text-xs text-neutral-600">Tap Share → Add to Home Screen</p>
        ) : null}
        <button type="button" onClick={handleDismiss} className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 min-h-[44px] min-w-[44px]" aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
