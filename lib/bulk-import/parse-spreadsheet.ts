import * as XLSX from "xlsx";

/** Turn Excel serial date or other cell values into strings for CSV-like processing. */
function excelCellToString(cell: unknown): string {
  if (cell === null || cell === undefined) return "";
  if (typeof cell === "number" && Number.isFinite(cell)) {
    if (cell > 20000 && cell < 100000) {
      try {
        const u = XLSX.SSF.parse_date_code(cell);
        if (u && u.y >= 1900 && u.y <= 2100) {
          return `${u.y}-${String(u.m).padStart(2, "0")}-${String(u.d).padStart(2, "0")}`;
        }
      } catch {
        /* not a date serial */
      }
    }
    return String(cell);
  }
  if (typeof cell === "boolean") return cell ? "TRUE" : "FALSE";
  return String(cell).trim();
}

/** Parse CSV text to a matrix of strings (first row = headers). */
export function parseCsvToMatrix(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return lines.map((line) => parseCsvLine(line));
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && c === ",") {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

/** Parse first worksheet of .xlsx / .xls to string matrix. */
export function parseExcelToMatrix(buffer: ArrayBuffer): string[][] {
  const wb = XLSX.read(buffer, { type: "array" });
  const name = wb.SheetNames[0];
  if (!name) return [];
  const sh = wb.Sheets[name];
  if (!sh) return [];
  const aoa = XLSX.utils.sheet_to_json<(string | number | boolean | null | undefined)[]>(
    sh,
    { header: 1, defval: "", blankrows: false }
  );
  return aoa.map((row) => {
    if (!Array.isArray(row)) return [];
    return row.map((cell) => excelCellToString(cell));
  });
}
