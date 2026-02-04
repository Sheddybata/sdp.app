/**
 * Nigeria political geography: State -> LGA -> Ward
 * Simplified structure for cascading dropdowns. Expand with full data as needed.
 */
export interface Ward {
  id: string;
  name: string;
}

export interface LGA {
  id: string;
  name: string;
  wards: Ward[];
}

export interface StateGeo {
  id: string;
  name: string;
  lgas: LGA[];
}

export const NIGERIA_STATES: StateGeo[] = [
  {
    id: "abia",
    name: "Abia",
    lgas: [
      { id: "umuahia-north", name: "Umuahia North", wards: [{ id: "w1", name: "Ibeku East I" }, { id: "w2", name: "Ibeku East II" }, { id: "w3", name: "Umuahia Urban I" }] },
      { id: "aba-south", name: "Aba South", wards: [{ id: "w4", name: "Eziukwu" }, { id: "w5", name: "Asa" }, { id: "w6", name: "Aba Town Hall" }] },
    ],
  },
  {
    id: "adamawa",
    name: "Adamawa",
    lgas: [
      { id: "yola-north", name: "Yola North", wards: [{ id: "w7", name: "Alkalawa" }, { id: "w8", name: "Doubeli" }, { id: "w9", name: "Jambutu" }] },
      { id: "mubi-north", name: "Mubi North", wards: [{ id: "w10", name: "Bahuli" }, { id: "w11", name: "Kolere" }, { id: "w12", name: "Yelwa" }] },
    ],
  },
  {
    id: "akwa-ibom",
    name: "Akwa Ibom",
    lgas: [
      { id: "uyo", name: "Uyo", wards: [{ id: "w13", name: "Uyo Urban I" }, { id: "w14", name: "Uyo Urban II" }, { id: "w15", name: "Uyo Urban III" }] },
      { id: "etinan", name: "Etinan", wards: [{ id: "w16", name: "Etinan Urban I" }, { id: "w17", name: "Etinan Urban II" }] },
    ],
  },
  {
    id: "anambra",
    name: "Anambra",
    lgas: [
      { id: "awka-south", name: "Awka South", wards: [{ id: "w18", name: "Awka I" }, { id: "w19", name: "Awka II" }, { id: "w20", name: "Awka III" }] },
      { id: "onitsha-north", name: "Onitsha North", wards: [{ id: "w21", name: "GRA" }, { id: "w22", name: "Inland Town I" }, { id: "w23", name: "Inland Town II" }] },
    ],
  },
  {
    id: "bauchi",
    name: "Bauchi",
    lgas: [
      { id: "bauchi", name: "Bauchi", wards: [{ id: "w24", name: "Bauchi Central" }, { id: "w25", name: "Dawaki" }, { id: "w26", name: "Gwallaga" }] },
      { id: "toro", name: "Toro", wards: [{ id: "w27", name: "Toro North" }, { id: "w28", name: "Toro South" }] },
    ],
  },
  {
    id: "bayelsa",
    name: "Bayelsa",
    lgas: [
      { id: "yenagoa", name: "Yenagoa", wards: [{ id: "w29", name: "Amassoma I" }, { id: "w30", name: "Amassoma II" }, { id: "w31", name: "Epie I" }] },
    ],
  },
  {
    id: "benue",
    name: "Benue",
    lgas: [
      { id: "makurdi", name: "Makurdi", wards: [{ id: "w32", name: "North Bank I" }, { id: "w33", name: "North Bank II" }, { id: "w34", name: "Modern Market" }] },
      { id: "gboko", name: "Gboko", wards: [{ id: "w35", name: "Gboko Central" }, { id: "w36", name: "Gboko East" }] },
    ],
  },
  {
    id: "borno",
    name: "Borno",
    lgas: [
      { id: "maiduguri", name: "Maiduguri", wards: [{ id: "w37", name: "Gwange I" }, { id: "w38", name: "Gwange II" }, { id: "w39", name: "Hausari" }] },
      { id: "jere", name: "Jere", wards: [{ id: "w40", name: "Bulumkutu" }, { id: "w41", name: "Mashamari" }] },
    ],
  },
  {
    id: "cross-river",
    name: "Cross River",
    lgas: [
      { id: "calabar-municipality", name: "Calabar Municipality", wards: [{ id: "w42", name: "I" }, { id: "w43", name: "II" }, { id: "w44", name: "III" }] },
    ],
  },
  {
    id: "delta",
    name: "Delta",
    lgas: [
      { id: "warri-north", name: "Warri North", wards: [{ id: "w45", name: "Koko" }, { id: "w46", name: "Ogheye" }] },
      { id: "ughelli-north", name: "Ughelli North", wards: [{ id: "w47", name: "Ughelli I" }, { id: "w48", name: "Ughelli II" }] },
    ],
  },
  {
    id: "ebonyi",
    name: "Ebonyi",
    lgas: [
      { id: "abakaliki", name: "Abakaliki", wards: [{ id: "w49", name: "Abakpa" }, { id: "w50", name: "Kpirikpiri" }, { id: "w51", name: "Ndieze" }] },
    ],
  },
  {
    id: "edo",
    name: "Edo",
    lgas: [
      { id: "benin-city", name: "Oredo (Benin City)", wards: [{ id: "w52", name: "GRA/Etete" }, { id: "w53", name: "New Benin I" }, { id: "w54", name: "New Benin II" }] },
    ],
  },
  {
    id: "ekiti",
    name: "Ekiti",
    lgas: [
      { id: "ado-ekiti", name: "Ado Ekiti", wards: [{ id: "w55", name: "Ado A" }, { id: "w56", name: "Ado B" }, { id: "w57", name: "Ado C" }] },
    ],
  },
  {
    id: "enugu",
    name: "Enugu",
    lgas: [
      { id: "enugu-north", name: "Enugu North", wards: [{ id: "w58", name: "Abakpa I" }, { id: "w59", name: "Abakpa II" }, { id: "w60", name: "Trans Ekulu" }] },
      { id: "nsukka", name: "Nsukka", wards: [{ id: "w61", name: "Nkpunano" }, { id: "w62", name: "Ihe" }, { id: "w63", name: "Owerre" }] },
    ],
  },
  {
    id: "fct",
    name: "FCT (Abuja)",
    lgas: [
      { id: "abuja-municipal", name: "Abuja Municipal", wards: [{ id: "w64", name: "Garki" }, { id: "w65", name: "Wuse" }, { id: "w66", name: "Maitama" }] },
      { id: "bwari", name: "Bwari", wards: [{ id: "w67", name: "Bwari Central" }, { id: "w68", name: "Kubwa" }] },
    ],
  },
  {
    id: "gombe",
    name: "Gombe",
    lgas: [
      { id: "gombe", name: "Gombe", wards: [{ id: "w69", name: "Bolari East" }, { id: "w70", name: "Bolari West" }, { id: "w71", name: "Pantami" }] },
    ],
  },
  {
    id: "imo",
    name: "Imo",
    lgas: [
      { id: "owerri-urban", name: "Owerri Urban", wards: [{ id: "w72", name: "Aladimma I" }, { id: "w73", name: "Aladimma II" }, { id: "w74", name: "New Owerri I" }] },
    ],
  },
  {
    id: "jigawa",
    name: "Jigawa",
    lgas: [
      { id: "dutse", name: "Dutse", wards: [{ id: "w75", name: "Dutse Central" }, { id: "w76", name: "Sakwaya" }] },
    ],
  },
  {
    id: "kaduna",
    name: "Kaduna",
    lgas: [
      { id: "kaduna-north", name: "Kaduna North", wards: [{ id: "w77", name: "Kawo" }, { id: "w78", name: "Hayin Banki" }, { id: "w79", name: "Ungwan Sanusi" }] },
      { id: "chikun", name: "Chikun", wards: [{ id: "w80", name: "Chikun" }, { id: "w81", name: "Kakau" }, { id: "w82", name: "Sabon Tasha" }] },
    ],
  },
  {
    id: "kano",
    name: "Kano",
    lgas: [
      { id: "kano-municipal", name: "Kano Municipal", wards: [{ id: "w83", name: "Dala" }, { id: "w84", name: "Gwale" }, { id: "w85", name: "Nassarawa" }] },
      { id: "fagge", name: "Fagge", wards: [{ id: "w86", name: "Fagge A" }, { id: "w87", name: "Fagge B" }, { id: "w88", name: "Sabon Gari East" }] },
    ],
  },
  {
    id: "katsina",
    name: "Katsina",
    lgas: [
      { id: "katsina", name: "Katsina", wards: [{ id: "w89", name: "Katsina Central" }, { id: "w90", name: "Dutsinma" }] },
    ],
  },
  {
    id: "kebbi",
    name: "Kebbi",
    lgas: [
      { id: "birnin-kebbi", name: "Birnin Kebbi", wards: [{ id: "w91", name: "Nassarawa I" }, { id: "w92", name: "Nassarawa II" }] },
    ],
  },
  {
    id: "kogi",
    name: "Kogi",
    lgas: [
      { id: "lokoja", name: "Lokoja", wards: [{ id: "w93", name: "Lokoja A" }, { id: "w94", name: "Lokoja B" }, { id: "w95", name: "Lokoja C" }] },
    ],
  },
  {
    id: "kwara",
    name: "Kwara",
    lgas: [
      { id: "ilorin-west", name: "Ilorin West", wards: [{ id: "w96", name: "Akanbi I" }, { id: "w97", name: "Akanbi II" }, { id: "w98", name: "Okaka I" }] },
    ],
  },
  {
    id: "lagos",
    name: "Lagos",
    lgas: [
      { id: "ikeja", name: "Ikeja", wards: [{ id: "w99", name: "Anifowoshe" }, { id: "w100", name: "Ojodu" }, { id: "w101", name: "Alausa" }] },
      { id: "mainland", name: "Lagos Mainland", wards: [{ id: "w102", name: "Yaba" }, { id: "w103", name: "Ebute Metta" }, { id: "w104", name: "Oyingbo" }] },
    ],
  },
  {
    id: "nasarawa",
    name: "Nasarawa",
    lgas: [
      { id: "lafia", name: "Lafia", wards: [{ id: "w105", name: "Lafia North" }, { id: "w106", name: "Lafia South" }] },
    ],
  },
  {
    id: "niger",
    name: "Niger",
    lgas: [
      { id: "minna", name: "Chanchaga (Minna)", wards: [{ id: "w107", name: "Minna Central" }, { id: "w108", name: "Bosso" }, { id: "w109", name: "Chanchaga" }] },
    ],
  },
  {
    id: "ogun",
    name: "Ogun",
    lgas: [
      { id: "abeokuta-south", name: "Abeokuta South", wards: [{ id: "w110", name: "Ake I" }, { id: "w111", name: "Ake II" }, { id: "w112", name: "Itoko" }] },
    ],
  },
  {
    id: "ondo",
    name: "Ondo",
    lgas: [
      { id: "akure-south", name: "Akure South", wards: [{ id: "w113", name: "Oda" }, { id: "w114", name: "Isinkan" }, { id: "w115", name: "Oba Ile" }] },
    ],
  },
  {
    id: "osun",
    name: "Osun",
    lgas: [
      { id: "osogbo", name: "Osogbo", wards: [{ id: "w116", name: "Egbedore" }, { id: "w117", name: "Ede North" }, { id: "w118", name: "Ejigbo" }] },
    ],
  },
  {
    id: "oyo",
    name: "Oyo",
    lgas: [
      { id: "ibadan-north", name: "Ibadan North", wards: [{ id: "w119", name: "Agodi" }, { id: "w120", name: "Yemetu" }, { id: "w121", name: "Oke-Ado" }] },
      { id: "oyo-east", name: "Oyo East", wards: [{ id: "w122", name: "Oyo Town I" }, { id: "w123", name: "Oyo Town II" }] },
    ],
  },
  {
    id: "plateau",
    name: "Plateau",
    lgas: [
      { id: "jos-north", name: "Jos North", wards: [{ id: "w124", name: "Naraguta A" }, { id: "w125", name: "Naraguta B" }, { id: "w126", name: "Tudun Wada" }] },
    ],
  },
  {
    id: "rivers",
    name: "Rivers",
    lgas: [
      { id: "port-harcourt", name: "Port Harcourt", wards: [{ id: "w127", name: "Diobu I" }, { id: "w128", name: "Diobu II" }, { id: "w129", name: "Trans Amadi" }] },
    ],
  },
  {
    id: "sokoto",
    name: "Sokoto",
    lgas: [
      { id: "sokoto-north", name: "Sokoto North", wards: [{ id: "w130", name: "Magajin Gari A" }, { id: "w131", name: "Magajin Gari B" }] },
    ],
  },
  {
    id: "taraba",
    name: "Taraba",
    lgas: [
      { id: "jalingo", name: "Jalingo", wards: [{ id: "w132", name: "Jalingo I" }, { id: "w133", name: "Jalingo II" }, { id: "w134", name: "Sintali" }] },
    ],
  },
  {
    id: "yobe",
    name: "Yobe",
    lgas: [
      { id: "damaturu", name: "Damaturu", wards: [{ id: "w135", name: "Damaturu Central" }, { id: "w136", name: "Pompomari" }] },
    ],
  },
  {
    id: "zamfara",
    name: "Zamfara",
    lgas: [
      { id: "gusau", name: "Gusau", wards: [{ id: "w137", name: "Gusau East" }, { id: "w138", name: "Gusau West" }] },
    ],
  },
];

