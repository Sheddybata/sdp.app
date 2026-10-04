"use client";

import { X } from "lucide-react";
import { DocumentImageField } from "@/components/agent-registration/DocumentImageField";

export type PhotoItem = { key: string; src: string; dataUrl?: string; path?: string };

/** Several photos (e.g. one per page of a result sheet), each taken or uploaded one at a time. */
export function PhotoListField({
  id,
  label,
  hint,
  photos,
  onChange,
  max,
  error,
}: {
  id: string;
  label: string;
  hint?: string;
  photos: PhotoItem[];
  onChange: (photos: PhotoItem[]) => void;
  max: number;
  error?: string;
}) {
  const add = (dataUrl: string) => {
    if (!dataUrl || photos.length >= max) return;
    onChange([...photos, { key: `${Date.now()}-${photos.length}`, src: dataUrl, dataUrl }]);
  };

  return (
    <div className="space-y-3">
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((p, i) => (
            <div key={p.key} className="relative overflow-hidden rounded-lg border border-neutral-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt={`${label} ${i + 1}`} className="h-36 w-full object-contain" />
              <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white">
                Photo {i + 1}
              </span>
              <button
                type="button"
                className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-neutral-700 shadow hover:bg-red-50 hover:text-red-600"
                onClick={() => onChange(photos.filter((x) => x.key !== p.key))}
                aria-label={`Remove photo ${i + 1}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {photos.length < max ? (
        <DocumentImageField
          id={id}
          label={photos.length === 0 ? label : `Add another photo (${photos.length + 1} of up to ${max})`}
          hint={photos.length === 0 ? hint : undefined}
          value=""
          onChange={add}
          error={error}
          maxSide={2000}
          maxBytes={900 * 1024}
        />
      ) : (
        <p className="text-xs text-neutral-500">Maximum of {max} photos reached.</p>
      )}
    </div>
  );
}
