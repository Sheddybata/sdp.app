"use client";

import { useCallback, useEffect, useState } from "react";

/** Single polling unit from INEC data */
export interface InecPollingUnit {
  id: string;
  name: string;
}

/** Ward with polling units (from public/inec-data/<state>.json) */
export interface InecWard {
  id: string;
  name: string;
  pollingUnits: InecPollingUnit[];
}

/** LGA with wards */
export interface InecLga {
  id: string;
  name: string;
  wards: InecWard[];
}

/** Full state data (one JSON per state) */
export interface InecStateData {
  id: string;
  name: string;
  lgas: InecLga[];
}

/** State list item from public/inec-data/index.json */
export interface InecStateItem {
  id: string;
  name: string;
}

const INDEX_URL = "/inec-data/index.json";

/**
 * Load INEC geography from extracted JSON (no server/API).
 * - Fetches state list from /inec-data/index.json once.
 * - When selectedStateId is set, fetches /inec-data/<id>.json and caches it.
 */
export function useInecGeo(selectedStateId: string | undefined) {
  const [states, setStates] = useState<InecStateItem[]>([]);
  const [indexLoading, setIndexLoading] = useState(true);
  const [stateData, setStateData] = useState<InecStateData | null>(null);
  const [stateDataLoading, setStateDataLoading] = useState(false);
  const [cache, setCache] = useState<Record<string, InecStateData>>({});

  useEffect(() => {
    let cancelled = false;
    fetch(INDEX_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load ${INDEX_URL}`);
        return r.json();
      })
      .then((data: { states: InecStateItem[] }) => {
        if (!cancelled && Array.isArray(data.states)) {
          setStates(data.states);
        }
      })
      .catch(() => {
        if (!cancelled) setStates([]);
      })
      .finally(() => {
        if (!cancelled) setIndexLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedStateId?.trim()) {
      setStateData(null);
      setStateDataLoading(false);
      return;
    }
    if (cache[selectedStateId]) {
      setStateData(cache[selectedStateId]);
      setStateDataLoading(false);
      return;
    }
    setStateDataLoading(true);
    setStateData(null);
    let cancelled = false;
    const url = `/inec-data/${encodeURIComponent(selectedStateId)}.json`;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load ${url}`);
        return r.json();
      })
      .then((data: InecStateData) => {
        if (!cancelled) {
          setCache((prev) => ({ ...prev, [selectedStateId]: data }));
          setStateData(data);
        }
      })
      .catch(() => {
        if (!cancelled) setStateData(null);
      })
      .finally(() => {
        if (!cancelled) setStateDataLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedStateId, cache]);

  return {
    states,
    loading: indexLoading,
    stateData: selectedStateId ? stateData : null,
    stateDataLoading: !!selectedStateId && stateDataLoading,
  };
}
