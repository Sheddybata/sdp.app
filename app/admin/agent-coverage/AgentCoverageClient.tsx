"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, Clock, Download, Search, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  isComplete,
  pct,
  type AgentCoverageReport,
  type CoverageCounts,
  type StateCoverage,
} from "@/lib/agent-coverage";

type Filter = "all" | "gaps" | "complete";
type Sort = "deficient" | "name" | "agents";

const LEVELS = [
  { key: "state", label: "State agents" },
  { key: "lgas", label: "LGA agents" },
  { key: "wards", label: "Ward agents" },
  { key: "pollingUnits", label: "Polling unit agents" },
] as const;

const fmt = (n: number) => n.toLocaleString("en-NG");

function stateIsComplete(s: StateCoverage): boolean {
  return [s.state, s.lgas, s.wards, s.pollingUnits].every(isComplete);
}

function pctTone(p: number): string {
  if (p >= 100) return "text-emerald-700";
  if (p >= 75) return "text-emerald-600";
  if (p >= 25) return "text-amber-600";
  return "text-red-600";
}

function Bar({ c, className }: { c: CoverageCounts; className?: string }) {
  const filled = c.required ? (Math.min(c.filled, c.required) / c.required) * 100 : 100;
  const pending = c.required ? (Math.min(c.pending, c.required - Math.min(c.filled, c.required)) / c.required) * 100 : 0;
  return (
    <div className={cn("flex h-2 w-full overflow-hidden rounded-full bg-neutral-200", className)} aria-hidden>
      <div className="h-full bg-sdp-accent" style={{ width: `${filled}%` }} />
      <div className="h-full bg-amber-300" style={{ width: `${pending}%` }} />
    </div>
  );
}

function LevelCell({ c }: { c: CoverageCounts }) {
  const p = pct(c);
  return (
    <div className="min-w-[8.5rem] space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-semibold text-neutral-900">
          {fmt(c.filled)} / {fmt(c.required)}
        </span>
        <span className={cn("font-semibold", pctTone(p))}>{p}%</span>
      </div>
      <Bar c={c} />
      {c.pending > 0 ? <p className="text-[11px] text-amber-700">+{fmt(c.pending)} awaiting review</p> : null}
    </div>
  );
}

function PostBadge({ c }: { c: CoverageCounts }) {
  if (c.filled >= c.required) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
        <CheckCircle2 className="h-3.5 w-3.5" /> Filled
      </span>
    );
  }
  if (c.pending > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
        <Clock className="h-3.5 w-3.5" /> Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
      <XCircle className="h-3.5 w-3.5" /> Missing
    </span>
  );
}

function gapsSummary(s: StateCoverage): string[] {
  const out: string[] = [];
  if (!isComplete(s.state)) out.push("No state agent");
  const missing = (c: CoverageCounts) => Math.max(0, c.required - c.filled);
  if (missing(s.lgas)) out.push(`${fmt(missing(s.lgas))} LGA${missing(s.lgas) === 1 ? "" : "s"} without an agent`);
  if (missing(s.wards)) out.push(`${fmt(missing(s.wards))} ward${missing(s.wards) === 1 ? "" : "s"} without an agent`);
  if (missing(s.pollingUnits))
    out.push(`${fmt(missing(s.pollingUnits))} polling unit${missing(s.pollingUnits) === 1 ? "" : "s"} without an agent`);
  return out;
}

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function postStatus(c: CoverageCounts): string {
  return c.filled >= c.required ? "Filled" : c.pending > 0 ? "Pending" : "Missing";
}

