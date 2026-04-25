/**
 * INEC membership register export: print-ready PDF registers zipped by state.
 * Used by the admin API route only (Node runtime).
 */
import type { MemberRecord } from "@/lib/mock-members";
import { NIGERIA_STATES } from "@/lib/nigeria-geo";
import { PWD_CATEGORY_LABELS_EN, type PwdCategory } from "@/lib/pwd-enrollment";
import { format, parseISO } from "date-fns";
import { jsPDF } from "jspdf";
import JSZip from "jszip";
import { Buffer } from "node:buffer";

/** Two-letter batch codes aligned with common SDP / state abbreviations (e.g. BA = Bauchi, AD = Adamawa). */
export const STATE_ID_TO_INEC_BATCH_CODE: Record<string, string> = {
  abia: "AB",
  adamawa: "AD",
  "akwa-ibom": "AK",
  anambra: "AN",
  bauchi: "BA",
  bayelsa: "BY",
  benue: "BE",
  borno: "BO",
  "cross-river": "CR",
  delta: "DE",
  ebonyi: "EB",
  edo: "ED",
  ekiti: "EK",
  enugu: "EN",
  fct: "FC",
  gombe: "GO",
  imo: "IM",
  jigawa: "JI",
  kaduna: "KD",
  kano: "KN",
  katsina: "KT",
  kebbi: "KE",
  kogi: "KO",
  kwara: "KW",
  lagos: "LA",
  nasarawa: "NA",
  niger: "NI",
  ogun: "OG",
  ondo: "ON",
  osun: "OS",
  oyo: "OY",
  plateau: "PL",
  rivers: "RI",
  sokoto: "SO",
  taraba: "TA",
  yobe: "YO",
  zamfara: "ZA",
};

const PDF_COLUMNS = [
  { key: "sn", label: "S/N", width: 7 },
  { key: "name", label: "Name", width: 22 },
  { key: "sex", label: "Sex", width: 9 },
  { key: "dob", label: "DOB", width: 16 },
  { key: "nin", label: "NIN", width: 20 },
  { key: "address", label: "Address", width: 29 },
  { key: "state", label: "State", width: 13 },
  { key: "lga", label: "LGA", width: 16 },
  { key: "ward", label: "Ward", width: 18 },
  { key: "pollingUnit", label: "P/Unit", width: 18 },
  { key: "pwd", label: "PWD", width: 11 },
  { key: "photo", label: "Photo", width: 14 },
] as const;

const FEMALE_TITLES = new Set(["Mrs", "Miss", "Ms", "Dame"]);

/**
 * Max rows per PDF file for one state. Large registers blow V8/jsPDF limits (empty arraybuffer / max string).
 * Multiple parts get sequential S/N and names like …_part2of5.pdf inside the ZIP.
 */
const INEC_PDF_MAX_MEMBERS_PER_FILE = 90;

function chunkMembers<T>(items: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    out.push(items.slice(i, i + chunkSize));
  }
  return out;
}

function getStateName(stateId: string): string {
  return NIGERIA_STATES.find((s) => s.id === stateId)?.name ?? stateId;
}

function getLGAName(stateId: string, lgaId: string): string {
  const state = NIGERIA_STATES.find((s) => s.id === stateId);
  return state?.lgas.find((l) => l.id === lgaId)?.name ?? lgaId;
}

function getWardName(stateId: string, lgaId: string, wardId: string): string {
  const state = NIGERIA_STATES.find((s) => s.id === stateId);
  const lga = state?.lgas.find((l) => l.id === lgaId);
  return lga?.wards.find((w) => w.id === wardId)?.name ?? wardId;
}

export function formatInecPwd(m: MemberRecord): string {
  if (!m.pwdIdentifies) return "None";
  const cat = m.pwdCategory as PwdCategory | undefined;
  const label =
    cat && cat in PWD_CATEGORY_LABELS_EN ? PWD_CATEGORY_LABELS_EN[cat] : (cat ?? "—");
  if (cat === "other" && m.pwdCategoryOther?.trim()) return m.pwdCategoryOther.trim();
  return label;
}

function safeZipPathSegment(s: string): string {
  return s.replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, " ").trim();
}