/** Convert StateGeo[] to extract JSON format for public/nigeria-wards.json */
export function stateGeoToExtractFormat(
  states: StateGeo[]
): Record<string, Record<string, string[]>> {
  const byState: Record<string, Record<string, string[]>> = {};
  for (const state of states) {
    const stateKey = state.name.toUpperCase();
    byState[stateKey] = {};
    for (const lga of state.lgas) {
      byState[stateKey][lga.name] = lga.wards.map((w) => w.name);
    }
  }
  return byState;
}

export function getStateById(id: string): StateGeo | undefined {
  return NIGERIA_STATES.find((s) => s.id === id);
}

export function getLGAByStateId(stateId: string): LGA[] {
  const state = getStateById(stateId);
  return state?.lgas ?? [];
}

export function getWardsByLGAId(stateId: string, lgaId: string): Ward[] {
  const state = getStateById(stateId);
  const lga = state?.lgas.find((l) => l.id === lgaId);
  return lga?.wards ?? [];
}

/** Slug for use as id (lowercase, spaces/special to hyphen) */
function slug(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || s.replace(/\s+/g, "-").toLowerCase();
}

/** Title case for display name */
function toTitleCase(s: string): string {
  return s
    .trim()
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

/**
 * Convert extract-wards-from-pdf output to StateGeo[].
 * Format: { "STATE_KEY": { "LGA_KEY": ["ward1", "ward2", ...] }, ... }
 */
export function convertExtractJsonToStateGeo(
  byState: Record<string, Record<string, string[]>>
): StateGeo[] {
  const result: StateGeo[] = [];
  for (const [stateKey, lgasRecord] of Object.entries(byState)) {
    if (!lgasRecord || typeof lgasRecord !== "object") continue;
    const stateId = slug(stateKey.replace(/\s+STATE$/i, ""));
    const stateName = toTitleCase(stateKey.replace(/\s+STATE$/i, ""));
    const lgas: LGA[] = [];
    for (const [lgaName, wardNames] of Object.entries(lgasRecord)) {
      const wardNamesArr = Array.isArray(wardNames)
        ? wardNames
        : (wardNames && typeof wardNames === "object" && wardNames !== null && "length" in wardNames)
          ? Array.from(wardNames as ArrayLike<string>)
          : [];
      const lgaId = slug(lgaName);
      const wards: Ward[] = wardNamesArr
        .filter((name): name is string => typeof name === "string")
        .map((name, i) => ({
          id: `${lgaId}-w-${i}`,
          name: String(name).trim(),
        }));
      lgas.push({ id: lgaId, name: lgaName.trim(), wards });
    }
    if (lgas.length > 0) {
      result.push({ id: stateId, name: stateName, lgas });
    }
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}
