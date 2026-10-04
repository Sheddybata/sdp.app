"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Camera, CheckCircle2, Download, ExternalLink, Loader2, MapPin, Phone, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminSetIncidentStatus, adminSignElectionPhotos } from "@/app/actions/adminElections";
import type { CheckinRecord, IncidentRecord } from "@/lib/db/elections";
import { pctOf, type NationalSummary, type StateProgress } from "@/lib/elections/dashboard";
import {
  CHECKIN_STAGES,
  INCIDENT_CATEGORIES,
  INCIDENT_SEVERITIES,
  RESULT_LEVEL_LABELS,
  labelFor,
  type ResultLevel,
} from "@/lib/elections/shared";
import { cn } from "@/lib/utils";

const fmt = (n: number) => n.toLocaleString("en-NG");

const SEVERITY_BADGE: Record<string, string> = {
  low: "bg-neutral-100 text-neutral-700",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-red-600 text-white",
};

function csvCell(v: string | number | null): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadIncidentsCsv(rows: IncidentRecord[]) {
  const header = [
    "Reported at",
    "Occurred at",
    "State",
    "Location",
    "Code",
    "Category",
    "Severity",
    "Status",
    "Description",
    "Agent",
    "Phone",
    "Latitude",
    "Longitude",
    "Photos",
  ];
  const lines = rows.map((i) => [
    i.createdAt,
    i.occurredAt,
    i.stateName,
    i.locationLabel,
    i.locationCode,
    labelFor(INCIDENT_CATEGORIES, i.category),
    i.severity,
    i.status,
    i.description,
    i.submitterName,
    i.submitterPhone,
    i.latitude,
    i.longitude,
    i.photoPaths.length,
  ]);
  const csv = [header, ...lines].map((l) => l.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `SDP-Election-Incidents-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function IncidentCard({ i, onChanged }: { i: IncidentRecord; onChanged: (status: "open" | "resolved") => void }) {
  const [urls, setUrls] = useState<Record<string, string> | null>(null);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadPhotos = async () => {
    setLoadingPhotos(true);
    setUrls(await adminSignElectionPhotos(i.photoPaths));
    setLoadingPhotos(false);
  };

  const toggle = async () => {
    const next = i.status === "open" ? "resolved" : "open";
    setSaving(true);
    const res = await adminSetIncidentStatus(i.id, next);
    setSaving(false);
    if (res.ok) onChanged(next);
  };

  return (
    <li className={cn("rounded-xl border bg-white p-4 shadow-sm", i.status === "resolved" ? "border-neutral-200 opacity-75" : "border-neutral-300")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded px-1.5 py-0.5 text-xs font-semibold", SEVERITY_BADGE[i.severity])}>
              {labelFor(INCIDENT_SEVERITIES, i.severity)}
            </span>
            <span className="font-semibold text-neutral-900">{labelFor(INCIDENT_CATEGORIES, i.category)}</span>
            {i.status === "resolved" ? (
              <span className="inline-flex items-center gap-1 text-xs text-green-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Resolved
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-sm text-neutral-600">
            {i.locationLabel} · {i.stateName} · {RESULT_LEVEL_LABELS[i.level as ResultLevel] ?? i.level} ·{" "}
            <span className="font-mono text-xs">{i.locationCode}</span>
          </p>
        </div>
        <p className="text-xs text-neutral-500">
          Happened {format(new Date(i.occurredAt), "d MMM, h:mm a")}
          <br />
          Reported {format(new Date(i.createdAt), "h:mm a")}
        </p>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-800">{i.description}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span className="text-neutral-600">{i.submitterName}</span>
        {i.submitterPhone ? (
          <a href={`tel:${i.submitterPhone}`} className="inline-flex items-center gap-1 text-sdp-primary hover:underline">
            <Phone className="h-3.5 w-3.5" /> {i.submitterPhone}
          </a>
        ) : null}
        {i.latitude != null && i.longitude != null ? (
          <a
            href={`https://www.google.com/maps?q=${i.latitude},${i.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sdp-primary hover:underline"
          >
            <MapPin className="h-3.5 w-3.5" /> Map <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
        {i.photoPaths.length > 0 && !urls ? (
          <button type="button" className="inline-flex items-center gap-1 text-sdp-primary hover:underline" onClick={loadPhotos}>
            {loadingPhotos ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            Show {i.photoPaths.length} photo{i.photoPaths.length === 1 ? "" : "s"}
          </button>
        ) : null}
        <Button type="button" size="sm" variant="outline" className="ml-auto" disabled={saving} onClick={toggle}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : i.status === "open" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
          {i.status === "open" ? "Mark resolved" : "Reopen"}
        </Button>
      </div>
      {urls ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {i.photoPaths.map((p, n) =>
            urls[p] ? (
              <a key={p} href={urls[p]} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={urls[p]} alt={`Incident photo ${n + 1}`} className="h-32 w-full object-cover" />
              </a>
            ) : null
          )}
        </div>
      ) : null}
    </li>
  );
}

