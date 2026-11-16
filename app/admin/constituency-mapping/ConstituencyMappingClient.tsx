"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationPicker } from "@/components/agent-registration/LocationPicker";
import { EMPTY_LOCATION, type LocationPick } from "@/lib/agent-registration-schema";
import { saveManualConstituencyLink } from "@/app/actions/constituencies";
import type { UnmappedSeat } from "@/lib/constituency-data";
import { cn } from "@/lib/utils";

type ManualMap = Record<string, Array<string | { stateId: string; lgaId: string; wardId: string }>>;

function codesFor(manual: ManualMap, code: string): string[] {
  const entries = manual[code] || [];
  return entries
    .map((e) => (typeof e === "string" ? e.trim() : ""))
    .filter(Boolean);
}

export function ConstituencyMappingClient({
  initialUnmapped,
  initialManualLinks,
}: {
  initialUnmapped: UnmappedSeat[];
  initialManualLinks: ManualMap;
}) {
  const [search, setSearch] = useState("");
  const [selectedCode, setSelectedCode] = useState<string | null>(initialUnmapped[0]?.code ?? null);
  const [manual, setManual] = useState<ManualMap>(initialManualLinks);
  const [wardPick, setWardPick] = useState<LocationPick>(EMPTY_LOCATION);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialUnmapped.filter((s) => {
      if (!q) return true;
      return [s.code, s.name, s.stateName, s.composition, s.reason]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [initialUnmapped, search]);

  const selected = initialUnmapped.find((s) => s.code === selectedCode) ?? null;
  const linked = selected ? codesFor(manual, selected.code) : [];

  const addWard = () => {
    if (!selected || !wardPick.code) return;
    const next = Array.from(new Set([...linked, wardPick.code]));
    persist(selected.code, next);
  };

  const removeWard = (code: string) => {
    if (!selected) return;
    persist(
      selected.code,
      linked.filter((c) => c !== code)
    );
  };

  const persist = (code: string, wardLocationCodes: string[]) => {
    setMessage(null);
    setError(null);
    startTransition(() => {
      void saveManualConstituencyLink({ code, wardLocationCodes }).then((res) => {
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setManual((m) => ({ ...m, [code]: wardLocationCodes }));
        setMessage(
          "Saved. Links are live for comparison now. Re-run npm run extract-constituencies later if you want full ward names rebuilt from location-codes."
        );
        setWardPick(EMPTY_LOCATION);
      });
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Constituency mapping</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">
            These seats could not be auto-linked to wards/PUs from the INEC composition text. Attach wards
            from the existing location list so coverage and PU-vs-collation comparison work.
          </p>
        </div>
        <Button asChild variant="outline" className="min-h-[44px]">
          <Link href="/admin/agent-coverage">Back to coverage</Link>
        </Button>
      </div>

      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-200 p-3">
            <Input
              placeholder="Search code, name, state…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-h-[44px]"
              aria-label="Search unmapped seats"
            />
            <p className="mt-2 text-xs text-neutral-500">
              {visible.length} of {initialUnmapped.length} unmapped seats
            </p>
          </div>
          <ul className="max-h-[70vh] overflow-y-auto divide-y divide-neutral-100">
            {visible.map((s) => {
              const active = s.code === selectedCode;
              const hasManual = codesFor(manual, s.code).length > 0;
              return (
                <li key={s.code}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCode(s.code);
                      setMessage(null);
                      setError(null);
                      setWardPick(EMPTY_LOCATION);
                    }}
                    className={cn(
                      "w-full px-4 py-3 text-left hover:bg-neutral-50",
                      active && "bg-sdp-primary/5"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-neutral-900">{s.name}</p>
                        <p className="text-xs text-neutral-600">
                          {s.code} · {s.stateName}
                          {s.kind ? ` · ${s.kind}` : ""}
                        </p>
                      </div>
                      {hasManual ? (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                          Manual
                        </span>
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })}
            {visible.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-neutral-500">No seats match this search.</li>
            ) : null}
          </ul>
        </div>

        <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          {!selected ? (
            <p className="text-sm text-neutral-600">Select a seat on the left.</p>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">{selected.name}</h2>
                <p className="text-sm text-neutral-600">
                  {selected.code} · {selected.stateName}
                </p>
                <p className="mt-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
                  <span className="font-medium">Composition: </span>
                  {selected.composition || "—"}
                </p>
                <p className="mt-1 text-xs text-neutral-500">Reason: {selected.reason}</p>
              </div>

              <div className="space-y-2">
                <Label>Linked wards ({linked.length})</Label>
                {linked.length === 0 ? (
                  <p className="text-sm text-neutral-500">No wards linked yet.</p>
                ) : (
                  <ul className="space-y-1">
                    {linked.map((c) => (
                      <li
                        key={c}
                        className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                      >
                        <span className="font-mono text-neutral-900">{c}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600"
                          onClick={() => removeWard(c)}
                          disabled={pending}
                          aria-label={`Remove ${c}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-3 rounded-xl border border-dashed border-neutral-300 p-3">
                <Label>Add a ward</Label>
                <LocationPicker
                  idPrefix="map-ward"
                  level="ward"
                  value={wardPick}
                  onChange={setWardPick}
                />
                <Button
                  type="button"
                  className="min-h-[44px] bg-sdp-primary text-white hover:bg-[#e0752a]"
                  onClick={addWard}
                  disabled={pending || !wardPick.code}
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add ward to this seat
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
