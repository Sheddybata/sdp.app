"use client";

import { useState } from "react";
import { adminCreatePortalInvite } from "@/app/actions/portalInvites";
import type { PortalInviteListRow } from "@/lib/db/portal-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Loader2 } from "lucide-react";

export function AdminPortalInvitesClient({
  initialInvites,
}: {
  initialInvites: PortalInviteListRow[];
}) {
  const [invites, setInvites] = useState(initialInvites);
  const [role, setRole] = useState<"agent" | "cluster">("agent");
  const [note, setNote] = useState("");
  const [expiresAtDate, setExpiresAtDate] = useState("");
  const [lastPlainCode, setLastPlainCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLastPlainCode(null);
    setLoading(true);
    const result = await adminCreatePortalInvite({
      role,
      note: note.trim() || undefined,
      expiresAtDate: expiresAtDate.trim() || undefined,
    });
    setLoading(false);
    if (result.ok) {
      setLastPlainCode(result.plainCode);
      setInvites((prev) => [
        {
          id: result.id,
          role,
          note: note.trim() || null,
          expires_at: expiresAtDate ? `${expiresAtDate}T23:59:59.999Z` : null,
          used_at: null,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setNote("");
      setExpiresAtDate("");
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Portal invitations</h1>
        <p className="mt-1 text-sm text-neutral-600 max-w-2xl">
          Generate single-use codes for field agents and cluster leads to create their own
          accounts. Copy the code once — it is not stored in plain text.
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="max-w-xl space-y-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
      >
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}
        {lastPlainCode && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
            <p className="font-medium text-emerald-950">New invitation code (copy now):</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 rounded bg-white px-3 py-2 font-mono text-base tracking-wide border border-emerald-200">
                {lastPlainCode}
              </code>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={() => navigator.clipboard.writeText(lastPlainCode)}
                aria-label="Copy code"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Portal</Label>
          <Select value={role} onValueChange={(v) => setRole(v as "agent" | "cluster")}>
            <SelectTrigger className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="agent">Agent portal</SelectItem>
              <SelectItem value="cluster">Cluster portal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="invite-note">Note (optional)</Label>
          <Input
            id="invite-note"
            placeholder="e.g. Lagos coordinator — March 2026"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="invite-exp">Expires (optional)</Label>
          <Input
            id="invite-exp"
            type="date"
            value={expiresAtDate}
            onChange={(e) => setExpiresAtDate(e.target.value)}
            disabled={loading}
          />
          <p className="text-xs text-neutral-500">Leave empty for no expiry.</p>
        </div>

        <Button type="submit" disabled={loading} className="min-h-[44px]">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating…
            </>
          ) : (
            "Generate invitation code"
          )}
        </Button>
      </form>

      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
        <h2 className="border-b border-neutral-200 px-4 py-3 text-base font-semibold">
          Recent codes
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
                <th className="px-4 py-2 font-medium">Portal</th>
                <th className="px-4 py-2 font-medium">Note</th>
                <th className="px-4 py-2 font-medium">Created</th>
                <th className="px-4 py-2 font-medium">Expires</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="text-neutral-800">
              {invites.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                    No invitations yet.
                  </td>
                </tr>
              ) : (
                invites.map((row) => (
                  <tr key={row.id} className="border-b border-neutral-100">
                    <td className="px-4 py-3 capitalize">{row.role}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate" title={row.note ?? ""}>
                      {row.note ?? "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-neutral-600">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-neutral-600">
                      {row.expires_at
                        ? new Date(row.expires_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {row.used_at ? (
                        <span className="text-neutral-500">Used</span>
                      ) : (
                        <span className="font-medium text-emerald-700">Unused</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
