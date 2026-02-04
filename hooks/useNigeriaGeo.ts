"use client";

import { useMemo } from "react";
import {
  NIGERIA_STATES,
  convertExtractJsonToStateGeo,
  type StateGeo,
} from "@/lib/nigeria-geo";
import embeddedWards from "@/lib/nigeria-wards-embedded.json";

/**
 * Nigeria states/LGA/wards are permanently embedded (no fetch).
 * Data: 37 states, 775 LGAs, 8,798 wards from INEC-style dataset.
 */
export function useNigeriaGeo(): {
  states: StateGeo[];
  loading: boolean;
  error: string | null;
} {
  const states = useMemo(() => {
    try {
      const byState = embeddedWards as Record<string, Record<string, string[]>>;
      const converted = convertExtractJsonToStateGeo(byState);
      return converted.length > 0 ? converted : NIGERIA_STATES;
    } catch {
      return NIGERIA_STATES;
    }
  }, []);

  return {
    states,
    loading: false,
    error: null,
  };
}
