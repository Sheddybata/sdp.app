/**
 * Extract INEC constituency lists + best-effort links to existing location-codes.
 *
 * Sources (kept as re-run inputs):
 *   public/agents/INEC 2026 List of Federal & State Constiuencies.xls
 *   public/agents/PU.xlsx (composition matching aid)
 *   public/location-codes.csv (canonical State→LGA→Ward→PU ids/codes)
 *
 * Output: public/constituency-data/
 *   senatorial.json, federal.json, state_assembly.json
 *   constituency_links.json, unmapped.json, index.json
 *   manual_links.json (created empty if missing; never overwritten)
 *
 * Run: npm run extract-constituencies
 */

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const ROOT = path.join(__dirname, "..");
const AGENTS_DIR = path.join(ROOT, "public", "agents");
const OUT_DIR = path.join(ROOT, "public", "constituency-data");
const LOCATION_CODES = path.join(ROOT, "public", "location-codes.csv");
const CONST_XLS = path.join(
  AGENTS_DIR,
  "INEC 2026 List of Federal & State Constiuencies.xls"
);
const PU_XLSX = path.join(AGENTS_DIR, "PU.xlsx");
const MANUAL_LINKS = path.join(OUT_DIR, "manual_links.json");

function toSlug(s) {
  if (typeof s !== "string") return "";
  return s
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeName(s) {
  return String(s || "")
    .toUpperCase()
    .replace(/[./']/g, " ")
    .replace(/\bL\.?\s*G\.?\s*A\.?S?\b/gi, " ")
    .replace(/\bLOCAL GOVERNMENT\b/gi, " ")
    .replace(/\bAREA\b/gi, " ")
    .replace(/\bTHE ENTIRE GEOGRAPHICAL AREAS? OF\b/gi, " ")
    .replace(/\bTHE ENTIRE\b/gi, " ")
    .replace(/\bGEOGRAPHICAL AREAS?\b/gi, " ")
    .replace(/\bAND\b/g, " ")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCsvLine(line) {
  const out = [];
  let i = 0;
  while (i <= line.length) {
    if (line[i] === '"') {
      let end = i + 1;
      while (end < line.length) {
        const next = line.indexOf('"', end);
        if (next === -1) break;
        if (line[next + 1] === '"') {
          end = next + 2;
          continue;
        }
        end = next;
        break;
      }
      out.push(line.slice(i + 1, end).replace(/""/g, '"'));
      i = end + 1;
      if (line[i] === ",") i += 1;
    } else {
      let end = line.indexOf(",", i);
      if (end === -1) end = line.length;
      out.push(line.slice(i, end).trim());
      i = end + 1;
    }
  }
  return out;
}

/** stateName upper → { stateId, stateName, stateCode, lgas: Map<normName, {lgaId,lgaName,lgaCode,wards: Map}> } */
function loadLocationIndex() {
  const text = fs.readFileSync(LOCATION_CODES, "utf8");
  const lines = text.split(/\r?\n/);
  lines.shift();
  const byStateName = new Map();
  const byStateId = new Map();

  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = parseCsvLine(line);
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
    ] = parts;
    if (!stateId || !lgaId || !wardId) continue;

    let st = byStateId.get(stateId.toLowerCase());
    if (!st) {
      st = {
        stateId: stateId.toLowerCase(),
        stateName,
        stateCode,
        lgas: new Map(),
        lgasByNorm: new Map(),
      };
      byStateId.set(st.stateId, st);
      byStateName.set(normalizeName(stateName), st);
      // FCT aliases
      if (st.stateId === "federal-capital-territory") {
        byStateName.set("FCT", st);
        byStateName.set("FEDERAL CAPITAL TERRITORY", st);
        byStateName.set(normalizeName("FCT ABUJA"), st);
      }
    }

    let lg = st.lgas.get(lgaId.toLowerCase());
    if (!lg) {
      lg = {
        lgaId: lgaId.toLowerCase(),
        lgaName,
        lgaCode,
        wards: new Map(),
        wardsByNorm: new Map(),
        wardsByNum: new Map(),
      };
      st.lgas.set(lg.lgaId, lg);
      st.lgasByNorm.set(normalizeName(lgaName), lg);
    }

    const wKey = wardId.toLowerCase();
    if (!lg.wards.has(wKey)) {
      const ward = {
        wardId: wKey,
        wardName,
        wardCode,
        puCount: 0,
      };
      lg.wards.set(wKey, ward);
      lg.wardsByNorm.set(normalizeName(wardName), ward);
      const num = String(parseInt(wardCode, 10));
      if (!lg.wardsByNum.has(num)) lg.wardsByNum.set(num, ward);
    }
    if (puCode) lg.wards.get(wKey).puCount += 1;
  }

  return { byStateName, byStateId };
}

/** INEC 2-letter suffixes used in SD/FC/SC codes (Excel sometimes omits state headers). */
const CODE_SUFFIX_TO_STATE = {
  AB: "ABIA",
  AD: "ADAMAWA",
  AK: "AKWA IBOM",
  AN: "ANAMBRA",
  BA: "BAUCHI",
  BY: "BAYELSA",
  BN: "BENUE",
  BE: "BENUE",
  BO: "BORNO",
  CR: "CROSS RIVER",
  DE: "DELTA",
  EB: "EBONYI",
  ED: "EDO",
  EK: "EKITI",
  EN: "ENUGU",
  FC: "FEDERAL CAPITAL TERRITORY",
  GO: "GOMBE",
  IM: "IMO",
  JI: "JIGAWA",
  KD: "KADUNA",
  KN: "KANO",
  KT: "KATSINA",
  KE: "KEBBI",
  KO: "KOGI",
  KW: "KWARA",
  LA: "LAGOS",
  NA: "NASARAWA",
  NW: "NASARAWA", // Excel uses NW + spelling NASSARAWA
  NI: "NIGER",
  OG: "OGUN",
  ON: "ONDO",
  OS: "OSUN",
  OY: "OYO",
  PL: "PLATEAU",
  RI: "RIVERS",
  SO: "SOKOTO",
  TA: "TARABA",
  TR: "TARABA",
  YO: "YOBE",
  ZA: "ZAMFARA",
  FCT: "FEDERAL CAPITAL TERRITORY",
};

function resolveState(raw, index) {
  let n = normalizeName(String(raw || "").replace(/,$/, ""));
  if (!n) return null;
  if (n === "NASSARAWA") n = "NASARAWA";
  if (n === "FCT" || n === "FCT ABUJA") n = "FEDERAL CAPITAL TERRITORY";
  return index.byStateName.get(n) || null;
}

/** Prefer state from seat code suffix when Excel forgot a state header row. */
function resolveStateForItem(item, index) {
  const m = String(item.code || "").match(/\/([A-Z]{2,3})$/i);
  if (m) {
    const named = CODE_SUFFIX_TO_STATE[m[1].toUpperCase()];
    if (named) {
      const st = resolveState(named, index);
      if (st) return st;
    }
  }
  return resolveState(item.stateRaw, index);
}

/** Strip NORTH/SOUTH/I/II etc. so "BENDE NORTH" → "BENDE", "UMUAHIA EAST" → "UMUAHIA". */
function seatNameCore(name) {
  return normalizeName(name)
    .replace(/\bL G A\b/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(NORTH|SOUTH|EAST|WEST|CENTRAL|I|II|III|IV|V)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Common Excel ↔ location-codes spelling differences (normalized keys). */
const LGA_ALIASES = {
  IHALA: "IHALA",
  IHIALA: "IHALA",
  SHOMOLU: "SOMOLU",
  SOMOLU: "SOMOLU",
  MAIDUGURI: "MAIDUGURI M C",
  "MAIDUGURI METROPOLITAN": "MAIDUGURI M C",
  "UGWUNA AGBO": "UGWUNAGBO",
  UGWUNAGBO: "UGWUNAGBO",
  AGBATU: "AGATU",
  AGATU: "AGATU",
  RINGIN: "RINGIM",
  RINGIM: "RINGIM",
  DAMBATTA: "DANBATA",
  DANBATTA: "DANBATA",
  DANBATA: "DANBATA",
  NASSARAWA: "NASARAWA",
  MALUMFASHI: "MALUFASHI",
  "MALUMFASHI EAST": "MALUFASHI",
  ALEIRO: "ALIERO",
  ALIERO: "ALIERO",
  CHANCHANGA: "CHANCHAGA",
  CHANCHAGA: "CHANCHAGA",
  KOTANGORA: "KONTAGORA",
  KONTANGORA: "KONTAGORA",
  KONTAGORA: "KONTAGORA",
  "BARKIN LADI": "BARIKIN LADI",
  "BARIKIN LADI": "BARIKIN LADI",
  YUNUFARI: "YUSUFARI",
  YUSUFARI: "YUSUFARI",
  DONDA: "DONGA",
  DONGA: "DONGA",
  ESE: "ESE ODO",
  "ESE ODO": "ESE ODO",
  MARKAFI: "MAKARFI",
  MAKARFI: "MAKARFI",
  KAURA: "KAURA",
  KAURU: "KAURU",
  YAMALTU: "YALMALTU DEBA",
  "YAMALTU EAST": "YALMALTU DEBA",
  "YAMALTU WEST": "YALMALTU DEBA",
  "YALMALTU DEBA": "YALMALTU DEBA",
  "PERO CHONGE": "SHONGOM",
  CHIROMA: "NINGI",
  AZARE: "KATAGUM",
  TAPA: "EDATTI",
  "ODO OGUN": "ASA",
  PENGANA: "BASSA",
  "RUKUBA IRIGWE": "BASSA",
  RUKUBA: "BASSA",
  IRIGWE: "BASSA",
  KASHIMBILA: "TAKUM",
  "GOYA NGEJI": "YUNUSARI",
  GOYA: "YUNUSARI",
  NGEJI: "YUNUSARI",
  "UNGUWAR SANUSI": "KADUNA SOUTH",
  "UNG SANUSI": "KADUNA SOUTH",
  "CHAWAI KAURU": "KAURU",
  KEWAYE: "ZARIA", // Zaria Kewaye state constituency (Excel: 7 RAs of Kewaye)
};

function findLgaFuzzy(st, rawName) {
  let n = normalizeName(rawName);
  if (!n) return null;
  if (LGA_ALIASES[n]) n = LGA_ALIASES[n];
  // also try alias after stripping direction words
  const core = seatNameCore(rawName);
  if (LGA_ALIASES[core]) n = LGA_ALIASES[core];

  if (st.lgasByNorm.has(n)) return st.lgasByNorm.get(n);
  const compact = n.replace(/\s+/g, "");
  for (const [k, lg] of st.lgasByNorm.entries()) {
    if (k.replace(/\s+/g, "") === compact) return lg;
  }
  // longest LGA name contained in / containing the query
  let best = null;
  let bestLen = 0;
  for (const [k, lg] of st.lgasByNorm.entries()) {
    const kc = k.replace(/\s+/g, "");
    if (n.includes(k) || k.includes(n) || compact.includes(kc) || kc.includes(compact)) {
      if (k.length > bestLen) {
        best = lg;
        bestLen = k.length;
      }
    }
  }
  return best;
}

/**
 * Infer home LGA for a State Assembly seat:
 * - "BENDE NORTH" + Ward 01–06 → BENDE LGA
 * - "PALI" + Ward 01–05 → LGA that contains a ward named PALI
 * - composition "… of YAKURR LGA" → YAKURR
 */
function inferHomeLga(st, seatName, composition) {
  const comp = String(composition || "");
  const ofMatch = comp.match(
    /(?:of|in)\s+([A-Za-z0-9 .'/&-]+?)(?:\s+L\.?G\.?A\.?S?)?(?:\s*[\(:]|$)/i
  );
  if (ofMatch) {
    const lg = findLgaFuzzy(st, ofMatch[1]);
    if (lg) return lg;
  }

  const core = seatNameCore(seatName);
  if (core) {
    const exact = findLgaFuzzy(st, core);
    if (exact) return exact;
    // "UMUAHIA" → prefer any LGA starting with UMUAHIA
    const starts = [];
    for (const [k, lg] of st.lgasByNorm.entries()) {
      if (k.startsWith(core) || core.startsWith(k)) starts.push(lg);
    }
    if (starts.length === 1) return starts[0];
    if (starts.length > 1) return starts[0];
  }

  // Seat title tokens that are ward names inside an LGA (e.g. PALI, DUGURI)
  const tokens = String(seatName)
    .split(/[/&,]+/)
    .map((t) => normalizeName(t))
    .filter((t) => t.length > 2);
  for (const tok of tokens) {
    for (const lg of st.lgas.values()) {
      if (
        lg.wardsByNorm.has(tok) ||
        Array.from(lg.wardsByNorm.keys()).some((k) => k.includes(tok) || tok.includes(k))
      ) {
        return lg;
      }
    }
  }

  // Full seat name equals LGA (ABA NORTH)
  return findLgaFuzzy(st, seatName);
}

function parseSheet(wb, sheetName) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null });
  let currentState = null;
  const items = [];
  for (const r of rows) {
    const a = r[0];
    const b = r[1];
    const c = r[2];
    const d = r[3];
    const e = r[4];
    if (
      typeof a === "string" &&
      a &&
      (b == null || b === "") &&
      (c == null || c === "") &&
      a !== "S/N" &&
      !String(a).startsWith("NAME OF")
    ) {
      currentState = String(a).replace(/,$/, "").trim();
      continue;
    }
    if (a === "S/N") continue;
    if (typeof a === "number" && typeof b === "string" && c != null && String(c).trim()) {
      items.push({
        sn: a,
        name: String(b).trim().replace(/\s+/g, " "),
        code: String(c).trim(),
        composition: d != null ? String(d).trim() : "",
        collationCentre: e != null ? String(e).trim() : "",
        stateRaw: currentState,
      });
    }
  }
  return items;
}

function extractLgaNamesFromComposition(composition) {
  let s = String(composition || "");
  if (!s.trim()) return [];
  const lower = s.toLowerCase();
  if (lower === "part of the lga" || lower.startsWith("part of the lga")) return [];
  if (/^ward\s*\d+/i.test(s) || /^ward (one|two)/i.test(s)) return [];

  s = s
    .replace(/The entire Geographical Areas? of /gi, "")
    .replace(/The Bende Geographical Areas? of /gi, "")
    .replace(/The entire /gi, "")
    .replace(/Geographical Areas? of /gi, "")
    .replace(/\bL\.?\s*G\.?\s*A\.?S?\b/gi, "")
    .replace(/\bL\.A\.As\b/gi, "")
    .replace(/\band\b/gi, ",")
    .replace(/\s+&\s+/g, ",")
    .replace(/\./g, " ");

  return s
    .split(/,/)
    .map((x) => normalizeName(x))
    .filter((x) => x && x !== "OF" && x.length > 1);
}

/**
 * Parse ward / RA numbers from composition:
 * "Ward 01 – 06", "Ward 02 – 04, 10 & 11", "Wards 01, 02, 04, 06, 08, 12-14",
 * "8 RAs OF YAKURR LGA (9,10,11,12,&3)", "5 RAs OF YAKURR LGA 1,2,4…"
 */
function parseWardNumberRanges(composition) {
  const s = String(composition || "");
  const nums = new Set();
  const addRange = (a, b) => {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    for (let i = lo; i <= hi; i++) if (i >= 1 && i <= 40) nums.add(String(i));
  };

  let m;
  const rangeRe = /(?:ward|wards|ras?)\s*0*(\d+)\s*[–\-to]+\s*0*(\d+)/gi;
  while ((m = rangeRe.exec(s))) addRange(parseInt(m[1], 10), parseInt(m[2], 10));

  // "12-14" without ward keyword (inside RA lists)
  const bareRange = /(?:^|[^0-9])0*(\d{1,2})\s*[–\-]\s*0*(\d{1,2})(?![0-9])/g;
  while ((m = bareRange.exec(s))) addRange(parseInt(m[1], 10), parseInt(m[2], 10));

  if (/ward|wards|\bras?\b/i.test(s)) {
    const singleRe = /(?:^|[^0-9])0*(\d{1,2})(?![0-9])/g;
    while ((m = singleRe.exec(s))) {
      const n = parseInt(m[1], 10);
      if (n >= 1 && n <= 40) nums.add(String(n));
    }
  }
  return [...nums];
}

function wardsByNumbers(st, lg, wardNums) {
  const wards = [];
  const missing = [];
  for (const num of wardNums) {
    const w = lg.wardsByNum.get(String(parseInt(num, 10)));
    if (w) wards.push(wardRef(st, lg, w));
    else missing.push(num);
  }
  return { wards, missing };
}

function extractWardNameTokens(composition) {
  const s = String(composition || "");
  if (/^the entire/i.test(s) && /lga/i.test(s)) return [];
  if (/^ward\s*\d+/i.test(s.trim())) return [];
  return s
    .split(/[,;/]/)
    .map((x) => normalizeName(x))
    .filter((x) => x && x.length > 2 && !/^WARD\s*\d+$/.test(x));
}

function wardRef(st, lg, ward) {
  return {
    stateId: st.stateId,
    stateName: st.stateName,
    stateCode: st.stateCode,
    lgaId: lg.lgaId,
    lgaName: lg.lgaName,
    lgaCode: lg.lgaCode,
    wardId: ward.wardId,
    wardName: ward.wardName,
    wardCode: ward.wardCode,
    locationCode: `${st.stateCode}/${lg.lgaCode}/${ward.wardCode}`,
    puCount: ward.puCount,
  };
}

function allWardsInLgas(st, lgas) {
  const out = [];
  for (const lg of lgas) {
    for (const ward of lg.wards.values()) out.push(wardRef(st, lg, ward));
  }
  return out;
}

function matchSenatorialOrFederal(item, kind, index) {
  const st = resolveStateForItem(item, index);
  const base = {
    code: item.code,
    name: item.name,
    kind,
    stateRaw: item.stateRaw,
    stateId: st?.stateId ?? null,
    stateName: st?.stateName ?? item.stateRaw,
    composition: item.composition,
    collationCentre: item.collationCentre,
  };
  if (!st) {
    return { seat: base, wards: [], status: "unmapped", reason: "state_not_found" };
  }

  const lgaNames = extractLgaNamesFromComposition(item.composition);
  const matchedLgas = [];
  const missing = [];
  for (const n of lgaNames) {
    const lg = findLgaFuzzy(st, n);
    if (lg) matchedLgas.push(lg);
    else missing.push(n);
  }

  if (matchedLgas.length === 0 && /entire/i.test(item.composition)) {
    const fromName = extractLgaNamesFromComposition(item.name.replace(/\//g, ","));
    for (const n of fromName) {
      const lg = findLgaFuzzy(st, n);
      if (lg) matchedLgas.push(lg);
    }
  }

  if (matchedLgas.length === 0) {
    return {
      seat: base,
      wards: [],
      status: "unmapped",
      reason: "no_lga_match",
      missingLgas: lgaNames,
    };
  }

  const wards = allWardsInLgas(st, matchedLgas);
  return {
    seat: base,
    wards,
    status: missing.length ? "partial" : "mapped",
    missingLgas: missing,
  };
}

function matchStateAssembly(item, index) {
  const st = resolveStateForItem(item, index);
  const base = {
    code: item.code,
    name: item.name,
    kind: "state_assembly",
    stateRaw: item.stateRaw,
    stateId: st?.stateId ?? null,
    stateName: st?.stateName ?? item.stateRaw,
    composition: item.composition,
    collationCentre: item.collationCentre || "",
  };
  if (!st) {
    return { seat: base, wards: [], status: "unmapped", reason: "state_not_found" };
  }

  const comp = item.composition || "";
  const lower = comp.toLowerCase().trim();

  // "The entire area of Esit Eket & Ibeno LGAs" / "The entire LGA(s)"
  if (/entire/.test(lower) && /lga/.test(lower)) {
    let lgas = extractLgaNamesFromComposition(comp)
      .map((n) => findLgaFuzzy(st, n))
      .filter(Boolean);
    if (!lgas.length) {
      const home = inferHomeLga(st, item.name, comp);
      if (home) lgas = [home];
    }
    if (!lgas.length) {
      const parts = item.name.split(/[/&]/).map((x) => findLgaFuzzy(st, x)).filter(Boolean);
      lgas = parts;
    }
    if (lgas.length) {
      return { seat: base, wards: allWardsInLgas(st, lgas), status: "mapped" };
    }
    return { seat: base, wards: [], status: "unmapped", reason: "entire_lga_unresolved" };
  }

  // "11 RAS OF SAKI WEST" / "10 RASOF MARKAFI" / "8 RASs OF YAKURR LGA 1,2,4…"
  if (/ras/i.test(lower) && /of/i.test(lower) && !/^ward\s*\d/i.test(lower)) {
    const rasOf = comp.match(/\d*\s*RAS+S?\s*OF\s+(.+)/i);
    const tail = (rasOf ? rasOf[1] : comp)
      .replace(/\bL\.?G\.?A\.?S?\b/gi, " ")
      .replace(/\bAND\b/gi, ",")
      .replace(/&/g, ",");
    // Drop trailing pure number lists from Yakurr-style tails for LGA name parse
    const namePart = tail.replace(/[\d,\s&]+$/g, " ").trim();
    const names = namePart
      .split(/[,/]/)
      .map((x) => x.trim())
      .filter((x) => x && !/^\d+$/.test(x) && !/^and$/i.test(x));
    const lgas = [];
    for (const name of names) {
      const lg = findLgaFuzzy(st, name) || inferHomeLga(st, name, "");
      if (lg && !lgas.find((x) => x.lgaId === lg.lgaId)) lgas.push(lg);
    }
    if (!lgas.length) {
      const home = inferHomeLga(st, item.name, comp);
      if (home) lgas.push(home);
    }
    // Yakurr-style: specific ward numbers after the LGA name
    const nums = parseWardNumberRanges(comp).filter((n) => {
      // drop the leading count in "8 RASs OF …" when it isn't a ward id list-only line
      return true;
    });
    // Prefer numbers that appear after "LGA" / in a list with AND/commas
    const afterLga = comp.split(/L\.?G\.?A\.?S?/i)[1] || "";
    const listNums = afterLga ? parseWardNumberRanges("Ward " + afterLga) : [];
    const useNums = listNums.length >= 3 ? listNums : nums.length >= 5 ? nums : [];
    if (lgas.length === 1 && useNums.length) {
      const { wards, missing } = wardsByNumbers(st, lgas[0], useNums);
      if (wards.length) {
        return {
          seat: base,
          wards,
          status: missing.length ? "partial" : "mapped",
          missingWards: missing,
        };
      }
    }
    if (lgas.length) {
      return { seat: base, wards: allWardsInLgas(st, lgas), status: "mapped" };
    }
  }

  // One LGA split into 2+ assembly seats by ward numbers / RAs
  // e.g. BENDE NORTH "Ward 01 – 06", YAKURR II "5 RAs OF YAKURR LGA (9,10…)"
  const wardNums = parseWardNumberRanges(comp);
  if (wardNums.length && (/ward|ras?\b/i.test(comp) || /–|-/.test(comp))) {
    const lg = inferHomeLga(st, item.name, comp);
    if (!lg) {
      return {
        seat: base,
        wards: [],
        status: "unmapped",
        reason: "ward_range_no_lga",
        wardNums,
      };
    }
    const { wards, missing } = wardsByNumbers(st, lg, wardNums);
    return {
      seat: base,
      wards,
      status: missing.length ? (wards.length ? "partial" : "unmapped") : "mapped",
      missingWards: missing,
      homeLga: lg.lgaName,
    };
  }

  // Named wards / RAs listed in composition (Lagos-style: "OKEKOTO,KEKE,DAROCHA")
  const tokens = extractWardNameTokens(comp);
  if (tokens.length && !/^part of/i.test(lower)) {
    const home = inferHomeLga(st, item.name, comp);
    const searchLgas = home ? [home, ...st.lgas.values()] : [...st.lgas.values()];
    const wards = [];
    const missing = [];
    for (const tok of tokens) {
      const tokBase = tok
        .replace(/\b(I|II|III|IV|V|VI|VII|VIII|IX|X|1|11|111|1V)\b/g, " ")
        .replace(/\s+/g, "")
        .replace(/(.)\1+/g, "$1"); // UPATA ↔ UPPATA, BOMA ↔ BOMO soft via stem
      const tokC = tok.replace(/\s+/g, "");
      let found = null;
      for (const lg of searchLgas) {
        const w =
          lg.wardsByNorm.get(tok) ||
          Array.from(lg.wardsByNorm.entries()).find(([k]) => {
            const kc = k.replace(/\s+/g, "");
            const kBase = k
              .replace(/\b(I|II|III|IV|V|VI|VII|VIII|IX|X|1|11|111|1V)\b/g, " ")
              .replace(/\s+/g, "")
              .replace(/(.)\1+/g, "$1");
            return (
              k === tok ||
              k.includes(tok) ||
              tok.includes(k) ||
              kc === tokC ||
              kc.includes(tokC) ||
              tokC.includes(kc) ||
              (tokBase.length > 3 && kBase.length > 3 && (tokBase === kBase || tokBase.startsWith(kBase.slice(0, 4)) || kBase.startsWith(tokBase.slice(0, 4))))
            );
          })?.[1];
        if (w) {
          found = wardRef(st, lg, w);
          break;
        }
      }
      if (found) wards.push(found);
      else missing.push(tok);
    }
    const list = [...new Map(wards.map((w) => [w.locationCode, w])).values()];
    if (list.length) {
      return {
        seat: base,
        wards: list,
        status: missing.length ? "partial" : "mapped",
        missingWards: missing,
      };
    }
  }

  // "Part of the LGA" — seat name is usually the LGA (ABA NORTH). Without ward
  // numbers we cannot split desks inside the LGA; attach the whole LGA as partial.
  if (/^part of/i.test(lower)) {
    const lg = inferHomeLga(st, item.name, comp);
    if (lg) {
      return {
        seat: base,
        wards: allWardsInLgas(st, [lg]),
        status: "partial",
        reason: "part_of_lga_no_ward_split",
      };
    }
    return { seat: base, wards: [], status: "unmapped", reason: "vague_part_of_lga" };
  }

  const lgByName = inferHomeLga(st, item.name, comp);
  if (lgByName && (!comp || /entire/i.test(lower))) {
    return { seat: base, wards: allWardsInLgas(st, [lgByName]), status: "mapped" };
  }

  return {
    seat: base,
    wards: [],
    status: "unmapped",
    reason: "no_match",
  };
}

function applyManualLinks(links, index) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  if (!fs.existsSync(MANUAL_LINKS)) {
    fs.writeFileSync(
      MANUAL_LINKS,
      JSON.stringify(
        {
          _comment:
            "Map constituency code → array of ward location codes (e.g. 37/01/01) or {stateId,lgaId,wardId}. Merged on extract.",
          links: {},
        },
        null,
        2
      )
    );
    return;
  }
  let manual;
  try {
    manual = JSON.parse(fs.readFileSync(MANUAL_LINKS, "utf8"));
  } catch {
    return;
  }
  const map = manual.links || manual;
  for (const [code, entries] of Object.entries(map)) {
    if (code.startsWith("_")) continue;
    if (!Array.isArray(entries) || !entries.length) continue;
    const wards = [];
    for (const entry of entries) {
      if (typeof entry === "string") {
        // "37/01/01" style
        const parts = entry.split("/");
        if (parts.length >= 3) {
          for (const st of index.byStateId.values()) {
            if (st.stateCode !== parts[0]) continue;
            for (const lg of st.lgas.values()) {
              if (lg.lgaCode !== parts[1]) continue;
              for (const ward of lg.wards.values()) {
                if (ward.wardCode === parts[2]) wards.push(wardRef(st, lg, ward));
              }
            }
          }
        }
      } else if (entry && entry.stateId && entry.lgaId && entry.wardId) {
        const st = index.byStateId.get(String(entry.stateId).toLowerCase());
        const lg = st?.lgas.get(String(entry.lgaId).toLowerCase());
        const ward = lg?.wards.get(String(entry.wardId).toLowerCase());
        if (st && lg && ward) wards.push(wardRef(st, lg, ward));
      }
    }
    if (!wards.length) continue;
    const existing = links[code] || {
      code,
      status: "unmapped",
      wards: [],
    };
    const merged = new Map([
      ...(existing.wards || []).map((w) => [w.locationCode, w]),
      ...wards.map((w) => [w.locationCode, w]),
    ]);
    links[code] = {
      ...existing,
      wards: [...merged.values()],
      status: "mapped",
      source: "manual",
    };
  }
}

function main() {
  if (!fs.existsSync(CONST_XLS)) {
    console.error("Missing constituencies file:", CONST_XLS);
    process.exit(1);
  }
  if (!fs.existsSync(LOCATION_CODES)) {
    console.error("Missing location-codes.csv:", LOCATION_CODES);
    process.exit(1);
  }

  console.log("Loading location-codes.csv…");
  const index = loadLocationIndex();
  console.log("States:", index.byStateId.size);

  console.log("Reading constituencies workbook…");
  const wb = XLSX.readFile(CONST_XLS);

  const sdRaw = parseSheet(wb, "SEN. DIST.");
  const fcRaw = parseSheet(wb, "FED. CONST.");
  const scRaw = parseSheet(wb, "STATE CONST.");

  const senatorial = [];
  const federal = [];
  const stateAssembly = [];
  const links = {};
  const unmapped = [];

  for (const item of sdRaw) {
    const result = matchSenatorialOrFederal(item, "senatorial", index);
    const st = resolveStateForItem(item, index);
    senatorial.push({
      code: item.code,
      name: item.name,
      stateId: st?.stateId ?? toSlug(item.stateRaw),
      stateName: st?.stateName ?? item.stateRaw,
      composition: item.composition,
      collationCentre: item.collationCentre,
    });
    links[item.code] = {
      code: item.code,
      kind: "senatorial",
      status: result.status,
      reason: result.reason,
      missingLgas: result.missingLgas,
      wards: result.wards,
    };
    if (result.status === "unmapped") unmapped.push({ ...result.seat, reason: result.reason });
  }

  for (const item of fcRaw) {
    const result = matchSenatorialOrFederal(item, "federal", index);
    const st = resolveStateForItem(item, index);
    federal.push({
      code: item.code,
      name: item.name,
      stateId: st?.stateId ?? toSlug(item.stateRaw),
      stateName: st?.stateName ?? item.stateRaw,
      composition: item.composition,
      collationCentre: item.collationCentre,
    });
    links[item.code] = {
      code: item.code,
      kind: "federal",
      status: result.status,
      reason: result.reason,
      missingLgas: result.missingLgas,
      wards: result.wards,
    };
    if (result.status === "unmapped") unmapped.push({ ...result.seat, reason: result.reason });
  }

  for (const item of scRaw) {
    const result = matchStateAssembly(item, index);
    const st = resolveStateForItem(item, index);
    stateAssembly.push({
      code: item.code,
      name: item.name,
      stateId: st?.stateId ?? toSlug(item.stateRaw),
      stateName: st?.stateName ?? item.stateRaw,
      composition: item.composition,
      collationCentre: item.collationCentre || "",
    });
    links[item.code] = {
      code: item.code,
      kind: "state_assembly",
      status: result.status,
      reason: result.reason,
      missingWards: result.missingWards,
      wards: result.wards,
    };
    if (result.status === "unmapped") {
      unmapped.push({
        ...result.seat,
        reason: result.reason,
        missingWards: result.missingWards,
        wardNums: result.wardNums,
      });
    }
  }

  applyManualLinks(links, index);

  // Refresh unmapped after manual links
  const unmappedAfter = [];
  for (const seat of [...senatorial, ...federal, ...stateAssembly]) {
    const link = links[seat.code];
    if (!link || link.status === "unmapped" || !(link.wards && link.wards.length)) {
      unmappedAfter.push({
        code: seat.code,
        name: seat.name,
        kind: link?.kind,
        stateId: seat.stateId,
        stateName: seat.stateName,
        composition: seat.composition,
        reason: link?.reason || "unmapped",
      });
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "senatorial.json"), JSON.stringify(senatorial, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, "federal.json"), JSON.stringify(federal, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, "state_assembly.json"), JSON.stringify(stateAssembly, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, "constituency_links.json"), JSON.stringify(links, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, "unmapped.json"), JSON.stringify(unmappedAfter, null, 2));
  fs.writeFileSync(
    path.join(OUT_DIR, "index.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        counts: {
          senatorial: senatorial.length,
          federal: federal.length,
          stateAssembly: stateAssembly.length,
          linked: Object.values(links).filter((l) => l.wards?.length).length,
          unmapped: unmappedAfter.length,
        },
      },
      null,
      2
    )
  );

  // PU.xlsx presence noted (used as optional future bridge; composition matching uses location-codes)
  if (fs.existsSync(PU_XLSX)) {
    console.log("PU.xlsx present (kept for reference; ward matching uses location-codes.csv).");
  }

  const mapped = Object.values(links).filter((l) => l.status === "mapped").length;
  const partial = Object.values(links).filter((l) => l.status === "partial").length;
  console.log(
    `Done. SD=${senatorial.length} FC=${federal.length} SC=${stateAssembly.length} mapped=${mapped} partial=${partial} unmapped=${unmappedAfter.length}`
  );
  console.log("Wrote:", OUT_DIR);
}

main();
