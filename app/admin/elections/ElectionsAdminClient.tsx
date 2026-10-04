"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ChevronRight, Loader2, Pencil, Plus, Vote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { adminCreateElection, adminSetElectionStatus, adminUpdateElection } from "@/app/actions/adminElections";
import {
  DEFAULT_PARTIES,
  ELECTION_PRESETS,
  ELECTION_STATUSES,
  ELECTION_TYPES,
  RACE_IDS,
  labelFor,
  racesLabel,
  type Election,
  type ElectionStatus,
  type Race,
} from "@/lib/elections/shared";
import { cn } from "@/lib/utils";

export const STATUS_STYLES: Record<ElectionStatus, string> = {
  draft: "bg-neutral-200 text-neutral-700",
  open: "bg-green-100 text-green-800",
  closed: "bg-amber-100 text-amber-800",
  locked: "bg-neutral-800 text-white",
};

/** Next status actions offered for each status. */
export const STATUS_ACTIONS: Record<ElectionStatus, { to: ElectionStatus; label: string; confirm: string }[]> = {
  draft: [{ to: "open", label: "Open reporting", confirm: "Open reporting? Agents in scope will be able to submit immediately." }],
  open: [{ to: "closed", label: "Close reporting", confirm: "Close reporting? Agents will no longer be able to submit." }],
  closed: [
    { to: "open", label: "Reopen", confirm: "Reopen reporting for agents?" },
    { to: "locked", label: "Lock as final", confirm: "Lock this election? This is final and cannot be undone." },
  ],
  locked: [],
};

type FormState = {
  name: string;
  races: Race[];
  electionDate: string;
  parties: string;
  scope: "national" | "states";
  stateIds: string[];
};

function toForm(e: Election | null): FormState {
  return e
    ? {
        name: e.name,
        races: e.races,
        electionDate: e.electionDate,
        parties: e.parties.join(", "),
        scope: e.stateIds?.length ? "states" : "national",
        stateIds: e.stateIds ?? [],
      }
    : {
        name: "",
        races: ELECTION_PRESETS[0].races,
        electionDate: "",
        parties: DEFAULT_PARTIES.join(", "),
        scope: "national",
        stateIds: [],
      };
}

