"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { getKpis } from "@/lib/mock-members";
import type { MemberRecord } from "@/lib/mock-members";
import { NIGERIA_STATES } from "@/lib/nigeria-geo";
import { Users, UserCheck, TrendingUp, MapPin, Activity, ChevronDown, ChevronRight, FileDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";

const STATE_POPULATIONS: Record<string, number> = {
  abia: 4100000, adamawa: 4900000, "akwa-ibom": 5500000, anambra: 5500000,
  bauchi: 7500000, bayelsa: 2500000, benue: 5700000, borno: 5900000,
  "cross-river": 4400000, delta: 5700000, ebonyi: 3200000, edo: 4800000,
  ekiti: 3300000, enugu: 4400000, fct: 3800000, gombe: 3900000,
  imo: 5400000, jigawa: 7100000, kaduna: 9500000, kano: 16000000,
  katsina: 9300000, kebbi: 5300000, kogi: 4500000, kwara: 3600000,
  lagos: 16500000, nasarawa: 2900000, niger: 6800000, ogun: 6000000,
  ondo: 5300000, osun: 5400000, oyo: 9200000, plateau: 4700000,
  rivers: 7500000, sokoto: 5900000, taraba: 3600000, yobe: 3700000,
  zamfara: 5300000,
};

const STATE_ID_ALIASES: Record<string, string> = {
  "federal-capital-territory": "fct",
};

type OrgWardSummary = {
  id: string;
  name: string;
  count: number;
};

type OrgLgaSummary = {
  id: string;
  name: string;
  count: number;
  wards: OrgWardSummary[];
};

type OrgStateSummary = {
  id: string;
  name: string;
  totalInState: number;
  activeLgaCount: number;
  activeWardCount: number;
  lgas: OrgLgaSummary[];
};

function normalizeStateId(stateId: string): string {
  const lowered = String(stateId || "").trim().toLowerCase();
  return STATE_ID_ALIASES[lowered] ?? lowered;
}

function prettifySlug(value: string): string {
  return String(value || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStateDisplayName(stateId: string): string {
  const normalized = normalizeStateId(stateId);
  return NIGERIA_STATES.find((s) => normalizeStateId(s.id) === normalized)?.name ?? prettifySlug(stateId);
}

function getLgaDisplayName(stateId: string, lgaId: string): string {
  const normalizedState = normalizeStateId(stateId);
  const state = NIGERIA_STATES.find((s) => normalizeStateId(s.id) === normalizedState);
  return state?.lgas.find((lga) => lga.id === lgaId)?.name ?? prettifySlug(lgaId);
}

function getWardDisplayName(stateId: string, lgaId: string, wardId: string): string {
  const normalizedState = normalizeStateId(stateId);
  const state = NIGERIA_STATES.find((s) => normalizeStateId(s.id) === normalizedState);
  const lga = state?.lgas.find((item) => item.id === lgaId);
  return lga?.wards.find((ward) => ward.id === wardId)?.name ?? prettifySlug(wardId);
}

export function AdminDashboardClient({ members }: { members: MemberRecord[] }) {
  const kpis = useMemo(() => getKpis(members), [members]);
  const [expandedStateIds, setExpandedStateIds] = useState<string[]>([]);
  const [orgPdfExporting, setOrgPdfExporting] = useState(false);
  const [statePdfExportingId, setStatePdfExportingId] = useState<string | null>(null);

  const orgHierarchy = useMemo(() => {
    const stateMap = new Map<
      string,
      {
        id: string;
        name: string;
        totalInState: number;
        lgaMap: Map<
          string,
          {
            id: string;
            name: string;
            count: number;
            wardMap: Map<string, OrgWardSummary>;
          }
        >;
      }
    >();

    for (const state of NIGERIA_STATES) {
      const normalizedId = normalizeStateId(state.id);
      stateMap.set(normalizedId, {
        id: normalizedId,
        name: state.name,
        totalInState: 0,
        lgaMap: new Map(),
      });
    }

    for (const member of members) {
      const stateId = normalizeStateId(member.state);
      const lgaId = member.lga || "unknown-lga";
      const wardId = member.ward || "unknown-ward";

      let stateEntry = stateMap.get(stateId);
      if (!stateEntry) {
        stateEntry = {
          id: stateId,
          name: getStateDisplayName(member.state),
          totalInState: 0,
          lgaMap: new Map(),
        };
        stateMap.set(stateId, stateEntry);
      }

      stateEntry.totalInState += 1;

      let lgaEntry = stateEntry.lgaMap.get(lgaId);
      if (!lgaEntry) {
        lgaEntry = {
          id: lgaId,
          name: getLgaDisplayName(member.state, lgaId),
          count: 0,
          wardMap: new Map(),
        };
        stateEntry.lgaMap.set(lgaId, lgaEntry);
      }

      lgaEntry.count += 1;

      let wardEntry = lgaEntry.wardMap.get(wardId);
      if (!wardEntry) {
        wardEntry = {
          id: wardId,
          name: getWardDisplayName(member.state, lgaId, wardId),
          count: 0,
        };
        lgaEntry.wardMap.set(wardId, wardEntry);
      }

      wardEntry.count += 1;
    }

    return Array.from(stateMap.values())
      .map<OrgStateSummary>((state) => {
        const lgas = Array.from(state.lgaMap.values())
          .map<OrgLgaSummary>((lga) => ({
            id: lga.id,
            name: lga.name,
            count: lga.count,
            wards: Array.from(lga.wardMap.values()).sort(
              (a, b) => b.count - a.count || a.name.localeCompare(b.name)
            ),
          }))
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

        return {
          id: state.id,
          name: state.name,
          totalInState: state.totalInState,
          activeLgaCount: lgas.length,
          activeWardCount: lgas.reduce((sum, lga) => sum + lga.wards.length, 0),
          lgas,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [members]);

  const stateData = useMemo(() => {
    const byState = kpis.byState ?? {};
    return NIGERIA_STATES.map((s) => {
      const memberCount = byState[s.id] ?? 0;
      const citizenCount = STATE_POPULATIONS[s.id] ?? 0;
      const density = citizenCount > 0 ? (memberCount / citizenCount) * 100 : 0;
      return { id: s.id, name: s.name, memberCount, citizenCount, density };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [kpis.byState]);

  const allStateIds = useMemo(() => orgHierarchy.map((state) => state.id), [orgHierarchy]);

  const exportOrgChartPdf = useCallback((states: OrgStateSummary[], filename: string) => {
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const marginX = 14;
      const pageHeight = 297;
      const bottomMargin = 14;
      const lineHeight = 5;
      const contentWidth = 182;
      let y = 16;
      let page = 1;

      const ensureSpace = (needed: number) => {
        if (y + needed <= pageHeight - bottomMargin) return;
        pdf.addPage();
        page += 1;
        y = 16;
        drawHeader();
      };

      const drawHeader = () => {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.text("SDP Org & Chapter View", marginX, y);
        y += 6;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.text(
          `Generated ${new Date().toISOString().replace("T", " ").slice(0, 19)} UTC  |  Page ${page}`,
          marginX,
          y
        );
        y += 7;
      };

      const writeWrapped = (text: string, indent: number, fontStyle: "normal" | "bold" = "normal") => {
        const availableWidth = contentWidth - indent;
        const lines = pdf.splitTextToSize(text, availableWidth);
        ensureSpace(lines.length * lineHeight + 1);
        pdf.setFont("helvetica", fontStyle);
        pdf.text(lines, marginX + indent, y);
        y += lines.length * lineHeight;
      };

      drawHeader();

      const totalMembers = states.reduce((sum, state) => sum + state.totalInState, 0);
      const stateLabel = states.length === 1 ? states[0]?.name ?? "Selected state" : `All ${states.length} states`;
      writeWrapped(`${stateLabel} | Total members: ${totalMembers.toLocaleString()}`, 0, "bold");
      y += 2;

      states.forEach((state) => {
        ensureSpace(12);
        pdf.setDrawColor(225, 232, 240);
        pdf.line(marginX, y, marginX + contentWidth, y);
        y += 5;

        writeWrapped(
          `${state.name} — ${state.totalInState.toLocaleString()} members | ${state.activeLgaCount} active LGAs | ${state.activeWardCount} active wards`,
          0,
          "bold"
        );

        if (state.totalInState === 0) {
          writeWrapped("No registrations recorded yet.", 6);
          y += 1;
          return;
        }

        state.lgas.forEach((lga) => {
          writeWrapped(`${lga.name} (${lga.count.toLocaleString()})`, 6, "bold");
          const wardsText =
            lga.wards.length > 0
              ? lga.wards.map((ward) => `${ward.name}: ${ward.count}`).join("   ")
              : "No wards recorded";
          writeWrapped(wardsText, 12);
          y += 1;
        });

        y += 2;
      });

      pdf.save(filename);
    } catch (error) {
      console.error("Org chart PDF export failed:", error);
      window.alert("Could not generate the PDF. Please try again.");
    }
  }, []);

  const handleExportOrgChartPdf = useCallback(() => {
    setOrgPdfExporting(true);
    try {
      exportOrgChartPdf(
        orgHierarchy,
        `SDP-Org-Chapter-View-${new Date().toISOString().slice(0, 10)}.pdf`
      );
    } finally {
      setOrgPdfExporting(false);
    }
  }, [exportOrgChartPdf, orgHierarchy]);

  const handleExportSingleStatePdf = useCallback(
    (state: OrgStateSummary) => {
      setStatePdfExportingId(state.id);
      try {
        exportOrgChartPdf(
          [state],
          `SDP-Org-Chapter-View-${state.name.replace(/\s+/g, "-")}-${new Date()
            .toISOString()
            .slice(0, 10)}.pdf`
        );
      } finally {
        setStatePdfExportingId(null);
      }
    },
    [exportOrgChartPdf]
  );

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">North Star Dashboard</h1>
        <p className="mt-1 text-neutral-600">Membership overview across all 37 states</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total Members" value={kpis.total.toLocaleString()} icon={<Users className="h-5 w-5" />} />
        <KpiCard title="Female / Male" value={`${kpis.female} / ${kpis.male}`} icon={<UserCheck className="h-5 w-5" />} />
        <KpiCard
          title="Top State"
          value={
            kpis.topState
              ? `${NIGERIA_STATES.find((s) => s.id === kpis.topState![0])?.name ?? kpis.topState[0]} (${kpis.topState[1]})`
              : "—"
          }
          icon={<MapPin className="h-5 w-5" />}
        />
        <KpiCard title="Growth This Week" value={`+${kpis.growthThisWeek}`} icon={<TrendingUp className="h-5 w-5" />} accent />
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Member Density by State</h2>
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Activity className="h-4 w-4" />
            <span>Sorted alphabetically</span>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {stateData.map((state) => (
            <StateDensityCard key={state.id} state={state} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">
              Org & Chapter View — All 37 states
            </h2>
            <p className="text-sm text-neutral-600">
              Open any state to view its full live LGA and ward breakdown without making the page too long.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleExportOrgChartPdf}
              disabled={orgPdfExporting}
              aria-label="Export org and chapter view to PDF"
            >
              {orgPdfExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              Export PDF
            </Button>
            <button
              type="button"
              onClick={() => setExpandedStateIds(allStateIds)}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:border-sdp-primary/30 hover:text-neutral-900"
            >
              Expand all
            </button>
            <button
              type="button"
              onClick={() => setExpandedStateIds([])}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:border-sdp-primary/30 hover:text-neutral-900"
            >
              Collapse all
            </button>
          </div>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm overflow-x-auto">
          <p className="mb-4 text-sm text-neutral-600">
            State totals remain compact here. Open a state card to see the real member counts by LGA and ward.
          </p>
          <div className="space-y-4">
            {orgHierarchy.map((state) => (
              <div key={state.id} className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50/40">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedStateIds((prev) =>
                      prev.includes(state.id) ? prev.filter((id) => id !== state.id) : [...prev, state.id]
                    )
                  }
                  className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left transition hover:bg-white"
                  aria-expanded={expandedStateIds.includes(state.id)}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-neutral-900">
                      {state.name} — {state.totalInState.toLocaleString()} members
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-sdp-primary/10 px-2 py-1 font-medium text-sdp-primary">
                        {state.activeLgaCount} active LGAs
                      </span>
                      <span className="rounded-full bg-neutral-200 px-2 py-1 font-medium text-neutral-700">
                        {state.activeWardCount} active wards
                      </span>
                    </div>
                  </div>
                  <span className="rounded-full border border-neutral-200 bg-white p-2 text-neutral-500">
                    {expandedStateIds.includes(state.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </span>
                </button>

                {expandedStateIds.includes(state.id) ? (
                  <div className="border-t border-neutral-200 bg-white px-4 py-4">
                    {state.totalInState === 0 ? (
                      <p className="text-sm text-neutral-500">No registrations recorded for this state yet.</p>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleExportSingleStatePdf(state)}
                            disabled={statePdfExportingId === state.id}
                            aria-label={`Export ${state.name} chapter view as PDF`}
                          >
                            {statePdfExportingId === state.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <FileDown className="h-4 w-4" />
                            )}
                            Export PDF
                          </Button>
                        </div>
                        {state.lgas.map((lga) => (
                          <div key={lga.id} className="rounded-lg border border-neutral-100 bg-neutral-50 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-neutral-800">{lga.name}</p>
                              <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-neutral-700 shadow-sm">
                                {lga.count.toLocaleString()} members
                              </span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {lga.wards.map((ward) => (
                                <span
                                  key={ward.id}
                                  className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-700"
                                >
                                  {ward.name}: {ward.count}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function StateDensityCard({ state }: { state: { id: string; name: string; memberCount: number; citizenCount: number; density: number } }) {
  const isEmpty = state.memberCount === 0;
  return (
    <div className="min-h-[140] rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-all hover:border-sdp-primary/30 hover:shadow-md">
      <div className="flex items-start justify-between">
        <h3 className="font-bold text-neutral-900 truncate" title={state.name}>{state.name}</h3>
        <span className="text-[10px] font-bold text-sdp-accent bg-sdp-accent/10 px-1.5 py-0.5 rounded uppercase">
          {state.density.toFixed(4)}%
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {isEmpty ? (
          <div className="py-2 text-center">
            <p className="text-sm font-medium text-neutral-600">No members yet</p>
            <p className="text-xs text-neutral-500 mt-0.5">Enrollment will populate this state</p>
          </div>
        ) : (
          <>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-neutral-500">Members</span>
                <span className="font-semibold text-neutral-900">{state.memberCount.toLocaleString()}</span>
              </div>
              <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                <div className="h-full bg-sdp-primary" style={{ width: `${Math.min(state.density * 100, 100)}%` }} />
              </div>
            </div>
            <div className="flex justify-between text-xs border-t border-neutral-50 pt-2">
              <span className="text-neutral-500">Citizens</span>
              <span className="text-neutral-700">{(state.citizenCount / 1000000).toFixed(1)}M</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  icon,
  accent,
  subtitle,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  accent?: boolean;
  subtitle?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md",
        accent && "border-sdp-accent/30 bg-sdp-accent/5"
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-600">{title}</p>
        <span
          className={cn(
            "rounded-lg p-2",
            accent ? "bg-sdp-accent/20 text-sdp-accent" : "bg-sdp-primary/10 text-sdp-primary"
          )}
        >
          {icon}
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold text-neutral-900">{value}</p>
      {subtitle ? <p className="mt-1 text-xs leading-snug text-neutral-500">{subtitle}</p> : null}
    </div>
  );
}
