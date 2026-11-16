/** Shared constituency types — safe for client components (no Node fs). */

export type ConstituencyKind = "senatorial" | "federal" | "state_assembly";

export type ConstituencySeat = {
  code: string;
  name: string;
  stateId: string;
  stateName: string;
  composition: string;
  collationCentre: string;
};

export type ConstituencyWardLink = {
  stateId: string;
  stateName: string;
  stateCode: string;
  lgaId: string;
  lgaName: string;
  lgaCode: string;
  wardId: string;
  wardName: string;
  wardCode: string;
  locationCode: string;
  puCount: number;
};

export type ConstituencyLink = {
  code: string;
  kind: ConstituencyKind;
  status: "mapped" | "partial" | "unmapped";
  reason?: string;
  wards: ConstituencyWardLink[];
  missingLgas?: string[];
  missingWards?: string[];
  source?: string;
};

export type UnmappedSeat = {
  code: string;
  name: string;
  kind?: ConstituencyKind;
  stateId: string;
  stateName: string;
  composition: string;
  reason: string;
};

export type ManualLinksFile = {
  _comment?: string;
  links: Record<string, Array<string | { stateId: string; lgaId: string; wardId: string }>>;
};

export type ConstituencySeatTotals = {
  senatorial: number;
  federal: number;
  stateAssembly: number;
  unmapped: number;
};