function ElectionDialog({
  open,
  onOpenChange,
  election,
  raceResultCounts,
  states,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  election: Election | null;
  raceResultCounts: Record<string, number>;
  states: { id: string; name: string }[];
}) {
  const hasResults = Object.values(raceResultCounts).some((n) => n > 0);
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => toForm(election));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [stateSearch, setStateSearch] = useState("");

  const parties = form.parties
    .split(/[,\s]+/)
    .map((p) => p.trim().toUpperCase())
    .filter(Boolean);

  const save = () => {
    setError(null);
    if (form.scope === "states" && form.stateIds.length === 0) {
      setError("Choose at least one state, or switch to nationwide.");
      return;
    }
    if (form.races.length === 0) {
      setError("Tick at least one race on the ballot.");
      return;
    }
    const input = {
      name: form.name,
      races: form.races,
      electionDate: form.electionDate,
      parties,
      stateIds: form.scope === "states" ? form.stateIds : null,
    };
    startTransition(async () => {
      const res = election ? await adminUpdateElection(election.id, input) : await adminCreateElection(input);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  };

  const q = stateSearch.trim().toLowerCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{election ? "Edit election" : "New election"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="el-name">Name</Label>
            <Input
              id="el-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. 2027 Presidential & National Assembly Elections"
            />
          </div>

          <div className="space-y-2">
            <Label>Races on the ballot this day</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {ELECTION_PRESETS.map((p) => {
                const active = p.races.length === form.races.length && p.races.every((r) => form.races.includes(r));
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setForm({ ...form, races: p.races })}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left text-sm",
                      active ? "border-sdp-primary bg-sdp-primary/10" : "border-neutral-300 hover:bg-neutral-50"
                    )}
                  >
                    <span className={cn("block font-semibold", active ? "text-sdp-primary" : "text-neutral-900")}>
                      {p.label}
                    </span>
                    <span className="text-xs text-neutral-500">{racesLabel(p.races)}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-lg border border-neutral-200 p-3">
              {ELECTION_TYPES.map((t) => {
                const locked = (raceResultCounts[t.id] ?? 0) > 0;
                return (
                  <label key={t.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-sdp-primary"
                      checked={form.races.includes(t.id)}
                      disabled={locked}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          races: e.target.checked
                            ? RACE_IDS.filter((r) => r === t.id || form.races.includes(r))
                            : form.races.filter((r) => r !== t.id),
                        })
                      }
                    />
                    {t.label}
                    {locked ? <span className="text-xs text-neutral-400">(has results)</span> : null}
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-neutral-500">
              Agents send a separate result (photo and figures) for each race. Check-ins and incidents are shared
              across the day.
            </p>
          </div>

          <div className="space-y-1 sm:max-w-xs">
            <Label htmlFor="el-date">Election date</Label>
            <Input
              id="el-date"
              type="date"
              value={form.electionDate}
              onChange={(e) => setForm({ ...form, electionDate: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="el-parties">Parties on the ballot (in ballot order)</Label>
            <textarea
              id="el-parties"
              value={form.parties}
              disabled={hasResults}
              onChange={(e) => setForm({ ...form, parties: e.target.value })}
              rows={3}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 font-mono text-sm disabled:bg-neutral-100"
            />
            <p className="text-xs text-neutral-500">
              {hasResults
                ? "Results have been submitted, so the party list is fixed."
                : "Separate acronyms with commas. Agents type a figure for each party in this order."}
            </p>
            <div className="flex flex-wrap gap-1">
              {parties.map((p, i) => (
                <span
                  key={`${p}-${i}`}
                  className={cn(
                    "rounded px-1.5 py-0.5 text-xs font-semibold",
                    p === "SDP" ? "bg-sdp-primary text-white" : "bg-neutral-100 text-neutral-700"
                  )}
                >
                  {p}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Where is this election held?</Label>
            <div className="flex gap-2">
              {(["national", "states"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm({ ...form, scope: s })}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium",
                    form.scope === s ? "border-sdp-primary bg-sdp-primary/10 text-sdp-primary" : "border-neutral-300"
                  )}
                >
                  {s === "national" ? "Nationwide" : "Selected states only"}
                </button>
              ))}
            </div>
            {form.scope === "states" ? (
              <div className="rounded-lg border border-neutral-200 p-3">
                <Input
                  value={stateSearch}
                  onChange={(e) => setStateSearch(e.target.value)}
                  placeholder="Search states"
                  className="mb-2 h-9"
                />
                <div className="grid max-h-56 grid-cols-2 gap-1 overflow-y-auto sm:grid-cols-3">
                  {states
                    .filter((s) => !q || s.name.toLowerCase().includes(q))
                    .map((s) => (
                      <label key={s.id} className="flex items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-neutral-50">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-sdp-primary"
                          checked={form.stateIds.includes(s.id)}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              stateIds: e.target.checked
                                ? [...form.stateIds, s.id]
                                : form.stateIds.filter((x) => x !== s.id),
                            })
                          }
                        />
                        {s.name}
                      </label>
                    ))}
                </div>
                <p className="mt-2 text-xs text-neutral-500">{form.stateIds.length} selected</p>
              </div>
            ) : null}
          </div>

          {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" className="bg-sdp-primary text-white hover:bg-sdp-primary/90" onClick={save} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {election ? "Save changes" : "Create election"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function StatusControls({ election }: { election: Election }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const actions = STATUS_ACTIONS[election.status];
  if (actions.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((a) => (
        <Button
          key={a.to}
          type="button"
          size="sm"
          variant={a.to === "open" ? "default" : "outline"}
          className={a.to === "open" ? "bg-sdp-accent text-white hover:bg-sdp-accent/90" : undefined}
          disabled={pending}
          onClick={() => {
            if (!window.confirm(a.confirm)) return;
            setError(null);
            startTransition(async () => {
              const res = await adminSetElectionStatus(election.id, a.to);
              if (!res.ok) setError(res.error);
              else router.refresh();
            });
          }}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {a.label}
        </Button>
      ))}
      {error ? <span className="text-sm text-red-600">{error}</span> : null}
    </div>
  );
}

export function ElectionsAdminClient({
  elections,
  resultCounts,
  states,
}: {
  elections: Election[];
  /** election id → race → result count */
  resultCounts: Record<string, Record<string, number>>;
  states: { id: string; name: string }[];
}) {
  const totalResults = (id: string) => Object.values(resultCounts[id] ?? {}).reduce((a, n) => a + n, 0);
  const [dialog, setDialog] = useState<{ open: boolean; election: Election | null; key: number }>({
    open: false,
    election: null,
    key: 0,
  });
  const stateName = new Map(states.map((s) => [s.id, s.name] as [string, string]));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Elections</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">
            Set up an election, then open reporting on election day. Approved agents see open elections for their
            location and send results (photo and figures), incidents and check-ins.
          </p>
        </div>
        <Button
          type="button"
          className="bg-sdp-primary text-white hover:bg-sdp-primary/90"
          onClick={() => setDialog((d) => ({ open: true, election: null, key: d.key + 1 }))}
        >
          <Plus className="h-4 w-4" /> New election
        </Button>
      </div>

      {elections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
          <Vote className="mx-auto h-10 w-10 text-neutral-300" />
          <p className="mt-2 text-sm text-neutral-600">No elections yet. Create one to start.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {elections.map((e) => (
            <div key={e.id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-neutral-900">{e.name}</h2>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", STATUS_STYLES[e.status])}>
                      {labelFor(ELECTION_STATUSES, e.status)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {e.races.map((r) => (
                      <span key={r} className="rounded-full bg-sdp-primary/10 px-2 py-0.5 text-xs font-semibold text-sdp-primary">
                        {labelFor(ELECTION_TYPES, r)}
                        {(resultCounts[e.id]?.[r] ?? 0) > 0 ? (
                          <span className="font-normal text-neutral-600">
                            {" "}
                            · {(resultCounts[e.id]?.[r] ?? 0).toLocaleString("en-NG")}
                          </span>
                        ) : null}
                      </span>
                    ))}
                  </div>
                  <p className="mt-1 text-sm text-neutral-600">
                    {format(new Date(`${e.electionDate}T12:00:00`), "d MMM yyyy")} ·{" "}
                    {e.stateIds?.length
                      ? e.stateIds.length <= 3
                        ? e.stateIds.map((s) => stateName.get(s) ?? s).join(", ")
                        : `${e.stateIds.length} states`
                      : "Nationwide"}{" "}
                    · {e.parties.length} parties · {totalResults(e.id).toLocaleString("en-NG")} results
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusControls election={e} />
                  {e.status !== "locked" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setDialog((d) => ({ open: true, election: e, key: d.key + 1 }))}
                    >
                      <Pencil className="h-4 w-4" /> Edit
                    </Button>
                  ) : null}
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/admin/elections/${e.id}`}>
                      Results dashboard <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ElectionDialog
        key={dialog.key}
        open={dialog.open}
        onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))}
        election={dialog.election}
        raceResultCounts={dialog.election ? resultCounts[dialog.election.id] ?? {} : {}}
        states={states}
      />
    </div>
  );
}
