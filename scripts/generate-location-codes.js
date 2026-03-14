/**
 * Generate location codes CSV with hierarchy:
 * state_code (per geopolitical zone mapping) /
 * lga_code (01..N) /
 * ward_code (01..N) /
 * polling_unit_code (001..N)
 *
 * Uses INEC data in public/inec-data.
 */
const fs = require("fs");
const path = require("path");

const STATE_CODE = {
  // North East (11–16)
  borno: "11",
  yobe: "12",
  adamawa: "13",
  bauchi: "14",
  gombe: "15",
  taraba: "16",
  // North West (17–23)
  jigawa: "17",
  kaduna: "18",
  kano: "19",
  katsina: "20",
  kebbi: "21",
  sokoto: "22",
  zamfara: "23",
  // North Central (24–30)
  benue: "24",
  "federal-capital-territory": "25",
  kogi: "26",
  kwara: "27",
  nasarawa: "28",
  niger: "29",
  plateau: "30",
  // South West (31–36)
  ekiti: "31",
  lagos: "32",
  ogun: "33",
  ondo: "34",
  osun: "35",
  oyo: "36",
  // South East (37–41)
  abia: "37",
  anambra: "38",
  ebonyi: "39",
  enugu: "40",
  imo: "41",
  // South South (42–47)
  "akwa-ibom": "42",
  bayelsa: "43",
  "cross-river": "44",
  delta: "45",
  edo: "46",
  rivers: "47",
};

const INDEX_PATH = path.join(__dirname, "..", "public", "inec-data", "index.json");
const OUT_PATH = path.join(__dirname, "..", "location-codes.csv");

function pad(num, width) {
  const s = String(num);
  return s.length >= width ? s : "0".repeat(width - s.length) + s;
}

function main() {
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));
  const rows = [];
  rows.push("state_code,state_name,state_id,lga_code,lga_name,lga_id,ward_code,ward_name,ward_id,pu_code,pu_name");

  for (const state of index.states) {
    const stateCode = STATE_CODE[state.id];
    if (!stateCode) {
      throw new Error(`Missing state code for ${state.id}`);
    }
    const stateFile = path.join(__dirname, "..", "public", "inec-data", `${state.id}.json`);
    const data = JSON.parse(fs.readFileSync(stateFile, "utf8"));

    const lgas = [...(data.lgas || [])].sort((a, b) => a.name.localeCompare(b.name));
    lgas.forEach((lga, lgaIdx) => {
      const lgaCode = pad(lgaIdx + 1, 2); // 01..N, up to 44
      const wards = [...(lga.wards || [])].sort((a, b) => a.name.localeCompare(b.name));
      wards.forEach((ward, wardIdx) => {
        const wardCode = pad(wardIdx + 1, 2); // 01..N
        const pus = [...(ward.pollingUnits || [])];
        // Some wards can have >99 PUs; use 3-digit padding to avoid collisions.
        pus.forEach((pu, puIdx) => {
          const puCode = pad(puIdx + 1, 3);
          rows.push(
            [
              stateCode,
              `"${state.name}"`,
              state.id,
              lgaCode,
              `"${lga.name}"`,
              lga.id,
              wardCode,
              `"${ward.name}"`,
              ward.id,
              puCode,
              `"${pu.name}"`,
            ].join(",")
          );
        });
        if (!pus.length) {
          rows.push(
            [
              stateCode,
              `"${state.name}"`,
              state.id,
              lgaCode,
              `"${lga.name}"`,
              lga.id,
              wardCode,
              `"${ward.name}"`,
              ward.id,
              "",
              "",
            ].join(",")
          );
        }
      });
      if (!wards.length) {
        rows.push(
          [
            stateCode,
            `"${state.name}"`,
            state.id,
            lgaCode,
            `"${lga.name}"`,
            lga.id,
            "",
            "",
            "",
            "",
            "",
          ].join(",")
        );
      }
    });
  }

  fs.writeFileSync(OUT_PATH, rows.join("\n"), "utf8");
  console.log(`Wrote ${rows.length - 1} rows to ${OUT_PATH}`);
}

main();
