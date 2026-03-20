"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  LogOut,
  UserPlus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { portalLogout } from "@/app/actions/portalAuth";
import { previewBulkMemberImport, type BulkPreviewResult } from "@/app/actions/bulkImport";
import { submitPortalBulkForReview } from "@/app/actions/portalBulkSubmit";
import { BULK_IMPORT_MAX_ROWS } from "@/lib/bulk-import/constants";
import { parseCsvToMatrix, parseExcelToMatrix } from "@/lib/bulk-import/parse-spreadsheet";
import { sheetToRecords } from "@/lib/bulk-import/normalize-row";
import { downloadSampleCsv, downloadSampleXlsx } from "@/lib/bulk-import/download-templates";

type PortalVariant = "agent" | "cluster";

const variantStyles: Record<
  PortalVariant,
  { accent: string; accentSoft: string; button: string; dragActive: string }
> = {
  agent: {
    accent: "text-sdp-primary",
    accentSoft: "bg-sdp-primary/10 border-sdp-primary/20",
    button: "bg-sdp-primary hover:bg-sdp-primary/90",
    dragActive: "border-sdp-primary bg-sdp-primary/5",
  },
  cluster: {
    accent: "text-sdp-accent",
    accentSoft: "bg-sdp-accent/10 border-sdp-accent/25",
    button: "bg-sdp-accent hover:bg-[#018f4e]",
    dragActive: "border-sdp-accent bg-sdp-accent/5",
  },
};

