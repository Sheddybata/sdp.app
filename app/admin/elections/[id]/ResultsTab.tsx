"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Loader2, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminListElectionResults } from "@/app/actions/adminElections";
import type { ResultRecord } from "@/lib/db/elections";
import {
  RESULT_LEVELS,
  RESULT_LEVEL_LABELS,
  raceAllowsLevel,
  type Election,
  type Race,
  type ResultLevel,
} from "@/lib/elections/shared";
import { cn } from "@/lib/utils";
import { ResultDetailSheet, resultLocationLabel } from "./ResultDetailSheet";

type Only = "all" | "flagged" | "unverified" | "verified" | "backup";

const fmt = (n: number) => n.toLocaleString("en-NG");

export function ResultsTab({
  election,
  race,
  states,
  initialStateId,
  initialLevel,
  onChanged,
}: {
  election: Election;
  race: Race;
  states: { id: string; name: string }[];
  initialStateId: string;
  initialLevel: ResultLevel | "all";
  onChanged: () => void;
}) {
  const [level, setLevel] = useState<ResultLevel | "all">(initialLevel);
  const [stateId, setStateId] = useState(initialStateId);
  const [only, setOnly] = useState<Only>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<ResultRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminListElectionResults({ electionId: election.id, race, level, stateId, only, search, page });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setRows(res.rows);
      setTotal(res.total);
      setPageSize(res.pageSize);
    } catch {
      setError("Could not load results.");
    } finally {
      setLoading(false);
    }
  }, [election.id, race, level, stateId, only, search, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-neutral-200 p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search polling unit, ward, LGA, code or agent"
            className="h-9 pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={level}
            onChange={(e) => {
              setLevel(e.target.value as ResultLevel | "all");
              setPage(0);
            }}
            className="h-9 rounded-md border border-neutral-300 bg-white px-2 text-sm"
          >
            <option value="all">All levels</option>
            {RESULT_LEVELS.filter((l) => raceAllowsLevel(race, l)).map((l) => (
              <option key={l} value={l}>
                {RESULT_LEVEL_LABELS[l]}
              </option>
            ))}
          </select>
          <select
            value={stateId}
            onChange={(e) => {
              setStateId(e.target.value);
              setPage(0);
            }}
            className="h-9 rounded-md border border-neutral-300 bg-white px-2 text-sm"
          >
            <option value="all">All states</option>
            {states.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={only}
            onChange={(e) => {
              setOnly(e.target.value as Only);
              setPage(0);
            }}
            className="h-9 rounded-md border border-neutral-300 bg-white px-2 text-sm"
          >
            <option value="all">All results</option>
            <option value="flagged">Figures don&apos;t add up</option>
            <option value="unverified">Not yet verified</option>
            <option value="verified">Verified</option>
            <option value="backup">Backups by ward agents</option>
          </select>
        </div>
      </div>

      {error ? <p className="m-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="relative overflow-x-auto">
        {loading ? (
          <div className="absolute inset-0 z-10 flex items-start justify-center bg-white/60 pt-10">
            <Loader2 className="h-6 w-6 animate-spin text-sdp-primary" />
          </div>
        ) : null}
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-2.5">Location</th>
              <th className="px-4 py-2.5">Level</th>
              <th className="px-4 py-2.5">Sent by</th>
              <th className="px-4 py-2.5 text-right">Valid votes</th>
              <th className="px-4 py-2.5 text-right">SDP</th>
              <th className="px-4 py-2.5">Checks</th>
              <th className="px-4 py-2.5">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-neutral-500">
                  No results match.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const sdp = r.partyVotes.SDP ?? 0;
                return (
                  <tr key={r.id} className="cursor-pointer hover:bg-neutral-50" onClick={() => setOpenId(r.id)}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-neutral-900">{resultLocationLabel(r)}</p>
                      <p className="text-xs text-neutral-500">
                        <span className="font-mono">{r.locationCode}</span> · {r.stateName}
                        {r.lgaName && r.level !== "lga" ? `, ${r.lgaName}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-neutral-700">{RESULT_LEVEL_LABELS[r.level]}</td>
                    <td className="px-4 py-3">
                      <p className="text-neutral-800">{r.submitterName}</p>
                      <p className="flex items-center gap-1 text-xs text-neutral-500">
                        {r.isBackup ? <span className="rounded bg-blue-50 px-1 text-blue-700">backup</span> : null}
                        {r.version > 1 ? <span>v{r.version}</span> : null}
                        {r.latitude != null ? <MapPin className="h-3 w-3" aria-label="Location shared" /> : null}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmt(r.totalValidVotes)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {fmt(sdp)}
                      <span className="block text-xs text-neutral-500">
                        {r.totalValidVotes ? `${((sdp / r.totalValidVotes) * 100).toFixed(1)}%` : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5 text-xs">
                        {r.discrepancies.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-amber-700">
                            <AlertTriangle className="h-3.5 w-3.5" /> {r.discrepancies.length} issue
                            {r.discrepancies.length === 1 ? "" : "s"}
                          </span>
                        ) : (
                          <span className="text-neutral-500">Adds up</span>
                        )}
                        {r.verifiedAt ? (
                          <span className="inline-flex items-center gap-1 text-green-700">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-600">{format(new Date(r.updatedAt), "d MMM, h:mm a")}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3 text-sm text-neutral-600">
        <span>
          {fmt(total)} result{total === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={page === 0 || loading} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className={cn("tabular-nums")}>
            Page {page + 1} of {fmt(pages)}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page + 1 >= pages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ResultDetailSheet
        resultId={openId}
        parties={election.parties}
        onClose={() => setOpenId(null)}
        onChanged={() => {
          void load();
          onChanged();
        }}
      />
    </section>
  );
}
