"use client";

import { Fragment, useState } from "react";
import { adminGetPortalBulkUploadDownloadUrl } from "@/app/actions/adminPortalBulkUploads";
import type { PortalBulkUploadRow } from "@/lib/db/portal-bulk-uploads";
import { Button } from "@/components/ui/button";
import { Download, Loader2, ChevronDown, ChevronRight } from "lucide-react";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function AdminPortalBulkUploadsClient({
  initialUploads,
}: {
  initialUploads: PortalBulkUploadRow[];
}) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleDownload = async (id: string) => {
    setDownloadError(null);
    setDownloadingId(id);
    try {
      const res = await adminGetPortalBulkUploadDownloadUrl(id);
      if (!res.ok) {
        setDownloadError(res.error);
        return;
      }
      const a = document.createElement("a");
      a.href = res.url;
      a.download = res.filename;
      a.rel = "noopener noreferrer";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Bulk uploads</h1>
        <p className="mt-1 text-sm text-neutral-600 max-w-2xl">
          Files submitted by agent and cluster portals for national office review. Download
          the original spreadsheet; row-check hints are advisory only (see report JSON).
        </p>
      </div>

      {downloadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {downloadError}
        </div>
      )}

      {initialUploads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-600">
          No portal uploads yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-medium uppercase tracking-wide text-neutral-600">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Uploaded by</th>
                <th className="px-4 py-3">File</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Rows (report)</th>
                <th className="px-4 py-3 w-40">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {initialUploads.map((u) => {
                const summary = u.validation_summary ?? {};
                const parsedOk =
                  typeof summary.parsedOk === "boolean" ? summary.parsedOk : true;
                const parseError =
                  typeof summary.parseError === "string" ? summary.parseError : null;
                const rowsWithIssues =
                  typeof summary.rowsWithIssues === "number"
                    ? summary.rowsWithIssues
                    : null;
                const isOpen = expandedId === u.id;
                return (
                  <Fragment key={u.id}>
                    <tr className="hover:bg-neutral-50/80">
                      <td className="px-4 py-3 whitespace-nowrap text-neutral-800">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="px-4 py-3 capitalize text-neutral-700">
                        {u.portal_role}
                      </td>
                      <td className="px-4 py-3 text-neutral-700 break-all max-w-[200px]">
                        {u.uploaded_by_email || "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-neutral-900 break-all max-w-[240px]">
                        {u.original_filename}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {formatBytes(u.byte_size)}
                      </td>
                      <td className="px-4 py-3 text-neutral-700">
                        {u.data_row_count != null ? u.data_row_count : "—"}
                        {!parsedOk && parseError && (
                          <span className="ml-1 text-amber-700" title={parseError}>
                            (parse note)
                          </span>
                        )}
                        {rowsWithIssues != null && rowsWithIssues > 0 && (
                          <span className="ml-1 text-neutral-500">
                            · {rowsWithIssues} w/ hints
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="default"
                            className="min-h-9"
                            disabled={downloadingId === u.id}
                            onClick={() => void handleDownload(u.id)}
                          >
                            {downloadingId === u.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Download className="mr-1.5 h-4 w-4" />
                                Download
                              </>
                            )}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="min-h-9"
                            onClick={() =>
                              setExpandedId(isOpen ? null : u.id)
                            }
                            aria-expanded={isOpen}
                          >
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <span className="sr-only">Toggle report</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-neutral-50">
                        <td colSpan={7} className="px-4 py-3">
                          <p className="text-xs font-medium text-neutral-600 mb-2">
                            Validation / row-hint summary (JSON)
                          </p>
                          <pre className="max-h-64 overflow-auto rounded border border-neutral-200 bg-white p-3 text-xs font-mono text-neutral-800 whitespace-pre-wrap break-all">
                            {JSON.stringify(u.validation_summary, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
