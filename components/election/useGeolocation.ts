"use client";

import { useCallback, useEffect, useState } from "react";

export type GeoFix = { latitude: number; longitude: number; accuracy: number };
type GeoState =
  | { status: "idle" | "locating" }
  | { status: "ok"; fix: GeoFix }
  | { status: "unavailable"; reason: string };

/** Optional location for submissions; never blocks the agent. */
export function useGeolocation(auto = true) {
  const [state, setState] = useState<GeoState>({ status: "idle" });

  const locate = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ status: "unavailable", reason: "This device cannot share location." });
      return;
    }
    setState({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setState({
          status: "ok",
          fix: { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy },
        }),
      (err) =>
        setState({
          status: "unavailable",
          reason: err.code === err.PERMISSION_DENIED ? "Location permission was not given." : "Could not get your location.",
        }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    if (auto) locate();
  }, [auto, locate]);

  return { geo: state, locate, fix: state.status === "ok" ? state.fix : null };
}

/** One quick attempt, for one-tap actions; resolves null instead of failing. */
export function quickLocation(timeoutMs = 6000): Promise<GeoFix | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs + 500);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy });
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 5 * 60 * 1000 }
    );
  });
}
