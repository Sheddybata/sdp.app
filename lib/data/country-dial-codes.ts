import raw from "./country-dial-codes.json";

export type CountryDialRow = {
  iso2: string;
  name: string;
  dial: string;
};

export const COUNTRY_DIAL_LIST: CountryDialRow[] = raw;

const dialByIso = new Map(COUNTRY_DIAL_LIST.map((c) => [c.iso2, c.dial]));

export function getDialForIso2(iso2: string): string | undefined {
  return dialByIso.get(iso2.toUpperCase());
}

export function getCountryName(iso2: string): string | undefined {
  return COUNTRY_DIAL_LIST.find((c) => c.iso2 === iso2)?.name;
}

/** Nigeria, major diaspora hubs first; then alphabetical. */
export function prioritizedCountries(list: CountryDialRow[]): CountryDialRow[] {
  const priority = [
    "NG",
    "US",
    "GB",
    "CA",
    "DE",
    "FR",
    "IT",
    "ES",
    "NL",
    "IE",
    "ZA",
    "GH",
    "KE",
    "AE",
    "SA",
    "IN",
    "CN",
    "AU",
  ];
  const pri = new Set(priority);
  const head: CountryDialRow[] = [];
  const tail: CountryDialRow[] = [];
  for (const c of list) {
    if (pri.has(c.iso2)) head.push(c);
    else tail.push(c);
  }
  head.sort((a, b) => priority.indexOf(a.iso2) - priority.indexOf(b.iso2));
  tail.sort((a, b) => a.name.localeCompare(b.name));
  return [...head, ...tail];
}
