import { AGENT_LEVEL_LABELS, type AgentLevel } from "@/lib/agent-registration-schema";
import { MEMBER_CARD_WATERMARK_URL } from "@/lib/member-card-watermark";

/** Portrait lanyard badge; ~300 dpi when printed at 86 × 137.6 mm. */
export const AGENT_CARD_W = 1000;
export const AGENT_CARD_H = 1600;

export type AgentCardData = {
  id: string;
  agentLevel: AgentLevel;
  firstName: string;
  middleName: string | null;
  surname: string;
  phone: string;
  assignedStateName: string;
  assignedLgaName: string | null;
  assignedWardName: string | null;
  assignedPollingUnitName: string | null;
  assignedCode: string | null;
};

export type AgentCardAssets = {
  logo: HTMLImageElement | null;
  watermark: HTMLImageElement | null;
};

const SANS = 'system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const MONO = 'ui-monospace, "Cascadia Mono", Consolas, "Courier New", monospace';

const ORANGE = "#f48735";
const ORANGE_DEEP = "#d9611a";
const GREEN = "#01a85a";
const GREEN_DEEP = "#00773f";
const INK = "#111827";
const MUTED = "#6b7280";
const RED = "#c81e1e";

const LEVEL_THEME: Record<AgentLevel, { color: string; prefix: string; badge: string }> = {
  polling_unit: { color: "#01a85a", prefix: "PU", badge: "POLLING UNIT AGENT" },
  ward: { color: "#2563eb", prefix: "WD", badge: "WARD AGENT" },
  lga: { color: "#7c3aed", prefix: "LG", badge: "LOCAL GOVERNMENT AGENT" },
  state: { color: "#dc2626", prefix: "ST", badge: "STATE AGENT" },
};