export function IncidentsTab({
  incidents,
  states,
  onChanged,
}: {
  electionId: string;
  incidents: IncidentRecord[];
  states: { id: string; name: string }[];
  onChanged: () => void;
}) {
  const [statusOverrides, setStatusOverrides] = useState<Record<string, "open" | "resolved">>({});
  const [status, setStatus] = useState<"open" | "resolved" | "all">("open");
  const [severity, setSeverity] = useState("all");
  const [category, setCategory] = useState("all");
  const [stateId, setStateId] = useState("all");
  const [search, setSearch] = useState("");

  const list = useMemo(
    () => incidents.map((i) => (statusOverrides[i.id] ? { ...i, status: statusOverrides[i.id] } : i)),
    [incidents, statusOverrides]
  );
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rank: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return list
      .filter(
        (i) =>
          (status === "all" || i.status === status) &&
          (severity === "all" || i.severity === severity) &&
          (category === "all" || i.category === category) &&
          (stateId === "all" || i.stateId.toLowerCase() === stateId) &&
          (!q ||
            i.description.toLowerCase().includes(q) ||
            i.locationLabel.toLowerCase().includes(q) ||
            i.submitterName.toLowerCase().includes(q))
      )
      .sort((a, b) => (status === "open" ? rank[a.severity] - rank[b.severity] : 0) || b.createdAt.localeCompare(a.createdAt));
  }, [list, status, severity, category, stateId, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search description, location or agent" className="h-9 pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="h-9 rounded-md border border-neutral-300 bg-white px-2 text-sm">
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="all">All</option>
          </select>
          <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="h-9 rounded-md border border-neutral-300 bg-white px-2 text-sm">
            <option value="all">Any severity</option>
            {INCIDENT_SEVERITIES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 rounded-md border border-neutral-300 bg-white px-2 text-sm">
            <option value="all">All categories</option>
            {INCIDENT_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <select value={stateId} onChange={(e) => setStateId(e.target.value)} className="h-9 rounded-md border border-neutral-300 bg-white px-2 text-sm">
            <option value="all">All states</option>
            {states.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <Button type="button" variant="outline" size="sm" onClick={() => downloadIncidentsCsv(filtered)}>
            <Download className="h-4 w-4" /> CSV
          </Button>
        </div>
      </div>
      <p className="text-sm text-neutral-600">
        {fmt(filtered.length)} incident{filtered.length === 1 ? "" : "s"}
        {incidents.length >= 1000 ? " (latest 1,000 shown)" : ""}
      </p>
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-500">
          No incidents match.
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((i) => (
            <IncidentCard
              key={i.id}
              i={i}
              onChanged={(s) => {
                setStatusOverrides((o) => ({ ...o, [i.id]: s }));
                onChanged();
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export function CheckinsTab({
  states,
  national,
  recent,
}: {
  states: StateProgress[];
  national: NationalSummary;
  recent: CheckinRecord[];
}) {
  const totalPus = national.pollingUnits.required;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CHECKIN_STAGES.map((s) => {
          const n = national.checkins[s.id] ?? 0;
          return (
            <div key={s.id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-neutral-600">{s.label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-neutral-900">{fmt(n)}</p>
              <p className="text-xs text-neutral-500">posts checked in</p>
            </div>
          );
        })}
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white shadow-sm">
        <h2 className="border-b border-neutral-200 p-4 font-semibold text-neutral-900">By state</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-2.5">State</th>
                {CHECKIN_STAGES.map((s) => (
                  <th key={s.id} className="px-4 py-2.5 text-right">
                    {s.label}
                  </th>
                ))}
                <th className="px-4 py-2.5 text-right">PU results in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {states.map((st) => (
                <tr key={st.stateId}>
                  <td className="px-4 py-2.5 font-medium text-neutral-900">{st.stateName}</td>
                  {CHECKIN_STAGES.map((s) => (
                    <td key={s.id} className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                      {fmt(st.checkins[s.id] ?? 0)}
                    </td>
                  ))}
                  <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">{pctOf(st.pollingUnits)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-neutral-200 px-4 py-2 text-xs text-neutral-500">
          Counts are posts (polling units, wards, LGAs, states) where an agent tapped each stage. There are{" "}
          {fmt(totalPus)} polling units in scope.
        </p>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white shadow-sm">
        <h2 className="border-b border-neutral-200 p-4 font-semibold text-neutral-900">Latest check-ins</h2>
        {recent.length === 0 ? (
          <p className="p-6 text-center text-sm text-neutral-500">No check-ins yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {recent.map((c, n) => (
              <li key={`${c.locationCode}-${c.stage}-${n}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <span>
                  <strong className="text-neutral-900">{labelFor(CHECKIN_STAGES, c.stage)}</strong>{" "}
                  <span className="text-neutral-600">
                    · {c.locationLabel}, {c.stateName} · {c.submitterName}
                  </span>
                </span>
                <span className="flex items-center gap-2 text-xs text-neutral-500">
                  {c.latitude != null && c.longitude != null ? (
                    <a
                      href={`https://www.google.com/maps?q=${c.latitude},${c.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-0.5 text-sdp-primary hover:underline"
                    >
                      <MapPin className="h-3 w-3" /> Map
                    </a>
                  ) : null}
                  {format(new Date(c.createdAt), "h:mm a")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