function downloadCsv(report: AgentCoverageReport) {
  const header = [
    "State",
    "State agent",
    "LGA",
    "LGA agent",
    "Wards (total)",
    "Wards with approved agent",
    "Wards awaiting review",
    "Polling units (total)",
    "Polling units with approved agent",
    "Polling units awaiting review",
  ];
  const rows = report.states.flatMap((s) =>
    s.lgaBreakdown.map((l) => [
      s.stateName,
      postStatus(s.state),
      l.lgaName,
      postStatus(l.lga),
      l.wards.required,
      l.wards.filled,
      l.wards.pending,
      l.pollingUnits.required,
      l.pollingUnits.filled,
      l.pollingUnits.pending,
    ])
  );
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `SDP-Agent-Coverage-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function AgentCoverageClient({ report, generatedAt }: { report: AgentCoverageReport; generatedAt: string }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("deficient");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lgaSearch, setLgaSearch] = useState("");
  const [gapsOnly, setGapsOnly] = useState(false);

  const n = report.national;
  const totalStates = report.states.length;
  const completeCount = n.completeStates;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = report.states.filter((s) => {
      if (q && !s.stateName.toLowerCase().includes(q)) return false;
      if (filter === "complete") return stateIsComplete(s);
      if (filter === "gaps") return !stateIsComplete(s);
      return true;
    });
    return [...list].sort((a, b) => {
      if (sort === "name") return a.stateName.localeCompare(b.stateName);
      if (sort === "agents") return b.approvedAgents - a.approvedAgents || a.stateName.localeCompare(b.stateName);
      return a.overallPct - b.overallPct || a.stateName.localeCompare(b.stateName);
    });
  }, [report.states, search, filter, sort]);

  const selected = report.states.find((s) => s.stateId === selectedId) ?? null;

  const lgaRows = useMemo(() => {
    if (!selected) return [];
    const q = lgaSearch.trim().toLowerCase();
    return selected.lgaBreakdown.filter((l) => {
      if (q && !l.lgaName.toLowerCase().includes(q)) return false;
      if (gapsOnly) return ![l.lga, l.wards, l.pollingUnits].every(isComplete);
      return true;
    });
  }, [selected, lgaSearch, gapsOnly]);

  const openState = (id: string) => {
    setLgaSearch("");
    setGapsOnly(false);
    setSelectedId(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Agent coverage by state</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">
            Every state needs 1 state agent, 1 agent per LGA, 1 per ward and 1 per polling unit. A post counts as
            filled once an approved agent holds it; posts with agents still awaiting review are shown in amber.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button asChild variant="outline" className="min-h-[44px]">
            <Link href="/admin/agent-registrations">Agent registrations</Link>
          </Button>
          <Button
            type="button"
            className="min-h-[44px] bg-sdp-primary text-white hover:bg-[#e0752a]"
            onClick={() => downloadCsv(report)}
            disabled={totalStates === 0}
          >
            <Download className="h-4 w-4" />
            Download report (CSV)
          </Button>
        </div>
      </div>

      {totalStates === 0 ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          The list of states, LGAs, wards and polling units could not be loaded, so coverage cannot be calculated.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {LEVELS.map(({ key, label }) => {
          const c = n[key];
          const p = pct(c);
          return (
            <div key={key} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-neutral-600">{label}</p>
              <p className="mt-1 text-2xl font-bold text-neutral-900">
                {fmt(c.filled)}
                <span className="text-base font-medium text-neutral-500"> / {fmt(c.required)}</span>
              </p>
              <Bar c={c} className="mt-3 h-2.5" />
              <p className="mt-2 flex flex-wrap justify-between gap-x-2 text-xs">
                <span className={cn("font-semibold", pctTone(p))}>{p}% filled</span>
                {c.pending > 0 ? <span className="text-amber-700">+{fmt(c.pending)} awaiting review</span> : null}
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm shadow-sm">
        <span>
          <strong className="text-neutral-900">{fmt(n.approvedAgents)}</strong>{" "}
          <span className="text-neutral-600">approved agents</span>
        </span>
        <span>
          <strong className="text-amber-700">{fmt(n.pendingAgents)}</strong>{" "}
          <span className="text-neutral-600">awaiting review</span>
        </span>
        <span>
          <strong className="text-neutral-900">
            {completeCount} of {totalStates}
          </strong>{" "}
          <span className="text-neutral-600">states fully covered</span>
        </span>
        <span className="ml-auto text-xs text-neutral-500">
          Updated {generatedAt.slice(0, 16).replace("T", " ")} UTC · refresh the page for the latest
        </span>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            placeholder="Search state"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-h-[44px] pl-9"
            aria-label="Search state"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", `All (${totalStates})`],
              ["gaps", `Needs agents (${totalStates - completeCount})`],
              ["complete", `Complete (${completeCount})`],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              type="button"
              variant={filter === id ? "default" : "outline"}
              className={filter === id ? "min-h-[40px] bg-sdp-primary" : "min-h-[40px]"}
              onClick={() => setFilter(id)}
            >
              {label}
            </Button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-neutral-700 lg:ml-auto">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="min-h-[40px] rounded-md border border-neutral-300 bg-white px-3 text-sm"
          >
            <option value="deficient">Most deficient first</option>
            <option value="name">State A–Z</option>
            <option value="agents">Most agents</option>
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50">
              <tr>
                <th className="px-4 py-3 font-semibold text-neutral-700">State</th>
                <th className="px-4 py-3 font-semibold text-neutral-700">State agent</th>
                <th className="px-4 py-3 font-semibold text-neutral-700">LGA agents</th>
                <th className="px-4 py-3 font-semibold text-neutral-700">Ward agents</th>
                <th className="px-4 py-3 font-semibold text-neutral-700">Polling unit agents</th>
                <th className="px-4 py-3 font-semibold text-neutral-700">Overall</th>
                <th className="w-8 px-2 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-neutral-600">
                    No states match.
                  </td>
                </tr>
              ) : (
                visible.map((s) => {
                  const complete = stateIsComplete(s);
                  return (
                    <tr
                      key={s.stateId}
                      role="button"
                      tabIndex={0}
                      onClick={() => openState(s.stateId)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openState(s.stateId);
                        }
                      }}
                      className="cursor-pointer align-top hover:bg-sdp-primary/5 focus:bg-sdp-primary/5 focus:outline-none"
                      aria-label={`View ${s.stateName} coverage`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-neutral-900">{s.stateName}</p>
                        <p className="text-xs text-neutral-500">
                          {fmt(s.approvedAgents)} approved
                          {s.pendingAgents ? ` · ${fmt(s.pendingAgents)} pending` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <PostBadge c={s.state} />
                      </td>
                      <td className="px-4 py-3">
                        <LevelCell c={s.lgas} />
                      </td>
                      <td className="px-4 py-3">
                        <LevelCell c={s.wards} />
                      </td>
                      <td className="px-4 py-3">
                        <LevelCell c={s.pollingUnits} />
                      </td>
                      <td className="px-4 py-3">
                        {complete ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                          </span>
                        ) : (
                          <span className={cn("text-base font-bold", pctTone(s.overallPct))}>{s.overallPct}%</span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-neutral-400">
                        <ChevronRight className="h-4 w-4" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-4 border-t border-neutral-200 bg-neutral-50 px-4 py-2 text-xs text-neutral-600">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-full bg-sdp-accent" /> Approved agent
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-full bg-amber-300" /> Awaiting review
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-full bg-neutral-200" /> No agent yet
          </span>
          <span className="ml-auto">Overall = average of the four levels</span>
        </div>
      </div>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent
          side="right"
          className="flex w-full min-w-0 max-w-full flex-col gap-0 overflow-y-auto overflow-x-hidden p-0 sm:max-w-2xl"
        >
          {selected && (
            <>
              <SheetHeader className="sticky top-0 z-10 shrink-0 space-y-0 border-b border-neutral-200 bg-white px-4 py-3 sm:px-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <SheetTitle className="text-left text-lg">{selected.stateName}</SheetTitle>
                    <p className="text-xs text-neutral-500">
                      {fmt(selected.approvedAgents)} approved agents
                      {selected.pendingAgents ? ` · ${fmt(selected.pendingAgents)} awaiting review` : ""}
                    </p>
                  </div>
                  <SheetClose asChild>
                    <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" aria-label="Close">
                      <X className="h-5 w-5" />
                    </Button>
                  </SheetClose>
                </div>
              </SheetHeader>

              <div className="min-w-0 flex-1 space-y-5 px-4 py-4 sm:px-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  {LEVELS.map(({ key, label }) => (
                    <div key={key} className="rounded-lg border border-neutral-200 p-3">
                      <p className="mb-2 text-xs font-medium text-neutral-600">{label}</p>
                      <LevelCell c={selected[key]} />
                    </div>
                  ))}
                </div>

                {stateIsComplete(selected) ? (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
                    <CheckCircle2 className="h-5 w-5" /> Every post in {selected.stateName} has an approved agent.
                  </div>
                ) : (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-sm font-semibold text-red-800">Still needed</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-red-700">
                      {gapsSummary(selected).map((g) => (
                        <li key={g}>{g}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <h3 className="text-sm font-semibold text-neutral-900">LGAs ({selected.lgaBreakdown.length})</h3>
                    <div className="relative sm:ml-auto sm:w-56">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                      <Input
                        placeholder="Search LGA"
                        value={lgaSearch}
                        onChange={(e) => setLgaSearch(e.target.value)}
                        className="min-h-[40px] pl-9"
                        aria-label="Search LGA"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-neutral-700">
                      <input
                        type="checkbox"
                        checked={gapsOnly}
                        onChange={(e) => setGapsOnly(e.target.checked)}
                        className="h-4 w-4 accent-sdp-primary"
                      />
                      Only gaps
                    </label>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-neutral-200">
                    <table className="w-full min-w-[560px] text-left text-sm">
                      <thead className="border-b border-neutral-200 bg-neutral-50">
                        <tr>
                          <th className="px-3 py-2 font-semibold text-neutral-700">LGA</th>
                          <th className="px-3 py-2 font-semibold text-neutral-700">LGA agent</th>
                          <th className="px-3 py-2 font-semibold text-neutral-700">Wards</th>
                          <th className="px-3 py-2 font-semibold text-neutral-700">Polling units</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {lgaRows.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-3 py-8 text-center text-neutral-600">
                              {gapsOnly ? "No gaps — every LGA here is fully covered." : "No LGAs match."}
                            </td>
                          </tr>
                        ) : (
                          lgaRows.map((l) => (
                            <tr key={l.lgaId} className="align-top">
                              <td className="px-3 py-2 font-medium text-neutral-900">{l.lgaName}</td>
                              <td className="px-3 py-2">
                                <PostBadge c={l.lga} />
                              </td>
                              <td className="px-3 py-2">
                                <LevelCell c={l.wards} />
                              </td>
                              <td className="px-3 py-2">
                                <LevelCell c={l.pollingUnits} />
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
