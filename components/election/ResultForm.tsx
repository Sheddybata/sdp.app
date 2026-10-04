"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getResultForEdit, type AgentResultStatus } from "@/app/actions/election";
import { enqueue, newClientId } from "@/lib/elections/offline-queue";
import {
  RESULT_FORM_NAMES,
  RESULT_LEVEL_LABELS,
  RESULT_MAX_PHOTOS,
  checkResultFigures,
  raceLabel,
  sumPartyVotes,
  type Election,
  type Race,
  type ResultFigures,
} from "@/lib/elections/shared";
import { cn } from "@/lib/utils";
import { PhotoListField, type PhotoItem } from "./PhotoListField";
import { GeoStatus } from "./GeoStatus";
import { useGeolocation } from "./useGeolocation";

type Totals = {
  registeredVoters: string;
  accreditedVoters: string;
  rejectedVotes: string;
  totalValidVotes: string;
  totalVotesCast: string;
};

const EMPTY_TOTALS: Totals = {
  registeredVoters: "",
  accreditedVoters: "",
  rejectedVotes: "",
  totalValidVotes: "",
  totalVotesCast: "",
};

const toInt = (s: string) => (s.trim() === "" ? null : Number.parseInt(s, 10));
const digitsOnly = (s: string) => s.replace(/\D/g, "").slice(0, 8);

function NumberField({
  id,
  label,
  value,
  onChange,
  error,
  optional,
  emphasis,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
  optional?: boolean;
  emphasis?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className={cn("text-sm", emphasis && "font-semibold text-sdp-primary")}>
        {label}
        {optional ? <span className="ml-1 font-normal text-neutral-400">(optional)</span> : null}
      </Label>
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(digitsOnly(e.target.value))}
        className={cn("h-11 text-base tabular-nums", error && "border-red-400 bg-red-50/50")}
        placeholder="0"
      />
    </div>
  );
}