export function agentCardNumber(r: Pick<AgentCardData, "id" | "agentLevel">): string {
  return `SDP/${LEVEL_THEME[r.agentLevel].prefix}/${r.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export function agentCardName(r: Pick<AgentCardData, "firstName" | "middleName" | "surname">): string {
  return [r.firstName, r.middleName, r.surname]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(" ")
    .toUpperCase();
}

function assignmentLines(r: AgentCardData): { primary: string; secondary: string } {
  const up = (s: string | null | undefined) => (s ?? "").trim().toUpperCase();
  const join = (...parts: (string | null)[]) => parts.map(up).filter(Boolean).join(" · ");
  switch (r.agentLevel) {
    case "polling_unit":
      return {
        primary: up(r.assignedPollingUnitName) || "—",
        secondary: join(r.assignedWardName, r.assignedLgaName, r.assignedStateName),
      };
    case "ward":
      return { primary: up(r.assignedWardName) || "—", secondary: join(r.assignedLgaName, r.assignedStateName) };
    case "lga":
      return { primary: up(r.assignedLgaName) || "—", secondary: join(r.assignedStateName) };
    default:
      return { primary: up(r.assignedStateName) || "—", secondary: "STATE-WIDE" };
  }
}

function qrPayload(r: AgentCardData): string {
  const a = assignmentLines(r);
  return [
    "SDP ACCREDITED AGENT",
    `ID: ${agentCardNumber(r)}`,
    `Name: ${agentCardName(r)}`,
    `Role: ${AGENT_LEVEL_LABELS[r.agentLevel]}`,
    `Assigned: ${[a.primary, a.secondary].filter(Boolean).join(" · ")}`,
    `Code: ${r.assignedCode || "—"}`,
    `Phone: ${r.phone}`,
  ].join("\n");
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

let assetsPromise: Promise<AgentCardAssets> | null = null;

export function loadAgentCardAssets(): Promise<AgentCardAssets> {
  if (!assetsPromise) {
    assetsPromise = Promise.all([loadImage("/sdplogo.jpg"), loadImage(MEMBER_CARD_WATERMARK_URL)]).then(
      ([logo, watermark]) => ({ logo, watermark })
    );
  }
  return assetsPromise;
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function setFont(ctx: CanvasRenderingContext2D, weight: number, size: number, family = SANS) {
  ctx.font = `${weight} ${size}px ${family}`;
}

function spacedWidth(ctx: CanvasRenderingContext2D, text: string, spacing: number): number {
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width;
  return w + spacing * Math.max(0, text.length - 1);
}

function drawSpacedCentered(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, spacing: number) {
  let x = cx - spacedWidth(ctx, text, spacing) / 2;
  const align = ctx.textAlign;
  ctx.textAlign = "left";
  for (const ch of text) {
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width + spacing;
  }
  ctx.textAlign = align;
}

function drawSpacedLeft(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
  const align = ctx.textAlign;
  ctx.textAlign = "left";
  for (const ch of text) {
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width + spacing;
  }
  ctx.textAlign = align;
}

/** Largest font size (stepping down) at which `text` fits `maxW`. */
function fitSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  weight: number,
  start: number,
  min: number,
  family = SANS
): number {
  for (let size = start; size > min; size -= 2) {
    setFont(ctx, weight, size, family);
    if (ctx.measureText(text).width <= maxW) return size;
  }
  setFont(ctx, weight, min, family);
  return min;
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

/** Split a name into two lines with the most even widths. */
function splitTwoLines(ctx: CanvasRenderingContext2D, text: string): [string, string] {
  const words = text.split(/\s+/);
  if (words.length < 2) return [text, ""];
  let best: [string, string] = [words[0], words.slice(1).join(" ")];
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ");
    const b = words.slice(i).join(" ");
    const diff = Math.abs(ctx.measureText(a).width - ctx.measureText(b).width);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = [a, b];
    }
  }
  return best;
}

/** Greedy word wrap into at most two lines; the second line is ellipsized if needed. */
function wrapTwoLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): [string, string] {
  const words = text.split(/\s+/);
  let first = "";
  let i = 0;
  for (; i < words.length; i++) {
    const next = first ? `${first} ${words[i]}` : words[i];
    if (first && ctx.measureText(next).width > maxW) break;
    first = next;
  }
  return [ellipsize(ctx, first, maxW), ellipsize(ctx, words.slice(i).join(" "), maxW)];
}

/** Cover-crop with a slight upward bias so faces stay in frame. */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.naturalWidth - sw) / 2;
  const sy = (img.naturalHeight - sh) * 0.3;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function drawPhotoPlaceholder(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = "#e5e7eb";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#9ca3af";
  const cx = x + w / 2;
  ctx.beginPath();
  ctx.arc(cx, y + h * 0.38, w * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, y + h * 0.95, w * 0.42, h * 0.3, 0, Math.PI, 0);
  ctx.fill();
}

/** Orange → white → green → white bands echoing the swoosh in the SDP logo. */
function waveBand(ctx: CanvasRenderingContext2D, offset: number, color: string) {
  const W = AGENT_CARD_W;
  ctx.beginPath();
  ctx.moveTo(0, 360 + offset);
  ctx.bezierCurveTo(280, 300 + offset, 700, 440 + offset, W, 350 + offset);
  ctx.lineTo(W, AGENT_CARD_H);
  ctx.lineTo(0, AGENT_CARD_H);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  setFont(ctx, 700, 21);
  ctx.fillStyle = MUTED;
  drawSpacedLeft(ctx, text, x, y, 3);
}

export async function renderAgentCard(
  r: AgentCardData,
  photoDataUrl: string | null,
  assets: AgentCardAssets
): Promise<HTMLCanvasElement> {
  const W = AGENT_CARD_W;
  const H = AGENT_CARD_H;
  const theme = LEVEL_THEME[r.agentLevel];

  const QRCode = await import("qrcode");
  const [photo, qr] = await Promise.all([
    photoDataUrl ? loadImage(photoDataUrl) : Promise.resolve(null),
    QRCode.toDataURL(qrPayload(r), { width: 440, margin: 1, errorCorrectionLevel: "M" })
      .then(loadImage)
      .catch(() => null),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser.");
  ctx.textBaseline = "alphabetic";

  // Header
  const header = ctx.createLinearGradient(0, 0, W, 420);
  header.addColorStop(0, ORANGE);
  header.addColorStop(1, ORANGE_DEEP);
  ctx.fillStyle = header;
  ctx.fillRect(0, 0, W, 480);

  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "#ffffff";
  for (let x = -480; x < W; x += 96) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 40, 0);
    ctx.lineTo(x + 520, 480);
    ctx.lineTo(x + 480, 480);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  waveBand(ctx, -14, "#ffffff");
  waveBand(ctx, 0, GREEN);
  waveBand(ctx, 34, "#ffffff");

  // Lanyard slot
  roundRectPath(ctx, W / 2 - 100, 34, 200, 34, 17);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.stroke();

  // Logo plate
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.22)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  roundRectPath(ctx, W / 2 - 150, 92, 300, 236, 26);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();
  if (assets.logo) {
    const boxW = 270;
    const boxH = 212;
    const s = Math.min(boxW / assets.logo.naturalWidth, boxH / assets.logo.naturalHeight);
    const lw = assets.logo.naturalWidth * s;
    const lh = assets.logo.naturalHeight * s;
    ctx.drawImage(assets.logo, W / 2 - lw / 2, 104 + (boxH - lh) / 2, lw, lh);
  } else {
    setFont(ctx, 900, 96);
    ctx.fillStyle = GREEN;
    ctx.textAlign = "center";
    ctx.fillText("SDP", W / 2, 245);
  }

  // Watermark behind the details block
  if (assets.watermark) {
    ctx.save();
    ctx.globalAlpha = 0.16;
    const wh = (W * assets.watermark.naturalHeight) / assets.watermark.naturalWidth;
    ctx.drawImage(assets.watermark, 0, 1110, W, wh);
    ctx.restore();
  }

  // Level colour rails down both edges
  ctx.fillStyle = theme.color;
  ctx.fillRect(0, 440, 14, 1108);
  ctx.fillRect(W - 14, 440, 14, 1108);

  // Title
  ctx.textAlign = "center";
  setFont(ctx, 800, 40);
  ctx.fillStyle = GREEN_DEEP;
  const title = "ACCREDITED PARTY AGENT";
  const titleW = spacedWidth(ctx, title, 5);
  drawSpacedCentered(ctx, title, W / 2, 490, 5);
  ctx.fillStyle = ORANGE;
  const sideGap = 22;
  const lineLen = Math.max(0, W / 2 - titleW / 2 - sideGap - 50);
  if (lineLen > 20) {
    ctx.fillRect(50, 476, lineLen, 4);
    ctx.fillRect(W - 50 - lineLen, 476, lineLen, 4);
  }

  // Photo with level-coloured frame
  const pw = 370;
  const ph = 440;
  const px = W / 2 - pw / 2;
  const py = 520;
  roundRectPath(ctx, px - 10, py - 10, pw + 20, ph + 20, 32);
  ctx.fillStyle = theme.color;
  ctx.fill();
  roundRectPath(ctx, px - 4, py - 4, pw + 8, ph + 8, 26);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.save();
  roundRectPath(ctx, px, py, pw, ph, 22);
  ctx.clip();
  if (photo) drawCover(ctx, photo, px, py, pw, ph);
  else drawPhotoPlaceholder(ctx, px, py, pw, ph);
  ctx.restore();

  // Role pill overlapping the photo's bottom edge
  setFont(ctx, 800, 30);
  const badgeW = spacedWidth(ctx, theme.badge, 3) + 80;
  const badgeH = 68;
  const badgeY = py + ph - 4;
  roundRectPath(ctx, W / 2 - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, badgeH / 2);
  ctx.fillStyle = theme.color;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  drawSpacedCentered(ctx, theme.badge, W / 2, badgeY + 11, 3);

  // Name (one line, or two balanced lines for long names)
  const name = agentCardName(r);
  const nameMaxW = W - 120;
  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  const oneLine = fitSize(ctx, name, nameMaxW, 800, 60, 44);
  setFont(ctx, 800, oneLine);
  if (ctx.measureText(name).width <= nameMaxW) {
    ctx.fillText(name, W / 2, 1098);
  } else {
    setFont(ctx, 800, 44);
    const [a, b] = splitTwoLines(ctx, name);
    const size = Math.min(fitSize(ctx, a, nameMaxW, 800, 44, 32), fitSize(ctx, b, nameMaxW, 800, 44, 32));
    setFont(ctx, 800, size);
    ctx.fillText(ellipsize(ctx, a, nameMaxW), W / 2, 1072);
    ctx.fillText(ellipsize(ctx, b, nameMaxW), W / 2, 1072 + size + 8);
  }

  ctx.fillStyle = "#e5e7eb";
  ctx.fillRect(70, 1148, W - 140, 3);

  // Details
  const dx = 70;
  const detailsMaxW = 600;
  const assignment = assignmentLines(r);
  ctx.textAlign = "left";

  drawLabel(ctx, "ASSIGNED TO", dx, 1196);
  ctx.fillStyle = INK;
  let shift = 0;
  if (fitSize(ctx, assignment.primary, detailsMaxW, 800, 36, 28) === 28 && ctx.measureText(assignment.primary).width > detailsMaxW) {
    setFont(ctx, 800, 27);
    const [a, b] = wrapTwoLines(ctx, assignment.primary, detailsMaxW);
    ctx.fillText(a, dx, 1234);
    ctx.fillText(b, dx, 1266);
    shift = 26;
  } else {
    ctx.fillText(assignment.primary, dx, 1238);
  }
  if (assignment.secondary) {
    setFont(ctx, 600, 22);
    ctx.fillStyle = MUTED;
    ctx.fillText(ellipsize(ctx, assignment.secondary, detailsMaxW), dx, 1272 + shift);
  }

  drawLabel(ctx, "LOCATION CODE", dx, 1318 + shift);
  setFont(ctx, 800, 36, MONO);
  ctx.fillStyle = RED;
  ctx.fillText(r.assignedCode || "—", dx, 1360 + shift);

  drawLabel(ctx, "AGENT ID", dx, 1406 + shift);
  drawLabel(ctx, "PHONE", dx + 330, 1406 + shift);
  ctx.fillStyle = INK;
  setFont(ctx, 800, 27, MONO);
  ctx.fillText(agentCardNumber(r), dx, 1444 + shift);
  fitSize(ctx, r.phone, 270, 700, 27, 20, MONO);
  ctx.fillText(r.phone, dx + 330, 1444 + shift);

  // QR
  const qx = 708;
  const qy = 1178;
  const qs = 222;
  roundRectPath(ctx, qx - 10, qy - 10, qs + 20, qs + 20, 18);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = theme.color;
  ctx.stroke();
  if (qr) ctx.drawImage(qr, qx, qy, qs, qs);
  ctx.textAlign = "center";
  setFont(ctx, 700, 18);
  ctx.fillStyle = MUTED;
  drawSpacedCentered(ctx, "SCAN TO VERIFY", qx + qs / 2, qy + qs + 42, 2);

  // Footer
  setFont(ctx, 500, 19);
  ctx.fillStyle = MUTED;
  ctx.fillText("This card remains the property of the Social Democratic Party.", W / 2, 1498);
  ctx.fillText("If found, please return it to the nearest SDP office.", W / 2, 1524);

  ctx.fillStyle = GREEN;
  ctx.fillRect(0, 1548, W, 20);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 1568, W, 8);
  ctx.fillStyle = ORANGE;
  ctx.fillRect(0, 1576, W, 24);

  return canvas;
}
