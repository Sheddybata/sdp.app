"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Download,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CheckinRecord, IncidentRecord } from "@/lib/db/elections";
import {
  ELECTION_STATUSES,
  RACE_TOP_LEVEL,
  labelFor,
  raceAllowsLevel,
  raceLabel,
  type Election,
  type Race,
  type ResultLevel,
} from "@/lib/elections/shared";
import {
  pctOf,
  rankParties,
  type ComparisonView,
  type NationalSummary,
  type Progress,
  type StateProgress,
} from "@/lib/elections/dashboard";
import { cn } from "@/lib/utils";
import { STATUS_STYLES, StatusControls } from "../ElectionsAdminClient";
import { ResultsTab } from "./ResultsTab";
import { ComparisonTab } from "./ComparisonTab";
import { CheckinsTab, IncidentsTab } from "./IncidentsTab";

type Tab = "overview" | "results" | "comparison" | "incidents" | "checkins";

const fmt = (n: number) => n.toLocaleString("en-NG");

export function ProgressBar({ p, tone = "bg-sdp-accent", className }: { p: Progress; tone?: string; className?: string }) {
  const w = pctOf(p);
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-neutral-200", className)} aria-hidden>
      <div className={cn("h-full", tone)} style={{ width: `${w}%` }} />
    </div>
  );
}

function KpiCard({ label, p, hint }: { label: string; p: Progress; hint: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-neutral-600">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-neutral-900">
        {fmt(p.reported)} <span className="text-base font-medium text-neutral-400">/ {fmt(p.required)}</span>
      </p>
      <ProgressBar p={p} className="mt-2" />
      <p className="mt-1 text-xs text-neutral-500">
        {pctOf(p)}% {hint}
      </p>
    </div>
  );
}

const COLLATION_SOURCE_LABEL: Record<ResultLevel, string> = {
  polling_unit: "Polling unit results",
  ward: "Ward collations",
  lga: "LGA collations",
  state: "State collations",
};