function formatHumanDate(iso: string): string {
  try {
    return format(parseISO(iso), "d MMMM yyyy");
  } catch {
    return iso;
  }
}

function dataUrlToBuffer(
  dataUrl: string
): { buffer: Buffer; ext: "jpg" | "png" } | null {
  const trimmed = dataUrl.trim();
  const m = /^data:image\/(jpeg|jpg|png);base64,(.+)$/i.exec(trimmed.replace(/\s/g, ""));
  if (!m) return null;
  const ext = m[1].toLowerCase() === "png" ? "png" : "jpg";
  try {
    const buffer = Buffer.from(m[2], "base64");
    if (buffer.length < 32) return null;
    return { buffer, ext };
  } catch {
    return null;
  }
}

/** jsPDF can return an empty/undefined ArrayBuffer after very large builds or a bad embed; fall back to data URI. */
function jspdfToBuffer(pdf: jsPDF): Buffer {
  const raw = pdf.output("arraybuffer") as ArrayBuffer | Uint8Array | undefined;
  if (raw instanceof ArrayBuffer && raw.byteLength > 0) {
    return Buffer.from(raw);
  }
  if (raw instanceof Uint8Array && raw.byteLength > 0) {
    return Buffer.from(raw);
  }
  const uri = String(pdf.output("datauristring") ?? "");
  const m = /^data:application\/pdf[^,]*;base64,(.+)$/i.exec(uri.replace(/\s/g, ""));
  if (m?.[1]) {
    try {
      const buf = Buffer.from(m[1], "base64");
      if (buf.length > 0) return buf;
    } catch {
      /* ignore */
    }
  }
  throw new Error(
    "PDF engine returned no bytes (export too large or a corrupted photo broke the document). Try filtering to fewer states or retry."
  );
}

function inferSex(member: MemberRecord): string {
  if (member.gender === "Male") return "male";
  if (member.gender === "Female") return "female";
  return FEMALE_TITLES.has(member.title) ? "female" : "male";
}

function memberDisplayName(member: MemberRecord): string {
  return [member.firstName, member.otherNames?.trim(), member.surname].filter(Boolean).join(" ");
}

function drawPageFrame(
  pdf: jsPDF,
  stateName: string,
  pageNumber: number,
  totalMembers: number,
  generatedAtUtc: string,
  partLabel?: string
) {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("SDP Members Report", 8, 10);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  const partSeg = partLabel ? ` | ${partLabel}` : "";
  pdf.text(`${stateName}${partSeg} | Page ${pageNumber} | ${totalMembers} total members`, 8, 15);

  let x = 8;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(6);
  pdf.setLineWidth(0.1);
  for (const col of PDF_COLUMNS) {
    pdf.rect(x, 18, col.width, 6);
    pdf.text(col.label, x + 0.8, 21.8);
    x += col.width;
  }

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6);
  pdf.text(`Generated ${generatedAtUtc} UTC`, 8, 292);
}

