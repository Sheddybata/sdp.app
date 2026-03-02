/**
 * Extract INEC polling units from mykeels/inec-polling-units CSV.
 * Builds State → LGA → Ward → [Polling units] and writes one JSON per state.
 *
 * Run: node scripts/extract-inec-polling-units.cjs
 * Optional: INEC_CSV_PATH=./polling-units.csv node scripts/extract-inec-polling-units.cjs
 *   (if CSV is already downloaded; otherwise script downloads from GitHub)
 *
 * Output: public/inec-data/index.json (state list) + public/inec-data/<stateSlug>.json
 * Source: https://github.com/mykeels/inec-polling-units (polling-units.csv)
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const CSV_URL =
  "https://raw.githubusercontent.com/mykeels/inec-polling-units/master/polling-units.csv";
const OUT_DIR = path.join(__dirname, "..", "public", "inec-data");

function toSlug(s) {
  if (typeof s !== "string") return "";
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/**
 * Parse one CSV line respecting double-quoted fields (and "" as escaped quote).
 */
function parseCSVLine(line) {
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
      let part = line.slice(i + 1, end);
      part = part.replace(/""/g, '"');
      out.push(part);
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

function download(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${url}`));
          return;
        }
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      })
      .on("error", reject);
  });
}

async function main() {
  const csvPath = process.env.INEC_CSV_PATH;

  let csvText;
  if (csvPath && fs.existsSync(csvPath)) {
    console.log("Reading CSV from", csvPath);
    csvText = fs.readFileSync(csvPath, "utf8");
  } else {
    console.log("Downloading CSV from GitHub...");
    csvText = await download(CSV_URL);
  }

  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  const header = parseCSVLine(lines[0]);
  const nameIdx = header.indexOf("name");
  const wardIdx = header.indexOf("ward_name");
  const lgaIdx = header.indexOf("local_government_name");
  const stateIdx = header.indexOf("state_name");

  if (
    nameIdx === -1 ||
    wardIdx === -1 ||
    lgaIdx === -1 ||
    stateIdx === -1
  ) {
    throw new Error(
      "CSV missing required columns. Got: " + JSON.stringify(header)
    );
  }

  // hierarchy: state -> lga -> ward -> [ { id, name } ]
  const byState = {};

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    const stateName = (row[stateIdx] || "").trim();
    const lgaName = (row[lgaIdx] || "").trim();
    const wardName = (row[wardIdx] || "").trim();
    const puName = (row[nameIdx] || "").trim();
    if (!stateName || !lgaName || !wardName || !puName) continue;

    const stateSlug = toSlug(stateName) || "unknown";
    const lgaSlug = toSlug(lgaName) || "unknown";
    const wardSlug = toSlug(wardName) || "unknown";

    if (!byState[stateSlug]) {
      byState[stateSlug] = { name: stateName, lgas: {} };
    }
    const state = byState[stateSlug];
    if (!state.lgas[lgaSlug]) {
      state.lgas[lgaSlug] = { name: lgaName, wards: {} };
    }
    const lga = state.lgas[lgaSlug];
    if (!lga.wards[wardSlug]) {
      lga.wards[wardSlug] = { name: wardName, pollingUnits: [] };
    }
    const ward = lga.wards[wardSlug];
    const puId = `${wardSlug}-${ward.pollingUnits.length}`;
    ward.pollingUnits.push({ id: puId, name: puName });
  }

  // Convert to arrays and build index
  const stateList = [];
  const stateSlugs = Object.keys(byState).sort();

  for (const stateSlug of stateSlugs) {
    const state = byState[stateSlug];
    stateList.push({ id: stateSlug, name: state.name });

    const lgas = [];
    for (const lgaSlug of Object.keys(state.lgas).sort()) {
      const lga = state.lgas[lgaSlug];
      const wards = [];
      for (const wardSlug of Object.keys(lga.wards).sort()) {
        const ward = lga.wards[wardSlug];
        wards.push({
          id: wardSlug,
          name: ward.name,
          pollingUnits: ward.pollingUnits,
        });
      }
      lgas.push({ id: lgaSlug, name: lga.name, wards });
    }

    const stateJson = {
      id: stateSlug,
      name: state.name,
      lgas,
    };

    const outPath = path.join(OUT_DIR, `${stateSlug}.json`);
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(stateJson, null, 0), "utf8");
  }

  const indexPath = path.join(OUT_DIR, "index.json");
  fs.writeFileSync(
    indexPath,
    JSON.stringify({ states: stateList }, null, 0),
    "utf8"
  );

  const totalStates = stateList.length;
  let totalPUs = 0;
  stateList.forEach((s) => {
    const data = JSON.parse(
      fs.readFileSync(path.join(OUT_DIR, `${s.id}.json`), "utf8")
    );
    data.lgas.forEach((lga) => {
      lga.wards.forEach((w) => {
        totalPUs += (w.pollingUnits || []).length;
      });
    });
  });

  console.log(
    `Done. ${totalStates} states, ${totalPUs} polling units → ${OUT_DIR}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
