/**
 * Minimal lookup for state/LGA/ward codes based on the generated CSV.
 * For runtime use we load the CSV once; if this is too heavy, we can switch to a smaller JSON.
 */
import fs from "fs";
import path from "path";

type Key = string; // state|lga|ward path

type WardCodeEntry = {
  stateCode: string;
  lgaCode: string;
  wardCode: string;
};

// Cache maps keyed by ids (state|lga|ward) and by names
const wardLookupById = new Map<Key, WardCodeEntry>();
const wardLookupByName = new Map<Key, WardCodeEntry>();
const stateCodeMap = new Map<string, string>(); // keyed by state id
const lgaCodeMap = new Map<Key, string>(); // keyed by state|lga ids
/** Polling units per ward (state|lga|ward ids), in CSV order. */
const pollingUnitsByWard = new Map<Key, { code: string; name: string }[]>();

function resolveCodesCsvPath(): string | null {
  const candidates = [
    // Preferred: public asset in repo
    path.join(process.cwd(), "public", "location-codes.csv"),
    // Fallbacks for different runtime layouts
    path.join(process.cwd(), "location-codes.csv"),
    path.join(process.cwd(), ".next", "server", "public", "location-codes.csv"),
    path.join(process.cwd(), ".next", "standalone", "public", "location-codes.csv"),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      // ignore
    }
  }
  return null;
}

function loadCsv() {
  if (wardLookupById.size > 0) return;
  const file = resolveCodesCsvPath();
  if (!file) {
    throw new Error(
      "location-codes.csv not found (expected at public/location-codes.csv). " +
        "Ensure it is committed and deployed."
    );
  }
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.shift(); // header
  for (const line of lines) {
    if (!line.trim()) continue;
    // state_code,state_name,state_id,lga_code,lga_name,lga_id,ward_code,ward_name,ward_id,pu_code,pu_name
    const parts = line.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/);
    if (parts.length < 11) continue;
    const [
      stateCode,
      stateName,
      stateId,
      lgaCode,
      lgaName,
      lgaId,
      wardCode,
      wardName,
      wardId,
      puCode,
      puName,
    ] = parts.slice(0, 11).map((p) => p.replace(/^\"|\"$/g, ""));

    const keyId = `${stateId}|${lgaId}|${wardId}`.toLowerCase();
    const keyName = `${stateName}|${lgaName}|${wardName}`.toLowerCase();
    const entry = { stateCode, lgaCode, wardCode };

    if (stateId) {
      if (!wardLookupById.has(keyId)) {
        wardLookupById.set(keyId, entry);
      }
      if (!stateCodeMap.has(stateId.toLowerCase())) {
        stateCodeMap.set(stateId.toLowerCase(), stateCode);
      }
      const lgaKey = `${stateId}|${lgaId}`.toLowerCase();
      if (!lgaCodeMap.has(lgaKey)) {
        lgaCodeMap.set(lgaKey, lgaCode);
      }
      if (puCode) {
        const list = pollingUnitsByWard.get(keyId);
        if (list) list.push({ code: puCode, name: puName });
        else pollingUnitsByWard.set(keyId, [{ code: puCode, name: puName }]);
      }
    }
    if (stateName && lgaName && wardName && !wardLookupByName.has(keyName)) {
      wardLookupByName.set(keyName, entry);
    }
  }
}

export function getWardCodes(state: string, lga: string, ward: string) {
  loadCsv();
  const key = `${state}|${lga}|${ward}`.toLowerCase();
  return wardLookupById.get(key) || wardLookupByName.get(key) || null;
}

export function getStateCode(state: string) {
  loadCsv();
  return stateCodeMap.get(state.toLowerCase()) || null;
}

export function getLgaCode(state: string, lga: string) {
  loadCsv();
  return lgaCodeMap.get(`${state}|${lga}`.toLowerCase()) || null;
}

function normalizePuName(name: string): string {
  return name.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Polling unit code within a ward. Matches by name first; falls back to position
 * (`index` from the INEC JSON id suffix, e.g. `ward-3` → 3) when names differ slightly.
 */
export function getPollingUnitCode(
  state: string,
  lga: string,
  ward: string,
  pollingUnitName: string,
  index?: number
) {
  loadCsv();
  const list = pollingUnitsByWard.get(`${state}|${lga}|${ward}`.toLowerCase());
  if (!list?.length) return null;
  const target = normalizePuName(pollingUnitName);
  const byName = list.find((pu) => normalizePuName(pu.name) === target);
  if (byName) return byName.code;
  if (index != null && index >= 0 && index < list.length) return list[index].code;
  return null;
}