export function ResultForm({
  election,
  race,
  status,
  onCancel,
  onQueued,
}: {
  election: Election;
  race: Race;
  status: AgentResultStatus;
  onCancel: () => void;
  onQueued: (message: string) => void;
}) {
  const { target } = status;
  const { geo, locate, fix } = useGeolocation();
  const [loadingExisting, setLoadingExisting] = useState(Boolean(status.result));
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [totals, setTotals] = useState<Totals>(EMPTY_TOTALS);
  const [partyVotes, setPartyVotes] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!status.result) return;
    let cancelled = false;
    getResultForEdit({ electionId: election.id, race, level: target.level, locationCode: target.locationCode })
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) {
          setFormError(res.error);
          return;
        }
        if (!("photos" in res) || !res.figures) return;
        const f = res.figures;
        setTotals({
          registeredVoters: f.registeredVoters == null ? "" : String(f.registeredVoters),
          accreditedVoters: String(f.accreditedVoters),
          rejectedVotes: String(f.rejectedVotes),
          totalValidVotes: String(f.totalValidVotes),
          totalVotesCast: String(f.totalVotesCast),
        });
        const pv: Record<string, string> = {};
        for (const p of election.parties) pv[p] = String(f.partyVotes[p] ?? 0);
        setPartyVotes(pv);
        setNote(res.note ?? "");
        setPhotos(res.photos.map((p) => ({ key: p.path, src: p.url, path: p.path })));
      })
      .catch(() => {
        if (!cancelled) setFormError("Could not load your earlier submission. Check your connection.");
      })
      .finally(() => {
        if (!cancelled) setLoadingExisting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [election.id, election.parties, race, status.result, target.level, target.locationCode]);

  const figures: ResultFigures | null = useMemo(() => {
    const accredited = toInt(totals.accreditedVoters);
    const rejected = toInt(totals.rejectedVotes);
    const valid = toInt(totals.totalValidVotes);
    const cast = toInt(totals.totalVotesCast);
    if (accredited == null || rejected == null || valid == null || cast == null) return null;
    const pv: Record<string, number> = {};
    for (const p of election.parties) pv[p] = toInt(partyVotes[p] ?? "") ?? 0;
    return {
      registeredVoters: toInt(totals.registeredVoters),
      accreditedVoters: accredited,
      rejectedVotes: rejected,
      totalValidVotes: valid,
      totalVotesCast: cast,
      partyVotes: pv,
    };
  }, [totals, partyVotes, election.parties]);

  const partySum = useMemo(() => {
    const pv: Record<string, number> = {};
    for (const p of election.parties) pv[p] = toInt(partyVotes[p] ?? "") ?? 0;
    return sumPartyVotes(pv);
  }, [partyVotes, election.parties]);

  const issues = figures ? checkResultFigures(figures) : [];
  const missingTotals = (k: keyof Totals) => showErrors && k !== "registeredVoters" && totals[k].trim() === "";

  const submit = async () => {
    setShowErrors(true);
    setFormError(null);
    if (photos.length === 0) return setFormError("Add at least one clear photo of the result sheet.");
    if (!figures) return setFormError("Fill in accredited voters, rejected votes, total valid votes and total votes cast.");
    if (issues.length > 0 && !note.trim()) {
      return setFormError("The figures don't add up. Check them against the sheet, or explain the difference in the note.");
    }
    if (!confirmed) return setFormError("Tick the box to confirm the figures match the result sheet.");

    setSaving(true);
    try {
      await enqueue({
        kind: "result",
        electionId: election.id,
        label: `${raceLabel(race)} ${RESULT_FORM_NAMES[target.level]} — ${target.label}`,
        photos: photos.filter((p) => p.dataUrl).map((p) => ({ dataUrl: p.dataUrl })),
        keptPhotoPaths: photos.filter((p) => p.path && !p.dataUrl).map((p) => p.path!),
        payload: {
          electionId: election.id,
          race,
          level: target.level,
          locationCode: target.locationCode,
          ...figures,
          note: note.trim() || null,
          latitude: fix?.latitude ?? null,
          longitude: fix?.longitude ?? null,
          locationAccuracyM: fix?.accuracy ?? null,
          clientSubmissionId: newClientId(),
        },
      });
      onQueued("Result saved on your phone. It is being sent now and will retry automatically if the network drops.");
    } catch {
      setFormError("Could not save on this phone. Free up storage and try again.");
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="rounded-xl border border-sdp-primary/25 bg-white p-4 shadow-sm">
        <span className="inline-block rounded-full bg-sdp-primary px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
          {raceLabel(race)}
        </span>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-sdp-primary">
          {RESULT_LEVEL_LABELS[target.level]} result · {RESULT_FORM_NAMES[target.level]}
          {target.isBackup ? " · backup" : ""}
        </p>
        <h2 className="mt-1 text-lg font-semibold text-neutral-900">{target.label}</h2>
        <p className="text-sm text-neutral-600">
          {[target.wardName && target.level === "polling_unit" ? `${target.wardName} ward` : null, target.lgaName, target.stateName]
            .filter(Boolean)
            .join(", ")}{" "}
          · Code <span className="font-mono">{target.locationCode}</span>
        </p>
        <p className="mt-1 text-sm text-neutral-500">{election.name}</p>
        {status.result ? (
          <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            You are correcting an earlier submission. The previous version is kept for the record.
          </p>
        ) : null}
      </div>

      {loadingExisting ? (
        <div className="flex items-center gap-2 text-sm text-neutral-600">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your earlier submission…
        </div>
      ) : null}

      <section className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h3 className="font-semibold text-neutral-900">1. Photo of the result sheet</h3>
        <PhotoListField
          id="result-photo"
          label={`Take a photo of the ${raceLabel(race)} result sheet`}
          hint="Each race has its own sheet — make sure this is the right one. Lay it flat in good light so every figure is readable. Add one photo per page."
          photos={photos}
          onChange={setPhotos}
          max={RESULT_MAX_PHOTOS}
          error={showErrors && photos.length === 0 ? "A photo of the sheet is required." : undefined}
        />
      </section>

      <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div>
          <h3 className="font-semibold text-neutral-900">2. Type the figures from the sheet</h3>
          <p className="text-sm text-neutral-600">
            Copy exactly what is written, even if it looks wrong — the photo and figures are checked together.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            id="registered"
            label="Registered voters"
            optional
            value={totals.registeredVoters}
            onChange={(v) => setTotals((t) => ({ ...t, registeredVoters: v }))}
          />
          <NumberField
            id="accredited"
            label="Accredited voters"
            value={totals.accreditedVoters}
            error={missingTotals("accreditedVoters")}
            onChange={(v) => setTotals((t) => ({ ...t, accreditedVoters: v }))}
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-neutral-800">Votes for each party</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {election.parties.map((p) => (
              <NumberField
                key={p}
                id={`party-${p}`}
                label={p}
                emphasis={p === "SDP"}
                value={partyVotes[p] ?? ""}
                onChange={(v) => setPartyVotes((pv) => ({ ...pv, [p]: v }))}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            Leave a party empty if it got no votes. Party votes so far add up to{" "}
            <strong className="tabular-nums text-neutral-800">{partySum.toLocaleString("en-NG")}</strong>.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <NumberField
            id="valid"
            label="Total valid votes"
            value={totals.totalValidVotes}
            error={missingTotals("totalValidVotes")}
            onChange={(v) => setTotals((t) => ({ ...t, totalValidVotes: v }))}
          />
          <NumberField
            id="rejected"
            label="Rejected votes"
            value={totals.rejectedVotes}
            error={missingTotals("rejectedVotes")}
            onChange={(v) => setTotals((t) => ({ ...t, rejectedVotes: v }))}
          />
          <NumberField
            id="cast"
            label="Total votes cast"
            value={totals.totalVotesCast}
            error={missingTotals("totalVotesCast")}
            onChange={(v) => setTotals((t) => ({ ...t, totalVotesCast: v }))}
          />
        </div>

        {figures ? (
          issues.length === 0 ? (
            <p className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> The figures add up.
            </p>
          ) : (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <p className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4 shrink-0" /> Please double-check
              </p>
              <ul className="ml-6 mt-1 list-disc space-y-0.5">
                {issues.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
              <p className="mt-1">
                If the sheet really says this, submit anyway and explain in the note below.
              </p>
            </div>
          )
        ) : null}

        <div className="space-y-1">
          <Label htmlFor="result-note">
            Note {issues.length > 0 ? <span className="text-red-600">(required)</span> : <span className="font-normal text-neutral-400">(optional)</span>}
          </Label>
          <textarea
            id="result-note"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 2000))}
            rows={3}
            placeholder="e.g. The sheet shows 120 for APC but the total line was altered."
            className={cn(
              "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sdp-primary/40",
              showErrors && issues.length > 0 && !note.trim() && "border-red-400 bg-red-50/50"
            )}
          />
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h3 className="font-semibold text-neutral-900">3. Confirm and send</h3>
        <GeoStatus geo={geo} locate={locate} />
        <label className="flex items-start gap-3 text-sm text-neutral-800">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 h-5 w-5 accent-sdp-primary"
          />
          I confirm the photo is of the official result sheet for this location and the figures match what is written on it.
        </label>
        {formError ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {formError}
          </p>
        ) : null}
        <Button
          type="button"
          className="min-h-[48px] w-full bg-sdp-primary text-base text-white hover:bg-sdp-primary/90"
          disabled={saving || loadingExisting}
          onClick={submit}
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          {status.result ? "Send corrected result" : "Send result"}
        </Button>
      </section>
    </div>
  );
}
