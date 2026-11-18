/** Official INEC state list (matches public/inec-data/index.json). */
export const INEC_STATES = [
  { id: "abia", name: "ABIA", prefix: "AB" },
  { id: "adamawa", name: "ADAMAWA", prefix: "AD" },
  { id: "akwa-ibom", name: "AKWA IBOM", prefix: "AI" },
  { id: "anambra", name: "ANAMBRA", prefix: "AN" },
  { id: "bauchi", name: "BAUCHI", prefix: "BA" },
  { id: "bayelsa", name: "BAYELSA", prefix: "BY" },
  { id: "benue", name: "BENUE", prefix: "BE" },
  { id: "borno", name: "BORNO", prefix: "BO" },
  { id: "cross-river", name: "CROSS RIVER", prefix: "CR" },
  { id: "delta", name: "DELTA", prefix: "DE" },
  { id: "ebonyi", name: "EBONYI", prefix: "EB" },
  { id: "edo", name: "EDO", prefix: "ED" },
  { id: "ekiti", name: "EKITI", prefix: "EK" },
  { id: "enugu", name: "ENUGU", prefix: "EN" },
  { id: "federal-capital-territory", name: "FEDERAL CAPITAL TERRITORY", prefix: "FC" },
  { id: "gombe", name: "GOMBE", prefix: "GO" },
  { id: "imo", name: "IMO", prefix: "IM" },
  { id: "jigawa", name: "JIGAWA", prefix: "JI" },
  { id: "kaduna", name: "KADUNA", prefix: "KD" },
  { id: "kano", name: "KANO", prefix: "KN" },
  { id: "katsina", name: "KATSINA", prefix: "KT" },
  { id: "kebbi", name: "KEBBI", prefix: "KE" },
  { id: "kogi", name: "KOGI", prefix: "KO" },
  { id: "kwara", name: "KWARA", prefix: "KW" },
  { id: "lagos", name: "LAGOS", prefix: "LA" },
  { id: "nasarawa", name: "NASARAWA", prefix: "NA" },
  { id: "niger", name: "NIGER", prefix: "NI" },
  { id: "ogun", name: "OGUN", prefix: "OG" },
  { id: "ondo", name: "ONDO", prefix: "ON" },
  { id: "osun", name: "OSUN", prefix: "OS" },
  { id: "oyo", name: "OYO", prefix: "OY" },
  { id: "plateau", name: "PLATEAU", prefix: "PL" },
  { id: "rivers", name: "RIVERS", prefix: "RI" },
  { id: "sokoto", name: "SOKOTO", prefix: "SO" },
  { id: "taraba", name: "TARABA", prefix: "TA" },
  { id: "yobe", name: "YOBE", prefix: "YO" },
  { id: "zamfara", name: "ZAMFARA", prefix: "ZA" },
] as const;

export type InecStateId = (typeof INEC_STATES)[number]["id"];

export function findInecState(stateId: string) {
  return INEC_STATES.find((s) => s.id === stateId) ?? null;
}

export function titleCaseStateName(name: string): string {
  return name
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
}
