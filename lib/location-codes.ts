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

// Cache maps keyed by ids (state|lga|ward)
const wardLookup = new Map<Key, WardCodeEntry>();
const stateCodeMap = new Map<string, string>(); // keyed by state id

function loadCsv() {
  if (wardLookup.size > 0) return;
  const file = path.join(process.cwd(), "location-codes.csv");
  if (!fs.existsSync(file)) {
    throw new Error("location-codes.csv not found. Run scripts/generate-location-codes.js");
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

    const key = `${stateId}|${lgaId}|${wardId}`.toLowerCase();
    if (!wardLookup.has(key)) {
      wardLookup.set(key, { stateCode, lgaCode, wardCode });
    }
    // Also keep state code map keyed by state id
    if (stateId && !stateCodeMap.has(stateId.toLowerCase())) {
      stateCodeMap.set(stateId.toLowerCase(), stateCode);
    }
  }
}

export function getWardCodes(state: string, lga: string, ward: string) {
  loadCsv();
  const key = `${state}|${lga}|${ward}`.toLowerCase();
  return wardLookup.get(key) || null;
}

export function getStateCode(state: string) {
  loadCsv();
  return stateCodeMap.get(state.toLowerCase()) || null;
}