function PartyStandings({
  national,
  parties,
  race,
}: {
  national: NationalSummary;
  parties: string[];
  race: Race;
}) {
  const topLevel = RACE_TOP_LEVEL[race];
  const [source, setSource] = useState<"pu" | "collation">("pu");
  const votes = source === "pu" ? national.puPartyVotes : national.collationPartyVotes;
  const ranked = rankParties(votes, parties);
  const total = ranked.reduce((a, r) => a + r.votes, 0);
  const max = ranked[0]?.votes || 1;
  const sdpRank = ranked.findIndex((r) => r.party === "SDP") + 1;
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? ranked : ranked.slice(0, 8);

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-neutral-900">Party standings — {raceLabel(race)}</h2>
          <p className="text-sm text-neutral-600">
            {fmt(total)} valid votes counted
            {sdpRank > 0 && total > 0 ? ` · SDP is ${ordinal(sdpRank)}` : ""}
          </p>
        </div>
        <div className="flex rounded-lg border border-neutral-200 p-0.5 text-sm">
          {(
            [
              ["pu", "Polling unit results"],
              ["collation", COLLATION_SOURCE_LABEL[topLevel]],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setSource(k)}
              className={cn(
                "rounded-md px-3 py-1.5 font-medium",
                source === k ? "bg-sdp-primary text-white" : "text-neutral-600 hover:bg-neutral-50"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {total === 0 ? (
        <p className="mt-6 text-center text-sm text-neutral-500">No votes reported yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {shown.map((r) => (
            <li key={r.party} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 text-sm">
              <span className={cn("font-semibold", r.party === "SDP" ? "text-sdp-primary" : "text-neutral-800")}>{r.party}</span>
              <div className="h-5 overflow-hidden rounded bg-neutral-100">
                <div
                  className={cn("h-full rounded", r.party === "SDP" ? "bg-sdp-primary" : "bg-neutral-400")}
                  style={{ width: `${(r.votes / max) * 100}%` }}
                />
              </div>
              <span className="w-32 text-right tabular-nums text-neutral-700">
                {fmt(r.votes)} <span className="text-neutral-400">({((r.votes / total) * 100).toFixed(1)}%)</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {ranked.length > 8 && total > 0 ? (
        <button type="button" className="mt-3 text-sm font-medium text-sdp-primary" onClick={() => setShowAll((s) => !s)}>
          {showAll ? "Show top 8" : `Show all ${ranked.length} parties`}
        </button>
      ) : null}
      <p className="mt-3 text-xs text-neutral-500">
        {source === "pu"
          ? "Sum of the polling unit results sent by our agents — the party's own tally."
          : `Sum of the ${COLLATION_SOURCE_LABEL[topLevel].toLowerCase()} sent by our agents — the highest level we collate for this race.`}
      </p>
    </section>
  );
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

function StateTable({
  states,
  parties,
  race,
  onOpenState,
}: {
  states: StateProgress[];
  parties: string[];
  race: Race;
  onOpenState: (stateId: string) => void;
}) {
  const showLga = raceAllowsLevel(race, "lga");
  const showState = raceAllowsLevel(race, "state");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"progress" | "name" | "flagged">("progress");
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return states
      .filter((s) => !q || s.stateName.toLowerCase().includes(q))
      .sort((a, b) => {
        if (sort === "name") return a.stateName.localeCompare(b.stateName);
        if (sort === "flagged") return b.flagged - a.flagged || a.stateName.localeCompare(b.stateName);
        return pctOf(a.pollingUnits) - pctOf(b.pollingUnits) || a.stateName.localeCompare(b.stateName);
      });
  }, [states, search, sort]);

  return (
    <section className="rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-semibold text-neutral-900">States</h2>
        <div className="flex gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search state" className="h-9 w-44" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="h-9 rounded-md border border-neutral-300 bg-white px-2 text-sm"
          >
            <option value="progress">Least reported first</option>
            <option value="flagged">Most flagged first</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-2.5">State</th>
              <th className="px-4 py-2.5">Polling unit results</th>
              <th className="px-4 py-2.5">Wards</th>
              {showLga ? <th className="px-4 py-2.5">LGAs</th> : null}
              {showState ? <th className="px-4 py-2.5">State result</th> : null}
              <th className="px-4 py-2.5">Leading (PU tally)</th>
              <th className="px-4 py-2.5">SDP</th>
              <th className="px-4 py-2.5">Flagged</th>
              <th className="px-2 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((s) => {
              const ranked = rankParties(s.puPartyVotes, parties);
              const total = ranked.reduce((a, r) => a + r.votes, 0);
              const lead = total > 0 ? ranked[0] : null;
              const sdp = s.puPartyVotes.SDP ?? 0;
              return (
                <tr key={s.stateId} className="cursor-pointer hover:bg-neutral-50" onClick={() => onOpenState(s.stateId)}>
                  <td className="px-4 py-3 font-medium text-neutral-900">{s.stateName}</td>
                  <td className="px-4 py-3">
                    <div className="w-40 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold tabular-nums">
                          {fmt(s.pollingUnits.reported)} / {fmt(s.pollingUnits.required)}
                        </span>
                        <span className="text-neutral-500">{pctOf(s.pollingUnits)}%</span>
                      </div>
                      <ProgressBar p={s.pollingUnits} />
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-neutral-700">
                    {fmt(s.wards.reported)} / {fmt(s.wards.required)}
                  </td>
                  {showLga ? (
                    <td className="px-4 py-3 tabular-nums text-neutral-700">
                      {fmt(s.lgas.reported)} / {fmt(s.lgas.required)}
                    </td>
                  ) : null}
                  {showState ? (
                    <td className="px-4 py-3">
                      {s.state.reported ? (
                        <span className="inline-flex items-center gap-1 text-green-700">
                          <CheckCircle2 className="h-4 w-4" /> In
                        </span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                  ) : null}
                  <td className="px-4 py-3">
                    {lead ? (
                      <span className={cn("font-semibold", lead.party === "SDP" ? "text-sdp-primary" : "text-neutral-800")}>
                        {lead.party} <span className="font-normal text-neutral-500">{((lead.votes / total) * 100).toFixed(0)}%</span>
                      </span>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {total > 0 ? (
                      <span>
                        {fmt(sdp)} <span className="text-neutral-500">({((sdp / total) * 100).toFixed(1)}%)</span>
                      </span>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {s.flagged > 0 ? (
                      <span className="inline-flex items-center gap-1 text-amber-700">
                        <AlertTriangle className="h-3.5 w-3.5" /> {fmt(s.flagged)}
                      </span>
                    ) : (
                      <span className="text-neutral-400">0</span>
                    )}
                  </td>
                  <td className="px-2 py-3 text-neutral-400">
                    <ChevronRight className="h-4 w-4" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ElectionDashboardClient({
  election,
  race,
  raceCounts,
  states,
  national,
  comparison,
  incidents,
  recentCheckins,
  generatedAt,
}: {
  election: Election;
  race: Race;
  raceCounts: Record<string, number>;
  states: StateProgress[];
  national: NationalSummary;
  comparison: ComparisonView[];
  incidents: IncidentRecord[];
  recentCheckins: CheckinRecord[];
  generatedAt: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [resultsFilter, setResultsFilter] = useState<{ stateId: string; level: ResultLevel | "all"; key: number }>({
    stateId: "all",
    level: "all",
    key: 0,
  });
  const [refreshing, startRefresh] = useTransition();
  const [switching, startSwitch] = useTransition();
  const [autoRefresh, setAutoRefresh] = useState(election.status === "open");

  const switchRace = (r: Race) => {
    if (r === race) return;
    startSwitch(() => router.push(`/admin/elections/${election.id}?race=${r}`, { scroll: false }));
  };

  useEffect(() => {
    if (!autoRefresh) return;
    const t = window.setInterval(() => startRefresh(() => router.refresh()), 60_000);
    return () => window.clearInterval(t);
  }, [autoRefresh, router]);

  const problems = comparison.filter((c) => c.status === "problem").length;
  const openIncidents = incidents.filter((i) => i.status === "open");
  const urgent = openIncidents.filter((i) => i.severity === "high").length;
  const stateOptions = states.map((s) => ({ id: s.stateId, name: s.stateName }));

  const tabs: { id: Tab; label: string; badge?: number; tone?: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "results", label: "Results", badge: national.totalResults },
    { id: "comparison", label: "PU vs collation", badge: problems || undefined, tone: "bg-red-600 text-white" },
    { id: "incidents", label: "Incidents", badge: openIncidents.length || undefined, tone: urgent ? "bg-red-600 text-white" : undefined },
    { id: "checkins", label: "Check-ins" },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link href="/admin/elections" className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900">
          <ArrowLeft className="h-4 w-4" /> All elections
        </Link>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-neutral-900">{election.name}</h1>
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", STATUS_STYLES[election.status])}>
                {labelFor(ELECTION_STATUSES, election.status)}
              </span>
            </div>
            <p className="text-sm text-neutral-600">
              {format(new Date(`${election.electionDate}T12:00:00`), "EEEE d MMMM yyyy")} · Updated{" "}
              {format(new Date(generatedAt), "h:mm:ss a")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusControls election={election} />
            <label className="flex items-center gap-1.5 text-sm text-neutral-700">
              <input
                type="checkbox"
                className="h-4 w-4 accent-sdp-primary"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh
            </label>
            <Button type="button" variant="outline" size="sm" disabled={refreshing} onClick={() => startRefresh(() => router.refresh())}>
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={`/admin/elections/${election.id}/export?kind=results`}>
                <Download className="h-4 w-4" /> Results CSV
              </a>
            </Button>
          </div>
        </div>
        {election.races.length > 1 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-white p-2 shadow-sm">
            <span className="px-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Race</span>
            {election.races.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => switchRace(r)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-semibold",
                  r === race ? "bg-sdp-primary text-white" : "text-neutral-700 hover:bg-neutral-100"
                )}
              >
                {raceLabel(r)}
                <span className={cn("ml-1.5 text-xs font-normal", r === race ? "text-white/80" : "text-neutral-500")}>
                  {fmt(raceCounts[r] ?? 0)}
                </span>
              </button>
            ))}
            {switching ? <Loader2 className="h-4 w-4 animate-spin text-sdp-primary" /> : null}
          </div>
        ) : null}
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-neutral-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium",
              tab === t.id ? "border-sdp-primary text-sdp-primary" : "border-transparent text-neutral-600 hover:text-neutral-900"
            )}
          >
            {t.label}
            {t.badge ? (
              <span className={cn("rounded-full px-1.5 py-0.5 text-[11px] font-semibold", t.tone ?? "bg-neutral-200 text-neutral-700")}>
                {fmt(t.badge)}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Polling unit results" p={national.pollingUnits} hint="of polling units reported" />
            <KpiCard label="Ward collations" p={national.wards} hint="of wards reported" />
            {raceAllowsLevel(race, "lga") ? (
              <KpiCard label="LGA collations" p={national.lgas} hint="of LGAs reported" />
            ) : null}
            {raceAllowsLevel(race, "state") ? (
              <KpiCard label="State collations" p={national.states} hint="of states reported" />
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <button
              type="button"
              onClick={() => setTab("results")}
              className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left"
            >
              <AlertTriangle className="h-6 w-6 text-amber-600" />
              <span>
                <span className="block text-xl font-bold tabular-nums text-amber-900">{fmt(national.flagged)}</span>
                <span className="text-sm text-amber-800">results with figures that don&apos;t add up</span>
              </span>
            </button>
            <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
              <ShieldCheck className="h-6 w-6 text-green-600" />
              <span>
                <span className="block text-xl font-bold tabular-nums text-green-900">{fmt(national.verified)}</span>
                <span className="text-sm text-green-800">verified by HQ against the photo</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setTab("comparison")}
              className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-left"
            >
              <ShieldAlert className="h-6 w-6 text-red-600" />
              <span>
                <span className="block text-xl font-bold tabular-nums text-red-900">{fmt(problems)}</span>
                <span className="text-sm text-red-800">collations that differ from our PU tally</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTab("incidents")}
              className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 text-left"
            >
              <AlertTriangle className={cn("h-6 w-6", urgent ? "text-red-600" : "text-neutral-500")} />
              <span>
                <span className="block text-xl font-bold tabular-nums text-neutral-900">{fmt(openIncidents.length)}</span>
                <span className="text-sm text-neutral-600">
                  open incidents{urgent ? ` (${fmt(urgent)} urgent)` : ""}
                </span>
              </span>
            </button>
          </div>
          <PartyStandings key={race} national={national} parties={election.parties} race={race} />
          <StateTable
            states={states}
            parties={election.parties}
            race={race}
            onOpenState={(stateId) => {
              setResultsFilter((f) => ({ stateId, level: "all", key: f.key + 1 }));
              setTab("results");
            }}
          />
        </div>
      ) : null}

      {tab === "results" ? (
        <ResultsTab
          key={`${race}-${resultsFilter.key}`}
          election={election}
          race={race}
          states={stateOptions}
          initialStateId={resultsFilter.stateId}
          initialLevel={resultsFilter.level}
          onChanged={() => router.refresh()}
        />
      ) : null}
      {tab === "comparison" ? (
        <ComparisonTab
          key={race}
          election={election}
          race={race}
          rows={comparison}
          states={stateOptions}
          onChanged={() => router.refresh()}
        />
      ) : null}
      {tab === "incidents" ? (
        <IncidentsTab electionId={election.id} incidents={incidents} states={stateOptions} onChanged={() => router.refresh()} />
      ) : null}
      {tab === "checkins" ? <CheckinsTab states={states} national={national} recent={recentCheckins} /> : null}
    </div>
  );
}
