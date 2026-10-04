"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleDashed,
  CloudOff,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  Vote,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  loadAgentElectionHome,
  type AgentElectionHome,
  type AgentElectionView,
  type AgentResultStatus,
} from "@/app/actions/election";
import {
  discardItem,
  enqueue,
  listQueue,
  onItemSent,
  processQueue,
  retryItem,
  subscribeQueue,
  type QueueItem,
} from "@/lib/elections/offline-queue";
import {
  CHECKIN_STAGES,
  ELECTION_STATUSES,
  INCIDENT_CATEGORIES,
  RESULT_FORM_NAMES,
  RESULT_LEVEL_LABELS,
  labelFor,
  raceLabel,
  racesLabel,
  type CheckinStage,
  type Race,
} from "@/lib/elections/shared";
import { cn } from "@/lib/utils";
import { ResultForm } from "./ResultForm";
import { IncidentForm } from "./IncidentForm";
import { quickLocation } from "./useGeolocation";

type View = { type: "hub" } | { type: "result"; race: Race; status: AgentResultStatus } | { type: "incident" };

function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

function useQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  useEffect(() => {
    let alive = true;
    const refresh = () => listQueue().then((q) => alive && setItems(q));
    refresh();
    const unsub = subscribeQueue(refresh);
    void processQueue();
    const onOnline = () => void processQueue();
    window.addEventListener("online", onOnline);
    const timer = window.setInterval(() => void processQueue(), 30_000);
    return () => {
      alive = false;
      unsub();
      window.removeEventListener("online", onOnline);
      window.clearInterval(timer);
    };
  }, []);
  return items;
}

function ResultStatusLine({ s, queued }: { s: AgentResultStatus; queued: boolean }) {
  if (queued) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-amber-700">
        <CloudOff className="h-4 w-4" /> Saved on phone — sending
      </span>
    );
  }
  if (!s.result) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-neutral-500">
        <CircleDashed className="h-4 w-4" /> Not submitted yet
      </span>
    );
  }
  const r = s.result;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <span className="inline-flex items-center gap-1 font-medium text-green-700">
        <CheckCircle2 className="h-4 w-4" />
        {r.verified ? "Verified by HQ" : "Submitted"}
      </span>
      <span className="text-neutral-500">
        {r.mine ? "by you" : `by ${r.submitterName}`}
        {r.isBackup ? " (backup)" : ""} · {format(new Date(r.updatedAt), "h:mm a")}
        {r.version > 1 ? ` · corrected ${r.version - 1}×` : ""}
      </span>
      {r.discrepancyCount > 0 ? (
        <span className="inline-flex items-center gap-1 text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5" /> figures flagged
        </span>
      ) : null}
    </span>
  );
}

