"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, CircleDashed, Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ComparisonStatus, ComparisonView } from "@/lib/elections/dashboard";
import { RESULT_LEVEL_LABELS, raceAllowsLevel, raceLabel, type Election, type Race } from "@/lib/elections/shared";
import { cn } from "@/lib/utils";
import { ResultDetailSheet } from "./ResultDetailSheet";

const fmt = (n: number) => n.toLocaleString("en-NG");

function label(r: ComparisonView) {
  if (r.level === "ward") return `${r.wardName} ward`;
  if (r.level === "lga") return `${r.lgaName} LGA`;
  return `${r.stateName} State`;
}

function StatusBadge({ s }: { s: ComparisonStatus }) {
  if (s === "problem") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
        <AlertTriangle className="h-3.5 w-3.5" /> Differs
      </span>
    );
  }
  if (s === "match") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
        <CheckCircle2 className="h-3.5 w-3.5" /> Matches
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600">
      <CircleDashed className="h-3.5 w-3.5" /> Awaiting PUs
    </span>
  );
}

function Diff({ collation, pu }: { collation: number; pu: number }) {
  const d = collation - pu;
  return (
    <span className={cn("tabular-nums", d < 0 ? "text-red-600" : d > 0 ? "text-amber-700" : "text-neutral-400")}>
      {d > 0 ? "+" : ""}
      {fmt(d)}
    </span>
  );
}

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(rows: ComparisonView[], parties: string[], name: string) {
  const header = ["Level", "Location", "Code", "State", "PUs reported", "PUs total", "Status"];
  for (const p of parties) header.push(`${p} collation`, `${p} PU sum`, `${p} difference`);
  const lines = rows.map((r) => {
    const cells: (string | number)[] = [
      RESULT_LEVEL_LABELS[r.level],
      label(r),
      r.locationCode,
      r.stateName,
      r.pusReported,
      r.pusTotal,
      r.status === "problem" ? "Differs" : r.status === "match" ? "Matches" : "Awaiting PUs",
    ];
    for (const p of parties) {
      const c = r.collation[p] ?? 0;
      const u = r.puTotals[p] ?? 0;
      cells.push(c, u, c - u);
    }
    return cells;
  });
  const csv = [header, ...lines].map((l) => l.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.replace(/[^\w-]+/g, "-")}-PU-vs-collation.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function ComparisonTab({
  election,
  race,
  rows,
  states,
  onChanged,
}: {
  election: Election;
  race: Race;
  rows: ComparisonView[];
  states: { id: string; name: string }[];
  onChanged: () => void;
}) {
  const [level, setLevel] = useState<"all" | ComparisonView["level"]>("all");
  const [stateId, setStateId] = useState("all");
  const [status, setStatus] = useState<"all" | ComparisonStatus>("problem");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ComparisonView | null>(null);
  const [openResultId, setOpenResultId] = useState<string | null>(null);
  const [limit, setLimit] = useState(200);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const order: Record<ComparisonStatus, number> = { problem: 0, partial: 1, match: 2 };
    return rows
      .filter(
        (r) =>
          (level === "all" || r.level === level) &&
          (stateId === "all" || r.stateId.toLowerCase() === stateId) &&
          (status === "all" || r.status === status) &&
          (!q || label(r).toLowerCase().includes(q) || r.locationCode.includes(q))
      )
      .sort(
        (a, b) =>
          order[a.status] - order[b.status] ||
          Math.abs(b.collationValid - b.puValid) - Math.abs(a.collationValid - a.puValid)
      );
  }, [rows, level, stateId, status, search]);

  const counts = useMemo(() => {
    const c = { problem: 0, partial: 0, match: 0 };
    for (const r of rows) c[r.status] += 1;
    return c;
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700 shadow-sm">
        <p>
          <strong>{raceLabel(race)}:</strong> each collation result sent by our agents is compared with the sum of the polling unit
          results beneath it. <strong className="text-red-700">Differs</strong> means a party has fewer votes in the
          collation than our polling units already show (votes lost), or — once every polling unit is in — more votes
          than the polling units add up to (votes added).
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(
            [
              ["problem", `Differs (${fmt(counts.problem)})`],
              ["partial", `Awaiting PUs (${fmt(counts.partial)})`],
              ["match", `Matches (${fmt(counts.match)})`],
              ["all", `All (${fmt(rows.length)})`],
            ] as const
          ).map(([k, text]) => (
            <button
              key={k}
              type="button"
              onClick={() => setStatus(k)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm font-medium",
                status === k ? "border-sdp-primary bg-sdp-primary text-white" : "border-neutral-300 bg-white text-neutral-700"
              )}
            >
              {text}
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-neutral-200 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search location or code" className="h-9 pl-9" />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as typeof level)}
              className="h-9 rounded-md border border-neutral-300 bg-white px-2 text-sm"
            >
              <option value="all">All collation levels</option>
              <option value="ward">Ward</option>
              {raceAllowsLevel(race, "lga") ? <option value="lga">LGA</option> : null}
              {raceAllowsLevel(race, "state") ? <option value="state">State</option> : null}
            </select>
            <select
              value={stateId}
              onChange={(e) => setStateId(e.target.value)}
              className="h-9 rounded-md border border-neutral-300 bg-white px-2 text-sm"
            >
              <option value="all">All states</option>
              {states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <Button type="button" variant="outline" size="sm" onClick={() => downloadCsv(filtered, election.parties, `${election.name}-${raceLabel(race)}`)}>
              <Download className="h-4 w-4" /> CSV
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-2.5">Collation</th>
                <th className="px-4 py-2.5">PUs in</th>
                <th className="px-4 py-2.5 text-right">Valid votes: collation</th>
                <th className="px-4 py-2.5 text-right">Our PU sum</th>
                <th className="px-4 py-2.5 text-right">Difference</th>
                <th className="px-4 py-2.5 text-right">SDP difference</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-2 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-neutral-500">
                    {rows.length === 0 ? "No collation results have been sent yet." : "Nothing matches these filters."}
                  </td>
                </tr>
              ) : (
                filtered.slice(0, limit).map((r) => (
                  <tr key={r.resultId} className="cursor-pointer hover:bg-neutral-50" onClick={() => setSelected(r)}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-neutral-900">{label(r)}</p>
                      <p className="text-xs text-neutral-500">
                        {RESULT_LEVEL_LABELS[r.level]} · <span className="font-mono">{r.locationCode}</span>
                        {r.level !== "state" ? ` · ${r.stateName}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-neutral-700">
                      {fmt(r.pusReported)} / {fmt(r.pusTotal)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmt(r.collationValid)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmt(r.puValid)}</td>
                    <td className="px-4 py-3 text-right">
                      <Diff collation={r.collationValid} pu={r.puValid} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Diff collation={r.collation.SDP ?? 0} pu={r.puTotals.SDP ?? 0} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge s={r.status} />
                      {r.lost.length ? (
                        <p className="mt-0.5 text-xs text-red-600">Lost: {r.lost.slice(0, 4).join(", ")}{r.lost.length > 4 ? "…" : ""}</p>
                      ) : null}
                      {r.added.length ? (
                        <p className="mt-0.5 text-xs text-amber-700">Added: {r.added.slice(0, 4).join(", ")}{r.added.length > 4 ? "…" : ""}</p>
                      ) : null}
                    </td>
                    <td className="px-2 py-3 text-neutral-400">
                      <ChevronRight className="h-4 w-4" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > limit ? (
          <div className="border-t border-neutral-200 p-3 text-center">
            <Button type="button" variant="outline" size="sm" onClick={() => setLimit((l) => l + 200)}>
              Show more ({fmt(filtered.length - limit)} remaining)
            </Button>
          </div>
        ) : null}
      </section>

      <Sheet open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle>{label(selected)}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge s={selected.status} />
                  <span className="text-neutral-600">
                    {RESULT_LEVEL_LABELS[selected.level]} · <span className="font-mono">{selected.locationCode}</span> ·{" "}
                    {fmt(selected.pusReported)} of {fmt(selected.pusTotal)} polling units reported
                  </span>
                </div>
                {selected.status === "partial" ? (
                  <p className="rounded-md bg-neutral-50 px-3 py-2 text-neutral-600">
                    Not every polling unit has reported, so the PU sum can only be lower than the collation. A
                    difference is flagged only if a party has fewer votes in the collation than our polling units show.
                  </p>
                ) : null}
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b text-xs uppercase text-neutral-500">
                      <th className="py-1.5">Party</th>
                      <th className="py-1.5 text-right">Collation</th>
                      <th className="py-1.5 text-right">Our PU sum</th>
                      <th className="py-1.5 text-right">Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {election.parties.map((p) => {
                      const c = selected.collation[p] ?? 0;
                      const u = selected.puTotals[p] ?? 0;
                      const bad = selected.lost.includes(p) || selected.added.includes(p);
                      return (
                        <tr
                          key={p}
                          className={cn(p === "SDP" && "font-semibold", bad && "bg-red-50")}
                        >
                          <td className={cn("py-1 pl-1", p === "SDP" && "text-sdp-primary")}>{p}</td>
                          <td className="py-1 text-right tabular-nums">{fmt(c)}</td>
                          <td className="py-1 text-right tabular-nums">{fmt(u)}</td>
                          <td className="py-1 pr-1 text-right">
                            <Diff collation={c} pu={u} />
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-t font-semibold">
                      <td className="py-1.5 pl-1">Total</td>
                      <td className="py-1.5 text-right tabular-nums">{fmt(selected.collationValid)}</td>
                      <td className="py-1.5 text-right tabular-nums">{fmt(selected.puValid)}</td>
                      <td className="py-1.5 pr-1 text-right">
                        <Diff collation={selected.collationValid} pu={selected.puValid} />
                      </td>
                    </tr>
                  </tbody>
                </table>
                <Button type="button" variant="outline" onClick={() => setOpenResultId(selected.resultId)}>
                  Open the collation result and photo
                </Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <ResultDetailSheet
        resultId={openResultId}
        parties={election.parties}
        onClose={() => setOpenResultId(null)}
        onChanged={onChanged}
      />
    </div>
  );
}
