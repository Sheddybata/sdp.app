"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { enqueue, newClientId } from "@/lib/elections/offline-queue";
import {
  INCIDENT_CATEGORIES,
  INCIDENT_MAX_PHOTOS,
  INCIDENT_SEVERITIES,
  labelFor,
  type Election,
  type IncidentSeverity,
} from "@/lib/elections/shared";
import { cn } from "@/lib/utils";
import { PhotoListField, type PhotoItem } from "./PhotoListField";
import { GeoStatus } from "./GeoStatus";
import { useGeolocation } from "./useGeolocation";

const SEVERITY_STYLES: Record<IncidentSeverity, string> = {
  low: "border-neutral-300 data-[on=true]:border-neutral-700 data-[on=true]:bg-neutral-800 data-[on=true]:text-white",
  medium: "border-amber-300 data-[on=true]:border-amber-500 data-[on=true]:bg-amber-500 data-[on=true]:text-white",
  high: "border-red-300 data-[on=true]:border-red-600 data-[on=true]:bg-red-600 data-[on=true]:text-white",
};

export function IncidentForm({
  election,
  postLabel,
  onCancel,
  onQueued,
}: {
  election: Election;
  postLabel: string;
  onCancel: () => void;
  onQueued: (message: string) => void;
}) {
  const { geo, locate, fix } = useGeolocation();
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState<IncidentSeverity>("medium");
  const [occurredAt, setOccurredAt] = useState(() => format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError(null);
    if (!category) return setError("Choose what happened.");
    if (description.trim().length < 10) return setError("Describe what happened (at least 10 characters).");
    const when = new Date(occurredAt);
    if (Number.isNaN(when.getTime())) return setError("Enter when it happened.");

    setSaving(true);
    try {
      await enqueue({
        kind: "incident",
        electionId: election.id,
        label: `Incident — ${labelFor(INCIDENT_CATEGORIES, category)}`,
        photos: photos.map((p) => ({ dataUrl: p.dataUrl })),
        keptPhotoPaths: [],
        payload: {
          electionId: election.id,
          category,
          severity,
          description: description.trim(),
          occurredAt: when.toISOString(),
          latitude: fix?.latitude ?? null,
          longitude: fix?.longitude ?? null,
          clientSubmissionId: newClientId(),
        },
      });
      onQueued("Incident report saved on your phone and is being sent to the party.");
    } catch {
      setError("Could not save on this phone. Free up storage and try again.");
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

      <div className="rounded-xl border border-red-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Report an incident</p>
        <h2 className="mt-1 text-lg font-semibold text-neutral-900">{postLabel}</h2>
        <p className="text-sm text-neutral-500">{election.name}</p>
      </div>

      <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="space-y-1">
          <Label htmlFor="incident-category">What happened?</Label>
          <select
            id="incident-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-11 w-full rounded-md border border-neutral-300 bg-white px-3 text-base focus:outline-none focus:ring-2 focus:ring-sdp-primary/40"
          >
            <option value="">Choose…</option>
            {INCIDENT_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label>How serious?</Label>
          <div className="grid grid-cols-3 gap-2">
            {INCIDENT_SEVERITIES.map((s) => (
              <button
                key={s.id}
                type="button"
                data-on={severity === s.id}
                onClick={() => setSeverity(s.id)}
                className={cn(
                  "min-h-[44px] rounded-lg border bg-white px-2 text-sm font-medium transition-colors",
                  SEVERITY_STYLES[s.id]
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="incident-time">When did it happen?</Label>
          <Input
            id="incident-time"
            type="datetime-local"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            className="h-11 text-base"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="incident-description">Describe what happened</Label>
          <textarea
            id="incident-description"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
            rows={5}
            placeholder="Who was involved, what you saw, and what is happening now."
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-sdp-primary/40"
          />
        </div>

        <PhotoListField
          id="incident-photo"
          label="Photos (optional)"
          hint="Only take photos when it is safe to do so."
          photos={photos}
          onChange={setPhotos}
          max={INCIDENT_MAX_PHOTOS}
        />

        <GeoStatus geo={geo} locate={locate} />

        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          type="button"
          className="min-h-[48px] w-full bg-red-600 text-base text-white hover:bg-red-700"
          disabled={saving}
          onClick={submit}
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          Send report
        </Button>
      </section>
    </div>
  );
}
