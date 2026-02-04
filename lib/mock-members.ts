import type { EnrollmentFormData } from "./enrollment-schema";
import { NIGERIA_STATES } from "./nigeria-geo";

export interface MemberRecord extends EnrollmentFormData {
  id: string;
  createdAt: string;
  gender?: "Male" | "Female";
  registeredBy?: string;
}

const states = NIGERIA_STATES.map((s) => s.id);
const titles = ["Mr", "Mrs", "Miss", "Ms", "Dr"] as const;
const firstNames = ["Adebayo", "Chinwe", "Ibrahim", "Fatima", "Emeka", "Amina", "Oluwaseun", "Hassan"];
const surnames = ["Okonkwo", "Bello", "Adeyemi", "Mohammed", "Nwosu", "Yusuf", "Okafor", "Ibrahim"];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start: Date, end: Date): string {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().slice(0, 10);
}

export function generateMockMembers(count: number): MemberRecord[] {
  const members: MemberRecord[] = [];
  const start = new Date("2025-01-01");
  const end = new Date("2026-01-30");
  for (let i = 0; i < count; i++) {
    const stateId = randomItem(states);
    const state = NIGERIA_STATES.find((s) => s.id === stateId);
    const lga = state?.lgas[Math.floor(Math.random() * (state.lgas.length || 1))];
    const ward = lga?.wards[Math.floor(Math.random() * (lga.wards.length || 1))];
    const gender = Math.random() > 0.5 ? "Male" : "Female";
    const title = gender === "Male" ? randomItem(["Mr", "Dr", "Alh", "Chief"]) : randomItem(["Mrs", "Miss", "Ms", "Dr"]);
    members.push({
      id: `mem-${1000 + i}`,
      title: title as MemberRecord["title"],
      surname: randomItem(surnames),
      firstName: randomItem(firstNames),
      otherNames: Math.random() > 0.7 ? "O." : "",
      phone: `080${Math.floor(10000000 + Math.random() * 89999999)}`,
      email: Math.random() > 0.5 ? `user${i}@example.com` : "",
      dateOfBirth: randomDate(new Date("1970-01-01"), new Date("2005-01-01")),
      joinDate: randomDate(start, end),
      state: stateId,
      lga: lga?.id ?? "",
      ward: ward?.id ?? "",
      voterRegistrationNumber: `90F${String(10 ** 16 + i).slice(-17)}`,
      createdAt: new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString(),
      gender,
      registeredBy: Math.random() > 0.7 ? "state-admin-lagos" : "state-admin-abuja",
      agreedToConstitution: true,
    });
  }
  return members;
}

export const MOCK_MEMBERS = generateMockMembers(120);

export function filterMembers(
  members: MemberRecord[],
  opts: {
    search?: string;
    state?: string;
    lga?: string;
    ward?: string;
    dateFrom?: string;
    dateTo?: string;
  }
): MemberRecord[] {
  let list = [...members];
  if (opts.search) {
    const q = opts.search.toLowerCase();
    list = list.filter(
      (m) =>
        m.surname.toLowerCase().includes(q) ||
        m.firstName.toLowerCase().includes(q) ||
        m.voterRegistrationNumber.toLowerCase().includes(q) ||
        m.phone.includes(q)
    );
  }
  if (opts.state) list = list.filter((m) => m.state === opts.state);
  if (opts.lga) list = list.filter((m) => m.lga === opts.lga);
  if (opts.ward) list = list.filter((m) => m.ward === opts.ward);
  if (opts.dateFrom) list = list.filter((m) => (m.joinDate ?? "") >= opts.dateFrom!);
  if (opts.dateTo) list = list.filter((m) => (m.joinDate ?? "") <= opts.dateTo!);
  return list;
}

export function getMembersByFilters(opts: {
  search?: string;
  state?: string;
  lga?: string;
  ward?: string;
  dateFrom?: string;
  dateTo?: string;
}): MemberRecord[] {
  return filterMembers(MOCK_MEMBERS, opts);
}

export function getKpis(members: MemberRecord[]) {
  const total = members.length;
  const female = members.filter((m) => m.gender === "Female").length;
  const male = total - female;
  const byState = members.reduce<Record<string, number>>((acc, m) => {
    acc[m.state] = (acc[m.state] || 0) + 1;
    return acc;
  }, {});
  const topState = Object.entries(byState).sort((a, b) => b[1] - a[1])[0];
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const growthThisWeek = members.filter(
    (m) => new Date(m.createdAt) >= oneWeekAgo
  ).length;
  return { total, female, male, topState, growthThisWeek, byState };
}
