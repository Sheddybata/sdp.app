"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle2, ExternalLink, History, Loader2, MapPin, Phone, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { adminGetResultDetail, adminVerifyResult } from "@/app/actions/adminElections";
import type { ResultRecord, ResultVersion } from "@/lib/db/elections";
import { RESULT_FORM_NAMES, RESULT_LEVEL_LABELS, raceLabel } from "@/lib/elections/shared";
import { rankParties as rankPartiesForDisplay } from "@/lib/elections/dashboard";

const fmt = (n: number | null) => (n == null ? "—" : n.toLocaleString("en-NG"));

export function resultLocationLabel(r: Pick<ResultRecord, "level" | "pollingUnitName" | "wardName" | "lgaName" | "stateName">) {
  switch (r.level) {
    case "polling_unit":
      return r.pollingUnitName ?? "Polling unit";
    case "ward":
      return `${r.wardName} ward`;
    case "lga":
      return `${r.lgaName} LGA`;
    case "state":
      return `${r.stateName} State`;
  }
}

export function ResultDetailSheet({
  resultId,
  parties,
  onClose,
  onChanged,
}: {
  resultId: string | null;
  parties: string[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [data, setData] = useState<{
    result: ResultRecord;
    photoUrls: Record<string, string>;
    versions: ResultVersion[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!resultId) return;
    let cancelled = false;
    setLoading(true);
    setData(null);
    setError(null);
    setShowHistory(false);
    adminGetResultDetail(resultId)
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) setError(res.error);
        else {
          setData({ result: res.result, photoUrls: res.photoUrls, versions: res.versions });
          setNote(res.result.verifiedNote ?? "");
        }
      })
      .catch(() => !cancelled && setError("Could not load the result."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [resultId]);

  const setVerified = async (verified: boolean) => {
    if (!data) return;
    setSaving(true);
    const res = await adminVerifyResult(data.result.id, verified, note);
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setData({
      ...data,
      result: { ...data.result, verifiedAt: verified ? new Date().toISOString() : null, verifiedNote: verified ? note : null },
    });
    onChanged();
  };

  const r = data?.result;

  return (
    <Sheet open={Boolean(resultId)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{r ? resultLocationLabel(r) : "Result"}</SheetTitle>
        </SheetHeader>
        {loading ? (
          <div className="flex items-center gap-2 py-10 text-neutral-600">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : error && !r ? (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : r ? (
          <div className="mt-4 space-y-5 text-sm">
            <div className="space-y-1">
              <span className="inline-block rounded-full bg-sdp-primary px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                {raceLabel(r.race)}
              </span>
              <p className="text-xs font-semibold uppercase tracking-wide text-sdp-primary">
                {RESULT_LEVEL_LABELS[r.level]} · {RESULT_FORM_NAMES[r.level]}
                {r.isBackup ? " · backup by ward agent" : ""}
              </p>
              <p className="text-neutral-700">
                {[r.level === "polling_unit" ? `${r.wardName} ward` : null, r.level !== "lga" && r.level !== "state" ? r.lgaName : null, r.stateName]
                  .filter(Boolean)
                  .join(", ")}{" "}
                · <span className="font-mono">{r.locationCode}</span>
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-neutral-600">
                <span>
                  Sent by <strong className="text-neutral-800">{r.submitterName}</strong>
                </span>
                {r.submitterPhone ? (
                  <a href={`tel:${r.submitterPhone}`} className="inline-flex items-center gap-1 text-sdp-primary hover:underline">
                    <Phone className="h-3.5 w-3.5" /> {r.submitterPhone}
                  </a>
                ) : null}
                <span>{format(new Date(r.updatedAt), "d MMM, h:mm a")}</span>
                {r.version > 1 ? <span>Version {r.version}</span> : null}
              </div>
              {r.latitude != null && r.longitude != null ? (
                <a
                  href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sdp-primary hover:underline"
                >
                  <MapPin className="h-3.5 w-3.5" /> Where it was sent from
                  {r.locationAccuracyM != null ? ` (±${Math.round(r.locationAccuracyM)} m)` : ""}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <p className="text-xs text-neutral-500">No location shared.</p>
              )}
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-neutral-900">Result sheet</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {r.photoPaths.map((p, i) =>
                  data?.photoUrls[p] ? (
                    <a
                      key={p}
                      href={data.photoUrls[p]}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative block overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={data.photoUrls[p]} alt={`Result sheet photo ${i + 1}`} className="h-72 w-full object-contain" />
                      <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white">
                        Open full size <ExternalLink className="h-3 w-3" />
                      </span>
                    </a>
                  ) : (
                    <div key={p} className="flex h-40 items-center justify-center rounded-lg border border-dashed text-xs text-neutral-500">
                      Photo unavailable
                    </div>
                  )
                )}
              </div>
            </div>

            {r.discrepancies.length > 0 ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">
                <p className="flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="h-4 w-4" /> Figures don&apos;t add up
                </p>
                <ul className="ml-5 mt-1 list-disc">
                  {r.discrepancies.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="flex items-center gap-1.5 text-green-700">
                <CheckCircle2 className="h-4 w-4" /> Typed figures add up.
              </p>
            )}
            {r.note ? (
              <div className="rounded-lg bg-neutral-50 px-3 py-2">
                <p className="text-xs font-semibold uppercase text-neutral-500">Agent&apos;s note</p>
                <p className="whitespace-pre-wrap text-neutral-800">{r.note}</p>
              </div>
            ) : null}

            <div>
              <h3 className="mb-2 font-semibold text-neutral-900">Typed figures</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border border-neutral-200 p-3 sm:grid-cols-3">
                {(
                  [
                    ["Registered voters", r.registeredVoters],
                    ["Accredited voters", r.accreditedVoters],
                    ["Total valid votes", r.totalValidVotes],
                    ["Rejected votes", r.rejectedVotes],
                    ["Total votes cast", r.totalVotesCast],
                  ] as [string, number | null][]
                ).map(([label, v]) => (
                  <div key={label}>
                    <p className="text-xs text-neutral-500">{label}</p>
                    <p className="font-semibold tabular-nums text-neutral-900">{fmt(v)}</p>
                  </div>
                ))}
              </div>
              <table className="mt-3 w-full text-left">
                <thead>
                  <tr className="border-b text-xs uppercase text-neutral-500">
                    <th className="py-1.5">Party</th>
                    <th className="py-1.5 text-right">Votes</th>
                    <th className="py-1.5 text-right">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {rankPartiesForDisplay(r.partyVotes, parties).map(({ party, votes }) => (
                    <tr key={party} className={party === "SDP" ? "bg-sdp-primary/10 font-semibold" : undefined}>
                      <td className="py-1 pl-1">{party}</td>
                      <td className="py-1 text-right tabular-nums">{fmt(votes)}</td>
                      <td className="py-1 pr-1 text-right tabular-nums text-neutral-500">
                        {r.totalValidVotes ? `${((votes / r.totalValidVotes) * 100).toFixed(1)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-2 rounded-lg border border-neutral-200 p-3">
              <h3 className="flex items-center gap-1.5 font-semibold text-neutral-900">
                <ShieldCheck className="h-4 w-4 text-sdp-accent" /> HQ verification
              </h3>
              {r.verifiedAt ? (
                <p className="text-green-700">
                  Verified {format(new Date(r.verifiedAt), "d MMM, h:mm a")}
                  {r.verifiedNote ? ` — ${r.verifiedNote}` : ""}
                </p>
              ) : (
                <p className="text-neutral-600">Compare the photo with the typed figures, then mark as verified.</p>
              )}
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Verification note (optional)" />
              <div className="flex gap-2">
                {r.verifiedAt ? (
                  <Button type="button" variant="outline" disabled={saving} onClick={() => setVerified(false)}>
                    Remove verification
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="bg-sdp-accent text-white hover:bg-sdp-accent/90"
                    disabled={saving}
                    onClick={() => setVerified(true)}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Photo matches — mark verified
                  </Button>
                )}
              </div>
              {error ? <p className="text-red-600">{error}</p> : null}
            </div>

            {data && data.versions.length > 1 ? (
              <div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 font-medium text-neutral-700 hover:text-neutral-900"
                  onClick={() => setShowHistory((s) => !s)}
                >
                  <History className="h-4 w-4" /> {showHistory ? "Hide" : "Show"} {data.versions.length} versions
                </button>
                {showHistory ? (
                  <ul className="mt-2 space-y-2">
                    {data.versions.map((v) => (
                      <li key={v.version} className="rounded-lg border border-neutral-200 p-2.5">
                        <p className="font-medium text-neutral-800">
                          Version {v.version} · {v.submitterName} · {format(new Date(v.createdAt), "d MMM, h:mm a")}
                        </p>
                        <p className="text-xs text-neutral-600">
                          Valid {fmt(v.figures.totalValidVotes)} · Rejected {fmt(v.figures.rejectedVotes)} · Cast{" "}
                          {fmt(v.figures.totalVotesCast)} · {v.photoCount} photo{v.photoCount === 1 ? "" : "s"}
                        </p>
                        <p className="mt-1 text-xs text-neutral-700">
                          {rankPartiesForDisplay(v.figures.partyVotes, parties)
                            .filter((p) => p.votes > 0)
                            .map((p) => `${p.party} ${fmt(p.votes)}`)
                            .join(" · ") || "No party votes"}
                        </p>
                        {v.note ? <p className="mt-1 text-xs italic text-neutral-600">{v.note}</p> : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
