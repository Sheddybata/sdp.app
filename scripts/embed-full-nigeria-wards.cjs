/**
 * Fetch Nigerian states/LGA/wards from GitHub Gist and write embedded JSON.
 * Run: node scripts/embed-full-nigeria-wards.cjs
 * Output: lib/nigeria-wards-embedded.json (State -> LGA -> wards[]).
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const SOURCE_URL = 'https://raw.githubusercontent.com/temikeezy/nigeria-geojson-data/main/data/lgas-with-wards.json';
const OUT_PATH = path.join(__dirname, '..', 'lib', 'nigeria-wards-embedded.json');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Source format (temikeezy/nigeria-geojson-data):
 * {
 *   "Kwara": {
 *     "Ilorin West": [{ "name": "Ajikobi", ... }, ...],
 *     ...
 *   },
 *   ...
 * }
 *
 * We need: { "STATE_KEY": { "LGA_NAME": ["Ward A", "Ward B"], ... }, ... }
 */
function convertNestedToByState(sourceData) {
  const byState = {};
  for (const [stateName, lgasRecord] of Object.entries(sourceData || {})) {
    if (!lgasRecord || typeof lgasRecord !== 'object') continue;
    const stateKey = stateName.replace(/\s+STATE$/i, '').toUpperCase();
    const outLgas = {};
    for (const [lgaName, wards] of Object.entries(lgasRecord)) {
      if (!Array.isArray(wards)) {
        outLgas[lgaName.trim()] = [];
        continue;
      }
      const wardNames = wards
        .map((w) => (w && w.name ? String(w.name).trim() : ''))
        .filter(Boolean);
      outLgas[lgaName.trim()] = wardNames;
    }
    if (Object.keys(outLgas).length > 0) {
      byState[stateKey] = outLgas;
    }
  }
  return byState;
}

async function main() {
  console.log('Fetching', SOURCE_URL);
  const sourceData = await fetchJson(SOURCE_URL);
  const byState = convertNestedToByState(sourceData);
  const stateCount = Object.keys(byState).length;
  let lgaCount = 0;
  let wardCount = 0;
  let emptyLgas = 0;
  const emptySamples = [];
  for (const lgas of Object.values(byState)) {
    lgaCount += Object.keys(lgas).length;
    for (const wards of Object.values(lgas)) {
      wardCount += (wards && wards.length) || 0;
      if (!wards || wards.length === 0) emptyLgas += 1;
    }
  }
  console.log('States:', stateCount, 'LGAs:', lgaCount, 'Wards:', wardCount);
  if (emptyLgas > 0) {
    // Sample up to 5 empty LGAs for quick visibility
    for (const [stateName, lgas] of Object.entries(byState)) {
      for (const [lgaName, wards] of Object.entries(lgas)) {
        if (!wards || wards.length === 0) {
          emptySamples.push(`${stateName} → ${lgaName}`);
          if (emptySamples.length >= 5) break;
        }
      }
      if (emptySamples.length >= 5) break;
    }
    console.warn('LGAs with 0 wards:', emptyLgas, 'Samples:', emptySamples.join(' | '));
  }
  fs.writeFileSync(OUT_PATH, JSON.stringify(byState, null, 2), 'utf8');
  console.log('Wrote', OUT_PATH);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
