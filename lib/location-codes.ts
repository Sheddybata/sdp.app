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
    ] = parts.slice(0, 9).map((p) => p.replace(/^\"|\"$/g, ""));

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
