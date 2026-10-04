"use client";

import { Loader2, MapPin, MapPinOff } from "lucide-react";
import type { useGeolocation } from "./useGeolocation";

export function GeoStatus({ geo, locate }: Pick<ReturnType<typeof useGeolocation>, "geo" | "locate">) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm">
      {geo.status === "ok" ? (
        <>
          <MapPin className="h-4 w-4 text-sdp-accent" />
          <span className="text-neutral-700">Location added (accurate to about {Math.round(geo.fix.accuracy)} m)</span>
        </>
      ) : geo.status !== "unavailable" ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />
          <span className="text-neutral-600">Getting your location (optional)…</span>
        </>
      ) : (
        <>
          <MapPinOff className="h-4 w-4 text-neutral-400" />
          <span className="text-neutral-600">{geo.reason} You can still submit.</span>
          <button type="button" className="font-medium text-sdp-primary underline" onClick={locate}>
            Try again
          </button>
        </>
      )}
    </div>
  );
}