function QueuePanel({ items, online }: { items: QueueItem[]; online: boolean }) {
  if (items.length === 0) return null;
  const failed = items.filter((i) => i.status === "failed");
  return (
    <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-semibold text-amber-900">
          {online ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudOff className="h-4 w-4" />}
          {items.length} {items.length === 1 ? "report" : "reports"} saved on this phone
        </p>
        <Button type="button" size="sm" variant="outline" className="min-h-[36px] bg-white" onClick={() => void processQueue()}>
          <RefreshCw className="h-4 w-4" /> Send now
        </Button>
      </div>
      <p className="mt-1 text-sm text-amber-800">
        {online
          ? "Sending… keep this page open until the list is empty."
          : "No network. They will send automatically when you are back online — do not clear your browser data."}
      </p>
      <ul className="mt-3 space-y-2">
        {items.map((i) => (
          <li key={i.id} className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-neutral-900">{i.label}</p>
                <p className={cn("text-xs", i.status === "failed" ? "text-red-600" : "text-neutral-500")}>
                  {i.status === "failed"
                    ? `Not accepted: ${i.error}`
                    : i.error
                      ? `${i.error} (tried ${i.attempts}×)`
                      : "Waiting to send"}
                </p>
              </div>
              {i.status === "failed" ? (
                <div className="flex shrink-0 gap-1">
                  <Button type="button" size="sm" variant="outline" onClick={() => void retryItem(i.id)}>
                    Retry
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-red-600"
                    onClick={() => {
                      if (window.confirm("Discard this report? It has not been sent.")) void discardItem(i.id);
                    }}
                    aria-label="Discard"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {failed.length > 0 ? (
        <p className="mt-2 text-xs text-amber-900">
          Reports that were not accepted need your attention: fix the problem (e.g. sign in again) and tap Retry, or
          discard and submit again.
        </p>
      ) : null}
    </section>
  );
}

function CheckinGrid({
  view,
  queue,
  disabled,
}: {
  view: AgentElectionView;
  queue: QueueItem[];
  disabled: boolean;
}) {
  const [busy, setBusy] = useState<CheckinStage | null>(null);
  const done = new Map<string, string>(view.checkins.map((c) => [c.stage, c.at] as [string, string]));
  const queued = new Set<string>(
    queue.flatMap((q) => (q.kind === "checkin" && q.electionId === view.election.id ? [q.payload.stage] : []))
  );

  const tap = async (stage: CheckinStage) => {
    setBusy(stage);
    const fix = await quickLocation();
    await enqueue({
      kind: "checkin",
      electionId: view.election.id,
      label: `Check-in — ${labelFor(CHECKIN_STAGES, stage)}`,
      photos: [],
      keptPhotoPaths: [],
      payload: {
        electionId: view.election.id,
        stage,
        latitude: fix?.latitude ?? null,
        longitude: fix?.longitude ?? null,
      },
    });
    setBusy(null);
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {CHECKIN_STAGES.map((s) => {
        const at = done.get(s.id);
        const isQueued = queued.has(s.id);
        return (
          <button
            key={s.id}
            type="button"
            disabled={disabled || Boolean(at) || isQueued || busy !== null}
            onClick={() => void tap(s.id)}
            className={cn(
              "flex min-h-[64px] flex-col items-start justify-center rounded-lg border px-3 py-2 text-left text-sm transition-colors",
              at
                ? "border-green-300 bg-green-50 text-green-900"
                : isQueued
                  ? "border-amber-300 bg-amber-50 text-amber-900"
                  : "border-neutral-300 bg-white text-neutral-900 hover:border-sdp-primary hover:bg-sdp-primary/5 disabled:opacity-60"
            )}
          >
            <span className="flex items-center gap-1.5 font-medium">
              {at ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : busy === s.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {s.label}
            </span>
            <span className="text-xs opacity-75">
              {at ? format(new Date(at), "h:mm a") : isQueued ? "Saved — sending" : "Tap when it happens"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** `race:level:code` of results still waiting on this phone for an election. */
function queuedResultKeys(queue: QueueItem[], election: AgentElectionView["election"]): Set<string> {
  return new Set<string>(
    queue.flatMap((q) =>
      q.kind === "result" && q.electionId === election.id
        ? [`${q.payload.race ?? election.races[0]}:${q.payload.level}:${q.payload.locationCode}`]
        : []
    )
  );
}

function BackupList({
  race,
  backups,
  queuedKeys,
  onOpen,
}: {
  race: Race;
  backups: AgentResultStatus[];
  queuedKeys: Set<string>;
  onOpen: (s: AgentResultStatus) => void;
}) {
  const [search, setSearch] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const isQueued = (b: AgentResultStatus) => queuedKeys.has(`${race}:${b.target.level}:${b.target.locationCode}`);
  const reported = backups.filter((b) => b.result).length;
  const q = search.trim().toLowerCase();
  const rows = backups.filter(
    (b) =>
      (!onlyMissing || !b.result) &&
      (!q || b.target.label.toLowerCase().includes(q) || b.target.locationCode.includes(q))
  );

  return (
    <section className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div>
        <h3 className="font-semibold text-neutral-900">Polling units in your ward — {raceLabel(race)}</h3>
        <p className="text-sm text-neutral-600">
          {reported} of {backups.length} have a {raceLabel(race)} result. If a polling unit agent cannot submit, you can
          send their result as a backup.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search polling unit or code"
            className="h-10 pl-9"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={onlyMissing}
            onChange={(e) => setOnlyMissing(e.target.checked)}
            className="h-4 w-4 accent-sdp-primary"
          />
          Only missing
        </label>
      </div>
      <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
        {rows.length === 0 ? (
          <li className="px-3 py-4 text-center text-sm text-neutral-500">No polling units match.</li>
        ) : (
          rows.map((b) => (
            <li key={b.target.locationCode} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-neutral-900">{b.target.label}</p>
                <p className="font-mono text-xs text-neutral-500">{b.target.locationCode}</p>
                <ResultStatusLine s={b} queued={isQueued(b)} />
              </div>
              {b.canSubmit && !isQueued(b) ? (
                <Button type="button" size="sm" variant="outline" className="min-h-[38px]" onClick={() => onOpen(b)}>
                  {b.result ? "Correct" : "Submit backup"}
                </Button>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

export function AgentElectionClient() {
  const [home, setHome] = useState<AgentElectionHome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<View>({ type: "hub" });
  const [flash, setFlash] = useState<string | null>(null);
  const online = useOnline();
  const queue = useQueue();

  const load = useCallback(async () => {
    try {
      const res = await loadAgentElectionHome();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setError(null);
      setHome(res.home);
      setSelectedId((cur) =>
        cur && res.home.elections.some((e) => e.election.id === cur)
          ? cur
          : (res.home.elections.find((e) => e.election.status === "open") ?? res.home.elections[0])?.election.id ??
            null
      );
    } catch {
      setError("Could not load election information. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return onItemSent(() => void load());
  }, [load]);

  const current = useMemo(
    () => home?.elections.find((e) => e.election.id === selectedId) ?? null,
    [home, selectedId]
  );
  const electionQueue = queue.filter((q) => q.electionId === current?.election.id);
  const queuedKeys = current ? queuedResultKeys(queue, current.election) : new Set<string>();
  const [backupRace, setBackupRace] = useState<Race | null>(null);
  const activeBackupRace = current?.races.find((r) => r.race === backupRace) ?? current?.races[0] ?? null;

  const finishForm = (message: string) => {
    setView({ type: "hub" });
    setFlash(message);
    window.scrollTo({ top: 0 });
  };

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/agent" className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900">
            <ArrowLeft className="h-4 w-4" /> Agent portal
          </Link>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
              online ? "bg-green-50 text-green-700" : "bg-neutral-200 text-neutral-700"
            )}
          >
            {online ? <Wifi className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />}
            {online ? "Online" : "Offline"}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-5 px-4 py-5">
        {view.type === "result" && current ? (
          <ResultForm
            election={current.election}
            race={view.race}
            status={view.status}
            onCancel={() => setView({ type: "hub" })}
            onQueued={finishForm}
          />
        ) : view.type === "incident" && current && home ? (
          <IncidentForm
            election={current.election}
            postLabel={home.agent.postLabel}
            onCancel={() => setView({ type: "hub" })}
            onQueued={finishForm}
          />
        ) : (
          <>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sdp-primary/10">
                <Vote className="h-6 w-6 text-sdp-primary" />
              </span>
              <div>
                <h1 className="text-xl font-bold text-neutral-900">Election day</h1>
                <p className="text-sm text-neutral-600">Results, incidents and check-ins from your post</p>
              </div>
            </div>

            {flash ? (
              <div className="flex items-start justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                <span className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  {flash}
                </span>
                <button type="button" className="text-green-700 underline" onClick={() => setFlash(null)}>
                  Dismiss
                </button>
              </div>
            ) : null}

            <QueuePanel items={queue} online={online} />

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-neutral-600">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading…
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-200 bg-white p-5 text-sm text-red-700">
                <p className="flex items-start gap-2">
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
                  {error}
                </p>
                <Button type="button" variant="outline" className="mt-3" onClick={() => void load()}>
                  <RefreshCw className="h-4 w-4" /> Try again
                </Button>
              </div>
            ) : home ? (
              <>
                <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-sdp-primary">{home.agent.levelLabel}</p>
                  <p className="mt-0.5 text-lg font-semibold text-neutral-900">{home.agent.name}</p>
                  <p className="text-sm text-neutral-700">
                    {home.agent.postLabel}
                    {home.agent.level !== "state" ? `, ${home.agent.stateName}` : ""}
                  </p>
                  <p className="font-mono text-xs text-neutral-500">Code {home.agent.code}</p>
                </section>

                {home.elections.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-600">
                    No election is open for your location yet. When the party opens reporting, it will appear here.
                  </div>
                ) : (
                  <>
                    {home.elections.length > 1 ? (
                      <div className="flex flex-wrap gap-2">
                        {home.elections.map((e) => (
                          <button
                            key={e.election.id}
                            type="button"
                            onClick={() => setSelectedId(e.election.id)}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-sm font-medium",
                              e.election.id === selectedId
                                ? "border-sdp-primary bg-sdp-primary text-white"
                                : "border-neutral-300 bg-white text-neutral-700"
                            )}
                          >
                            {e.election.name}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {current ? (
                      <>
                        <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <h2 className="text-lg font-semibold text-neutral-900">{current.election.name}</h2>
                              <p className="text-sm text-neutral-600">
                                {racesLabel(current.election.races)} ·{" "}
                                {format(new Date(`${current.election.electionDate}T12:00:00`), "EEEE d MMMM yyyy")}
                              </p>
                            </div>
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-1 text-xs font-semibold",
                                current.election.status === "open" ? "bg-green-100 text-green-800" : "bg-neutral-200 text-neutral-700"
                              )}
                            >
                              {current.election.status === "open" ? "Reporting open" : labelFor(ELECTION_STATUSES, current.election.status)}
                            </span>
                          </div>
                          {current.election.status !== "open" ? (
                            <p className="mt-2 text-sm text-neutral-600">Reporting has ended. You can still see what you sent.</p>
                          ) : null}
                        </section>

                        <section className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                          <h3 className="font-semibold text-neutral-900">Check in</h3>
                          <CheckinGrid
                            view={current}
                            queue={electionQueue}
                            disabled={current.election.status !== "open"}
                          />
                        </section>

                        <section className="space-y-3 rounded-xl border-2 border-sdp-primary/30 bg-white p-4 shadow-sm">
                          <div className="flex items-start gap-3">
                            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-sdp-primary" />
                            <div>
                              <h3 className="font-semibold text-neutral-900">Results</h3>
                              <p className="text-sm text-neutral-600">
                                {current.races.length > 1
                                  ? `Send a separate result for each race — ${current.races.length} races on the ballot today.`
                                  : `${raceLabel(current.races[0]?.race ?? "")} result.`}
                              </p>
                            </div>
                          </div>
                          <ul className="space-y-2">
                            {current.races.map((rv) => {
                              const own = rv.own;
                              const queued =
                                own != null && queuedKeys.has(`${rv.race}:${own.target.level}:${own.target.locationCode}`);
                              return (
                                <li
                                  key={rv.race}
                                  className={cn(
                                    "rounded-lg border p-3",
                                    own?.result ? "border-green-200 bg-green-50/40" : "border-neutral-200"
                                  )}
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="font-semibold text-neutral-900">{raceLabel(rv.race)}</p>
                                      {own ? (
                                        <>
                                          <p className="text-xs text-neutral-500">
                                            {RESULT_LEVEL_LABELS[own.target.level]} · {RESULT_FORM_NAMES[own.target.level]} ·{" "}
                                            {own.target.label}
                                          </p>
                                          <ResultStatusLine s={own} queued={queued} />
                                        </>
                                      ) : (
                                        <p className="text-sm text-neutral-500">
                                          No {RESULT_LEVEL_LABELS[home.agent.level].toLowerCase()} result for this race — it
                                          is declared at constituency level.
                                        </p>
                                      )}
                                    </div>
                                    {own?.canSubmit && !queued ? (
                                      <Button
                                        type="button"
                                        className={cn(
                                          "min-h-[44px]",
                                          own.result
                                            ? "border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50"
                                            : "bg-sdp-primary text-white hover:bg-sdp-primary/90"
                                        )}
                                        onClick={() => setView({ type: "result", race: rv.race, status: own })}
                                      >
                                        {own.result ? "Correct" : "Submit result"}
                                      </Button>
                                    ) : null}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </section>

                        {current.races.some((rv) => rv.backups.length > 0) ? (
                          <section className="space-y-3">
                            {current.races.length > 1 ? (
                              <div className="flex flex-wrap gap-2">
                                {current.races.map((rv) => (
                                  <button
                                    key={rv.race}
                                    type="button"
                                    onClick={() => setBackupRace(rv.race)}
                                    className={cn(
                                      "rounded-full border px-3 py-1.5 text-sm font-medium",
                                      activeBackupRace?.race === rv.race
                                        ? "border-sdp-primary bg-sdp-primary text-white"
                                        : "border-neutral-300 bg-white text-neutral-700"
                                    )}
                                  >
                                    {raceLabel(rv.race)} ({rv.backups.filter((b) => b.result).length}/{rv.backups.length})
                                  </button>
                                ))}
                              </div>
                            ) : null}
                            {activeBackupRace ? (
                              <BackupList
                                key={activeBackupRace.race}
                                race={activeBackupRace.race}
                                backups={activeBackupRace.backups}
                                queuedKeys={queuedKeys}
                                onOpen={(s) => setView({ type: "result", race: activeBackupRace.race, status: s })}
                              />
                            ) : null}
                          </section>
                        ) : null}

                        <section className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-semibold text-neutral-900">Incidents</h3>
                              <p className="text-sm text-neutral-600">
                                Report violence, vote buying, missing materials or anything irregular.
                              </p>
                            </div>
                          </div>
                          {current.election.status === "open" ? (
                            <Button
                              type="button"
                              variant="outline"
                              className="min-h-[44px] w-full border-red-300 text-red-700 hover:bg-red-50"
                              onClick={() => setView({ type: "incident" })}
                            >
                              <AlertTriangle className="h-4 w-4" /> Report an incident
                            </Button>
                          ) : null}
                          {current.incidents.length > 0 ? (
                            <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 text-sm">
                              {current.incidents.map((i) => (
                                <li key={i.id} className="flex items-center justify-between gap-2 px-3 py-2">
                                  <span className="font-medium text-neutral-800">
                                    {labelFor(INCIDENT_CATEGORIES, i.category)}
                                  </span>
                                  <span className="text-xs text-neutral-500">
                                    {format(new Date(i.occurredAt), "h:mm a")} · {i.status === "resolved" ? "Resolved" : "Received"}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </section>
                      </>
                    ) : null}
                  </>
                )}
              </>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
