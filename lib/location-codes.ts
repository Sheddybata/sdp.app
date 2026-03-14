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

// Cache maps
const wardLookup = new Map<Key, WardCodeEntry>();
const stateCodeMap = new Map<string, string>();

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
    // state_code,state_name,lga_code,lga_name,ward_code,ward_name,pu_code,pu_name
    const parts = line.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/);
    if (parts.length < 6) continue;
    const [stateCode, stateName, lgaCode, lgaName, wardCode, wardName] = parts.map((p) =>
      p.replace(/^\"|\"$/g, "")
    );
    const key = `${stateName}|${lgaName}|${wardName}`.toLowerCase();
    if (!wardLookup.has(key)) {
      wardLookup.set(key, { stateCode, lgaCode, wardCode });
    }
    // Also keep state code map
    if (!stateCodeMap.has(stateName.toLowerCase())) {
      stateCodeMap.set(stateName.toLowerCase(), stateCode);
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
