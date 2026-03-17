/**
 * Export INEC polling units into a flat CSV (Excel-friendly)
 * with columns: State, LGA, Ward, Polling Unit.
 *
 * Run:
 *   node scripts/export-inec-polling-units-flat.cjs
 *
 * Optional:
 *   INEC_CSV_PATH=./polling-units.csv node scripts/export-inec-polling-units-flat.cjs
 *
 * Output:
 *   public/inec-data/polling-units-flat.csv
 *
 * Source CSV:
 *   https://github.com/mykeels/inec-polling-units (polling-units.csv)
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const CSV_URL =
  "https://raw.githubusercontent.com/mykeels/inec-polling-units/master/polling-units.csv";
const OUT_DIR = path.join(__dirname, "..", "public", "inec-data");
const OUT_CSV = path.join(OUT_DIR, "polling-units-flat.csv");

/**
 * Parse one CSV line respecting double-quoted fields (and "" as escaped quote).
 * Copied from extract-inec-polling-units.cjs to keep scripts independent.
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

function toCSVValue(v) {
  if (v == null) return "";
  const s = String(v);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
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
  if (!lines.length) {
    throw new Error("CSV appears to be empty.");
  }

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

  const outLines = [];
  // Friendly column names for Excel
  outLines.push(
    ["State", "LGA", "Ward", "Polling Unit"]
      .map(toCSVValue)
      .join(",")
  );

  let count = 0;
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    const stateName = (row[stateIdx] || "").trim();
    const lgaName = (row[lgaIdx] || "").trim();
    const wardName = (row[wardIdx] || "").trim();
    const puName = (row[nameIdx] || "").trim();

    if (!stateName || !lgaName || !wardName || !puName) continue;

    outLines.push(
      [stateName, lgaName, wardName, puName]
        .map(toCSVValue)
        .join(",")
    );
    count += 1;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_CSV, outLines.join("\n"), "utf8");

  console.log(
    `Done. Wrote ${count} polling units to ${OUT_CSV}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

