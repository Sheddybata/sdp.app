"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/** Wraps children and triggers router.refresh() on pull-down (mobile) */
export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pullY, setPullY] = useState(0);
  const pullRef = useRef(0);

  const refresh = useCallback(async () => {
    router.refresh();
  }, [router]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const start = e.touches[0]?.clientY ?? 0;
    (e.currentTarget as HTMLElement & { _pullStart?: number })._pullStart = start;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const el = e.currentTarget as HTMLElement & { _pullStart?: number };
    const start = el._pullStart;
    if (start == null) return;
    const y = e.touches[0]?.clientY ?? 0;
    const diff = y - start;
    if (diff > 0 && window.scrollY === 0) {
      pullRef.current = Math.min(diff, 80);
      setPullY(pullRef.current);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    const el = document.querySelector("[data-pull-refresh]") as HTMLElement & { _pullStart?: number };
    if (el) el._pullStart = undefined;
    const py = pullRef.current;
    setPullY(0);
    pullRef.current = 0;
    if (py > 50) refresh();
  }, [refresh]);

  return (
    <div
      data-pull-refresh
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="relative"
    >
      {pullY > 0 && (
        <div
          className="absolute left-0 right-0 top-0 z-10 flex items-center justify-center bg-neutral-100/90 py-2"
          style={{ height: pullY }}
        >
          <RefreshCw className={cn("h-5 w-5 text-sdp-primary", pullY > 50 && "animate-spin")} />
        </div>
      )}
      {children}
    </div>
  );
}
