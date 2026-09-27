import {
  AGENT_CARD_H,
  AGENT_CARD_W,
  agentCardNumber,
  loadAgentCardAssets,
  renderAgentCard,
  type AgentCardData,
} from "@/lib/agent-id-card";

/** Printed card size (mm) — same 1 : 1.6 ratio as the canvas; fits a 4×6 in badge holder. */
const CARD_MM_W = 86;
const CARD_MM_H = (CARD_MM_W * AGENT_CARD_H) / AGENT_CARD_W;
const A4_W = 210;
const A4_H = 297;
const GAP_X = 8;
const GAP_Y = 6;
const COLS = 2;
const ROWS = 2;
const MARGIN_X = (A4_W - COLS * CARD_MM_W - (COLS - 1) * GAP_X) / 2;
const MARGIN_Y = (A4_H - ROWS * CARD_MM_H - (ROWS - 1) * GAP_Y) / 2;
const JPEG_QUALITY = 0.92;

export type AgentCardsProgress = { done: number; total: number };

function slug(s: string | null | undefined): string {
  return (
    (s ?? "")
      .trim()
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "unknown"
  );
}

function sortKey(r: AgentCardData): string {
  return [r.assignedStateName, r.assignedLgaName, r.assignedWardName, r.assignedPollingUnitName, r.surname, r.firstName]
    .map((s) => (s ?? "").toLowerCase())
    .join("\u0000");
}

export function agentCardFileName(r: AgentCardData): string {
  return `${slug(r.surname)}-${slug(r.firstName)}-${agentCardNumber(r).replace(/\//g, "-")}.jpg`;
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function renderAgentCardJpeg(r: AgentCardData, photoDataUrl: string | null): Promise<string> {
  const assets = await loadAgentCardAssets();
  const canvas = await renderAgentCard(r, photoDataUrl, assets);
  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  canvas.width = 0;
  canvas.height = 0;
  return dataUrl;
}

const HOW_TO_PRINT = `SDP AGENT ID CARDS
==================

1. Print "SDP-Agent-ID-Cards-Print-A4.pdf" on A4 paper at 100% / "Actual size"
   (turn OFF "Fit to page") so every card is exactly 86 x 137.6 mm.
2. Use card stock (250 gsm or heavier) or laminate after printing for durability.
3. Cut along the thin grey lines. Punch the lanyard slot at the top of each card,
   or slip the card into a standard 4 x 6 inch badge holder.

The "cards" folder has one image per agent, grouped by state, for sharing on
WhatsApp or email. Cards are colour-coded by agent type:
  Green  = Polling Unit Agent
  Blue   = Ward Agent
  Purple = Local Government Agent
  Red    = State Agent

The QR code on each card holds the agent's ID, name, role, assignment and phone.
`;

/**
 * Render every agent's card into one ZIP: an A4 print PDF (4 cards per page with cut lines)
 * plus one JPEG per agent. Photos are fetched in batches to keep each request small.
 */
export async function buildAgentCardsZip(
  agents: AgentCardData[],
  opts: {
    fetchPhotos: (ids: string[]) => Promise<Record<string, string | null>>;
    batchSize: number;
    onProgress?: (p: AgentCardsProgress) => void;
    signal?: AbortSignal;
  }
): Promise<Blob> {
  const [{ jsPDF }, { default: JSZip }] = await Promise.all([import("jspdf"), import("jszip")]);
  const assets = await loadAgentCardAssets();

  const sorted = [...agents].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  const total = sorted.length;
  const zip = new JSZip();
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  pdf.setProperties({ title: "SDP Agent ID Cards", creator: "SDP Member Portal" });

  const perPage = COLS * ROWS;
  const usedNames = new Set<string>();
  let done = 0;
  opts.onProgress?.({ done, total });

  for (let start = 0; start < total; start += opts.batchSize) {
    if (opts.signal?.aborted) throw new DOMException("Cancelled", "AbortError");
    const batch = sorted.slice(start, start + opts.batchSize);
    const photos = await opts.fetchPhotos(batch.map((r) => r.id));

    for (const r of batch) {
      if (opts.signal?.aborted) throw new DOMException("Cancelled", "AbortError");
      const canvas = await renderAgentCard(r, photos[r.id] ?? null, assets);
      const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
      canvas.width = 0;
      canvas.height = 0;

      const slot = done % perPage;
      if (done > 0 && slot === 0) pdf.addPage();
      const col = slot % COLS;
      const row = Math.floor(slot / COLS);
      const x = MARGIN_X + col * (CARD_MM_W + GAP_X);
      const y = MARGIN_Y + row * (CARD_MM_H + GAP_Y);
      pdf.addImage(dataUrl, "JPEG", x, y, CARD_MM_W, CARD_MM_H, undefined, "FAST");
      pdf.setDrawColor(190, 190, 190);
      pdf.setLineWidth(0.15);
      pdf.rect(x, y, CARD_MM_W, CARD_MM_H);

      let path = `cards/${slug(r.assignedStateName)}/${agentCardFileName(r)}`;
      for (let n = 2; usedNames.has(path); n++) path = path.replace(/(-\d+)?\.jpg$/, `-${n}.jpg`);
      usedNames.add(path);
      zip.file(path, dataUrl.slice(dataUrl.indexOf(",") + 1), { base64: true });

      done += 1;
      opts.onProgress?.({ done, total });
    }
  }

  zip.file("SDP-Agent-ID-Cards-Print-A4.pdf", pdf.output("arraybuffer"));
  zip.file("HOW-TO-PRINT.txt", HOW_TO_PRINT);
  return zip.generateAsync({ type: "blob", compression: "STORE" });
}