export function BulkPortalDashboard({
  variant,
  title,
  loginPath,
}: {
  variant: PortalVariant;
  title: string;
  loginPath: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const s = variantStyles[variant];
  const [dragActive, setDragActive] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rawRows, setRawRows] = useState<Record<string, string>[] | null>(null);
  const [parseHint, setParseHint] = useState<string | null>(null);
  const [preview, setPreview] = useState<Extract<BulkPreviewResult, { ok: true }> | null>(
    null
  );
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<
    | { ok: true; message: string; summary: { dataRowCount: number; rowsWithIssues: number; parsedOk: boolean } }
    | { ok: false; error: string }
    | null
  >(null);
  const [loadingParse, setLoadingParse] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  const handleSignOut = () => {
    startTransition(async () => {
      await portalLogout();
      router.push(loginPath);
      router.refresh();
    });
  };

  const ingestFile = useCallback(async (f: File) => {
    setPendingFile(f);
    setFileName(f.name);
    setParseHint(null);
    setRawRows(null);
    setPreview(null);
    setPreviewError(null);
    setSubmitResult(null);
    setLoadingParse(true);
    try {
      const lower = f.name.toLowerCase();
      if (!lower.endsWith(".csv") && !lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
        setParseHint("Use .csv, .xlsx, or .xls. You can still try submitting for HQ review.");
        setLoadingParse(false);
        return;
      }
      let matrix: string[][];
      if (lower.endsWith(".csv")) {
        const text = await f.text();
        matrix = parseCsvToMatrix(text);
      } else {
        const buf = await f.arrayBuffer();
        matrix = parseExcelToMatrix(buf);
      }
      const recs = sheetToRecords(matrix);
      if (recs.length === 0) {
        setParseHint(
          "No data rows found in preview (check header row). You can still submit the file — national office will review it."
        );
        setRawRows(null);
        return;
      }
      if (recs.length > BULK_IMPORT_MAX_ROWS) {
        setParseHint(
          `This file has ${recs.length} rows (preview uses the first ${BULK_IMPORT_MAX_ROWS} for optional checks). The full file will be submitted.`
        );
        setRawRows(recs.slice(0, BULK_IMPORT_MAX_ROWS));
        return;
      }
      setRawRows(recs);
    } catch (e) {
      setParseHint(
        e instanceof Error
          ? `${e.message} — optional preview failed; you can still submit the original file for HQ.`
          : "Preview failed; you can still submit the file for HQ."
      );
      setRawRows(null);
    } finally {
      setLoadingParse(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const f = e.dataTransfer.files?.[0];
      if (f) void ingestFile(f);
    },
    [ingestFile]
  );

  const onFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) void ingestFile(f);
      e.target.value = "";
    },
    [ingestFile]
  );

  const runPreview = async () => {
    if (!rawRows?.length) return;
    setLoadingPreview(true);
    setPreviewError(null);
    try {
      const res = await previewBulkMemberImport(rawRows);
      if (!res || typeof res !== "object" || !("ok" in res)) {
        setPreviewError("Unexpected response from server. Refresh and try again.");
        setPreview(null);
        return;
      }
      if (!res.ok) {
        setPreviewError(res.error);
        setPreview(null);
        return;
      }
      setPreview(res);
    } catch (e) {
      setPreviewError(
        e instanceof Error ? e.message : "Preview failed. Check your connection."
      );
      setPreview(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const runSubmit = async () => {
    if (!pendingFile) return;
    setLoadingSubmit(true);
    setSubmitResult(null);
    try {
      const fd = new FormData();
      fd.append("file", pendingFile);
      const res = await submitPortalBulkForReview(fd);
      if (!res || typeof res !== "object" || !("ok" in res)) {
        setSubmitResult({
          ok: false,
          error: "Unexpected response. Refresh and try again.",
        });
        return;
      }
      if (!res.ok) {
        setSubmitResult({ ok: false, error: res.error });
        return;
      }
      setSubmitResult({
        ok: true,
        message: res.message,
        summary: res.summary,
      });
      setPreview(null);
    } catch (e) {
      setSubmitResult({
        ok: false,
        error: e instanceof Error ? e.message : "Submit failed. Check your connection.",
      });
    } finally {
      setLoadingSubmit(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
            <span className="text-neutral-300" aria-hidden>
              |
            </span>
            <h1 className={cn("text-lg font-semibold", s.accent)}>{title}</h1>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[40px]"
            disabled={isPending}
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {isPending ? "Signing out…" : "Sign out"}
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm text-neutral-800",
            s.accentSoft
          )}
        >
          <p className="flex items-start gap-2">
            <AlertCircle className={cn("h-5 w-5 shrink-0 mt-0.5", s.accent)} />
            <span>
              <strong>Submit lists to the national office:</strong> Your CSV or Excel file
              is stored securely for HQ to download from the admin portal. It is{" "}
              <strong>not</strong> added to the member database automatically — so typos or
              incomplete rows are not “rejected”; HQ corrects and registers members in their
              own process. We still attach an automatic <strong>row check report</strong>{" "}
              (hints only) to help reviewers.
            </span>
          </p>
        </div>

        <section
          className={cn(
            "rounded-xl border bg-white p-6 shadow-sm",
            variant === "agent"
              ? "border-sdp-primary/25"
              : "border-sdp-accent/25"
          )}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-neutral-900 flex items-center gap-2">
                <UserPlus className={cn("h-5 w-5", s.accent)} aria-hidden />
                Register one member
              </h2>
              <p className="mt-1 text-sm text-neutral-600 max-w-xl">
                Full online enrollment with photo and ID — creates a member record directly.
              </p>
            </div>
            <Button
              className={cn("min-h-[44px] shrink-0 text-white", s.button)}
              asChild
            >
              <Link
                href={variant === "agent" ? "/agent/register" : "/cluster/register"}
              >
                Start registration
              </Link>
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-neutral-900">
            Submit member list (file only)
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            <strong>.csv</strong> or <strong>.xlsx</strong> / <strong>.xls</strong>, max{" "}
            <strong>25 MB</strong>. Use the templates for column hints. Dates:{" "}
            <strong>YYYY-MM-DD</strong> or <strong>DD/MM/YYYY</strong>.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px]"
              onClick={() =>
                downloadSampleCsv(
                  variant === "agent"
                    ? "sdp-agent-upload-template.csv"
                    : "sdp-cluster-upload-template.csv"
                )
              }
            >
              <Download className="mr-2 h-4 w-4" />
              Download CSV template
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px]"
              onClick={() =>
                downloadSampleXlsx(
                  variant === "agent"
                    ? "sdp-agent-upload-template.xlsx"
                    : "sdp-cluster-upload-template.xlsx"
                )
              }
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Download Excel template
            </Button>
          </div>

          <div
            className={cn(
              "mt-6 flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors",
              dragActive
                ? s.dragActive
                : "border-neutral-300 bg-neutral-50/80 hover:border-neutral-400"
            )}
            onDragEnter={() => setDragActive(true)}
            onDragLeave={() => setDragActive(false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            onClick={() => document.getElementById("bulk-file-input")?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                document.getElementById("bulk-file-input")?.click();
            }}
            aria-label="Drop file or click to choose"
          >
            <Upload className={cn("h-10 w-10", s.accent)} />
            <p className="mt-3 text-sm font-medium text-neutral-900">
              Drag & drop CSV or Excel here
            </p>
            <p className="mt-1 text-xs text-neutral-500">or click to browse</p>
            <input
              id="bulk-file-input"
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={onFile}
            />
          </div>

          {loadingParse && (
            <p className="mt-4 flex items-center gap-2 text-sm text-neutral-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Reading file…
            </p>
          )}

          {parseHint && (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              {parseHint}
            </p>
          )}

          {pendingFile && fileName && (
            <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-neutral-700">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-sdp-accent" />
              <span>
                Selected: <span className="font-mono">{fileName}</span>
                {rawRows && (
                  <>
                    {" "}
                    — <strong>{rawRows.length}</strong> row
                    {rawRows.length === 1 ? "" : "s"} in preview
                  </>
                )}
              </span>
            </p>
          )}

          {previewError && (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {previewError}
            </p>
          )}

          {preview && (
            <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm">
              <p className="font-medium text-neutral-900">Optional server preview (hints)</p>
              <ul className="mt-2 list-inside list-disc text-neutral-700 space-y-1">
                <li>
                  Rows that look OK: <strong>{preview.validCount}</strong>
                </li>
                <li>
                  Rows with possible issues: <strong>{preview.invalidCount}</strong>
                </li>
              </ul>
              <p className="mt-2 text-xs text-neutral-600">
                This does not block your upload — national office still receives your file.
              </p>
              {preview.issues.length > 0 && (
                <div className="mt-3 max-h-40 overflow-y-auto rounded border border-neutral-200 bg-white p-2 text-xs font-mono">
                  {preview.issues.slice(0, 20).map((issue) => (
                    <div key={issue.rowIndex} className="mb-2 border-b border-neutral-100 pb-2 last:border-0">
                      Row {issue.rowIndex}: {issue.errors.join("; ")}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {submitResult?.ok && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
              <p className="font-medium">Submitted</p>
              <p className="mt-1">{submitResult.message}</p>
              <ul className="mt-2 list-inside list-disc text-sm">
                <li>
                  Rows detected in file (report): <strong>{submitResult.summary.dataRowCount}</strong>
                </li>
                <li>
                  Rows with hints in report: <strong>{submitResult.summary.rowsWithIssues}</strong>
                </li>
              </ul>
            </div>
          )}

          {submitResult && !submitResult.ok && (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {submitResult.error}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              type="button"
              className={cn("min-h-[44px] text-white", s.button)}
              disabled={!pendingFile || loadingSubmit || loadingParse}
              onClick={() => void runSubmit()}
            >
              {loadingSubmit ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit file to national office"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px]"
              disabled={!rawRows?.length || loadingPreview || loadingParse}
              onClick={() => void runPreview()}
            >
              {loadingPreview ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking…
                </>
              ) : (
                "Optional: preview row hints"
              )}
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-neutral-900">After you submit</h2>
          <p className="mt-1 text-sm text-neutral-600">
            An administrator signs in at <strong>/admin</strong> →{" "}
            <strong>Bulk uploads</strong>, downloads your file, and processes members using
            the usual registration workflow.
          </p>
        </section>
      </div>
    </main>
  );
}
