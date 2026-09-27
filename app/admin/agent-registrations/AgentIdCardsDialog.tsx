"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AGENT_PHOTO_BATCH_SIZE } from "@/lib/agent-registration-schema";
import type { AgentRegistrationRecord } from "@/lib/db/agent-registrations";
import { buildAgentCardsZip, renderAgentCardJpeg, triggerDownload } from "@/lib/agent-cards-export";
import { fetchAgentCardPhotos } from "@/app/actions/adminAgentRegistrations";

type Phase = "idle" | "working" | "done" | "error";

const LEGEND: [string, string][] = [
  ["#01a85a", "Polling Unit"],
  ["#2563eb", "Ward"],
  ["#7c3aed", "Local Government"],
  ["#dc2626", "State"],
];

export function AgentIdCardsDialog({
  open,
  onOpenChange,
  agents,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agents: AgentRegistrationRecord[];
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const first = agents[0];
  const firstId = first?.id;

  useEffect(() => {
    if (!open) {
      setPhase("idle");
      setError(null);
      setProgress({ done: 0, total: 0 });
      return;
    }
    if (!first) return;
    let cancelled = false;
    setPreview(null);
    void (async () => {
      try {
        const photos = await fetchAgentCardPhotos([first.id]);
        const jpeg = await renderAgentCardJpeg(first, photos[first.id] ?? null);
        if (!cancelled) setPreview(jpeg);
      } catch {
        /* preview is optional */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, firstId]);

  const start = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase("working");
    setError(null);
    try {
      const blob = await buildAgentCardsZip(agents, {
        fetchPhotos: fetchAgentCardPhotos,
        batchSize: AGENT_PHOTO_BATCH_SIZE,
        onProgress: setProgress,
        signal: controller.signal,
      });
      triggerDownload(blob, `SDP-Agent-ID-Cards-${new Date().toISOString().slice(0, 10)}.zip`);
      setPhase("done");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setPhase("idle");
        return;
      }
      console.error("[agent cards] export failed:", e);
      setError("Could not create the cards. Check your connection and try again.");
      setPhase("error");
    } finally {
      abortRef.current = null;
    }
  };

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const working = phase === "working";

  return (
    <Dialog open={open} onOpenChange={(o) => !working && onOpenChange(o)}>
      <DialogContent className="flex max-h-[min(92vh,820px)] w-[calc(100%-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:w-full">
        <DialogHeader className="shrink-0 space-y-1 border-b border-neutral-200 px-4 py-4 text-left sm:px-6">
          <DialogTitle className="text-lg">Download agent ID cards</DialogTitle>
          <DialogDescription>
            One ZIP file with a print-ready A4 PDF (4 cards per page) and a separate image of every card for
            sharing on WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="grid gap-5 sm:grid-cols-[220px_minmax(0,1fr)]">
            <div className="mx-auto w-[200px] sm:w-[220px]">
              <div className="aspect-[5/8] overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 shadow-md">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="Sample agent ID card" className="h-full w-full object-contain" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-xs text-neutral-500">
                    <Loader2 className="h-6 w-6 animate-spin text-sdp-primary" />
                    Drawing sample card…
                  </div>
                )}
              </div>
              <p className="mt-2 text-center text-xs text-neutral-500">Sample: {first ? "first agent" : "—"}</p>
            </div>

            <div className="space-y-4 text-sm">
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-3xl font-bold text-neutral-900">{agents.length}</p>
                <p className="text-neutral-600">
                  approved agent{agents.length === 1 ? "" : "s"} · {Math.ceil(agents.length / 4)} A4 page
                  {Math.ceil(agents.length / 4) === 1 ? "" : "s"} to print
                </p>
              </div>

              <div>
                <p className="mb-2 font-medium text-neutral-900">Colour-coded by agent type</p>
                <ul className="grid grid-cols-2 gap-2">
                  {LEGEND.map(([color, label]) => (
                    <li key={label} className="flex items-center gap-2 text-neutral-700">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                      {label}
                    </li>
                  ))}
                </ul>
              </div>

              <ul className="list-disc space-y-1 pl-5 text-neutral-600">
                <li>Print at 100% (“Actual size”) on A4 card stock, then cut along the grey lines.</li>
                <li>Each card is 86 × 137.6 mm and fits a standard 4 × 6 inch badge holder.</li>
                <li>The QR code holds the agent’s ID, name, role, assignment and phone.</li>
              </ul>

              {working || phase === "done" ? (
                <div className="space-y-2">
                  <div className="h-2.5 overflow-hidden rounded-full bg-neutral-200">
                    <div
                      className="h-full rounded-full bg-sdp-accent transition-[width] duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-neutral-600" aria-live="polite">
                    {phase === "done" ? (
                      <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" /> Done — {progress.total} cards downloaded.
                      </span>
                    ) : progress.done < progress.total ? (
                      `Creating card ${progress.done + 1} of ${progress.total}… keep this tab open.`
                    ) : (
                      "Packing the ZIP file…"
                    )}
                  </p>
                </div>
              ) : null}

              {error ? (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-neutral-200 px-4 py-3 sm:flex-row sm:justify-end sm:px-6">
          {working ? (
            <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => abortRef.current?.abort()}>
              Cancel
            </Button>
          ) : (
            <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
          <Button
            type="button"
            className="min-h-[44px] bg-sdp-accent text-white hover:bg-[#018f4e]"
            onClick={start}
            disabled={working || agents.length === 0}
          >
            {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {working ? `Creating ${pct}%` : phase === "done" ? "Download again" : `Download all ${agents.length} cards`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