async function buildStateRegisterPdfBuffer(
  members: MemberRecord[],
  stateName: string,
  generatedAtUtc: string,
  pdfOpts: {
    snOffset: number;
    stateTotalMembers: number;
    partIndex: number;
    partCount: number;
  }
): Promise<Buffer> {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const { snOffset, stateTotalMembers, partIndex, partCount } = pdfOpts;
  const partLabel =
    partCount > 1 ? `Part ${partIndex} of ${partCount} (rows in this file)` : undefined;

  const lineHeight = 2.5;
  const pageBottom = 286;
  let pageNumber = 1;
  let y = 24;

  drawPageFrame(pdf, stateName, pageNumber, stateTotalMembers, generatedAtUtc, partLabel);

  members.forEach((member, index) => {
    const textCells = [
      String(snOffset + index + 1),
      memberDisplayName(member),
      inferSex(member),
      member.dateOfBirth || "",
      member.nin || "",
      member.address || "",
      getStateName(member.state),
      getLGAName(member.state, member.lga),
      getWardName(member.state, member.lga, member.ward),
      member.pollingUnit || "",
      formatInecPwd(member),
      "",
    ];

    const wrapped = textCells.map((text, colIndex) =>
      pdf.splitTextToSize(String(text), PDF_COLUMNS[colIndex]!.width - 1.6)
    );

    const parsedImage = member.portraitDataUrl ? dataUrlToBuffer(member.portraitDataUrl) : null;
    const textHeight = wrapped.reduce(
      (max, lines) => Math.max(max, Math.max(1, lines.length) * lineHeight + 1.5),
      10
    );
    const imageHeight = parsedImage ? 14 : 0;
    const rowHeight = Math.max(10, textHeight, imageHeight + 1.5);

    if (y + rowHeight > pageBottom) {
      pdf.addPage("a4", "portrait");
      pageNumber += 1;
      drawPageFrame(pdf, stateName, pageNumber, stateTotalMembers, generatedAtUtc, partLabel);
      y = 24;
    }

    let x = 8;
    wrapped.forEach((lines, colIndex) => {
      const width = PDF_COLUMNS[colIndex]!.width;
      pdf.rect(x, y, width, rowHeight);
      if (colIndex === PDF_COLUMNS.length - 1 && parsedImage) {
        try {
          const fmt = parsedImage.ext === "png" ? "PNG" : "JPEG";
          pdf.addImage(
            new Uint8Array(parsedImage.buffer),
            fmt,
            x + 1,
            y + 1,
            width - 2,
            rowHeight - 2
          );
        } catch {
          /* leave photo cell empty if embed fails */
        }
      } else if (lines.length > 0) {
        pdf.text(lines, x + 0.8, y + 2.6);
      }
      x += width;
    });

    y += rowHeight;
  });

  return jspdfToBuffer(pdf);
}

export async function buildInecRegisterZipBuffer(
  members: MemberRecord[],
  opts: {
    batchNum: number;
    dateFromIso: string;
    dateToIso: string;
  }
): Promise<{ buffer: Buffer; filename: string }> {
  if (members.length === 0) {
    throw new Error("No members to export.");
  }

  const { batchNum, dateFromIso, dateToIso } = opts;
  const zip = new JSZip();
  const rootName = safeZipPathSegment(
    `SDP-INEC_Batch${batchNum}_${dateFromIso}_to_${dateToIso}`
  );

  const byState = new Map<string, MemberRecord[]>();
  for (const m of members) {
    const list = byState.get(m.state) ?? [];
    list.push(m);
    byState.set(m.state, list);
  }

  const stateOrder = Array.from(byState.keys()).sort((a, b) =>
    getStateName(a).localeCompare(getStateName(b), undefined, { sensitivity: "base" })
  );

  const generatedAtUtc = format(new Date(), "yyyy-MM-dd HH:mm:ss");

  for (const stateId of stateOrder) {
    const list = byState.get(stateId)!;
    const code = STATE_ID_TO_INEC_BATCH_CODE[stateId] ?? stateId.slice(0, 2).toUpperCase();
    const stateName = getStateName(stateId);
    const baseStem = safeZipPathSegment(
      `Batch-${code}-${batchNum}_${stateName}_${dateFromIso}_to_${dateToIso}`
    );
    const parts = chunkMembers(list, INEC_PDF_MAX_MEMBERS_PER_FILE);
    let snOffset = 0;
    for (let pi = 0; pi < parts.length; pi++) {
      const part = parts[pi]!;
      const suffix =
        parts.length > 1 ? `_part${pi + 1}of${parts.length}` : "";
      const pdfName = safeZipPathSegment(`${baseStem}${suffix}.pdf`);
      const pdfBuf = await buildStateRegisterPdfBuffer(part, stateName, generatedAtUtc, {
        snOffset,
        stateTotalMembers: list.length,
        partIndex: pi + 1,
        partCount: parts.length,
      });
      zip.file(`${rootName}/${pdfName}`, pdfBuf);
      snOffset += part.length;
    }
  }

  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  if (!buffer || buffer.length === 0) {
    throw new Error("ZIP build returned empty output.");
  }

  const filename = safeZipPathSegment(
    `SDP-INEC_Batch${batchNum}_${dateFromIso}_to_${dateToIso}.zip`
  );

  return { buffer, filename };
}
