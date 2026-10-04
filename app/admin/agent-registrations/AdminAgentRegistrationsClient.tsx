"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BadgeCheck, ChevronLeft, ChevronRight, IdCard, Loader2, Map as MapIcon, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { formatVoterIdDisplay } from "@/lib/enrollment-schema";
import { AGENT_LEVEL_LABELS, formatLocationPick } from "@/lib/agent-registration-schema";
import type { AgentRegistrationRecord, PortalUserStatus } from "@/lib/db/agent-registrations";
import {
  adminSetAgentRegistrationStatus,
  fetchAgentRegistrationDetail,
} from "@/app/actions/adminAgentRegistrations";
import { agentCardFileName, renderAgentCardJpeg } from "@/lib/agent-cards-export";
import { AgentIdCardsDialog } from "./AgentIdCardsDialog";

type Filter = PortalUserStatus | "all";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
];

const STATUS_STYLES: Record<PortalUserStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
};

const PAGE_SIZE = 50;

function fullName(r: AgentRegistrationRecord): string {
  return [r.firstName, r.middleName, r.surname].filter(Boolean).join(" ");
}

function assignmentText(r: AgentRegistrationRecord): string {
  const parts = [
    r.assignedPollingUnitName,
    r.assignedWardName,
    r.assignedLgaName,
    r.assignedStateName,
  ].filter(Boolean);
  const text = parts.join(", ");
  return r.assignedCode ? `${text} (${r.assignedCode})` : text;
}

function matchesSearch(r: AgentRegistrationRecord, q: string): boolean {
  if (!q) return true;
  return [fullName(r), r.email, r.phone, r.nin ?? "", r.sdpMembershipId, r.voterIdentificationNumber, assignmentText(r)]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

function StatusBadge({ status }: { status: PortalUserStatus }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
        STATUS_STYLES[status]
      )}
    >
      {status}
    </span>
  );
}

export function AdminAgentRegistrationsClient({
  initialRegistrations,
}: {
  initialRegistrations: AgentRegistrationRecord[];
}) {
  const [registrations, setRegistrations] = useState(initialRegistrations);
  const [filter, setFilter] = useState<Filter>("pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AgentRegistrationRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [note, setNote] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cardsOpen, setCardsOpen] = useState(false);
  const [cardBusy, setCardBusy] = useState(false);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { pending: 0, approved: 0, rejected: 0, all: registrations.length };
    for (const r of registrations) c[r.status] += 1;
    return c;
  }, [registrations]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return registrations.filter((r) => (filter === "all" || r.status === filter) && matchesSearch(r, q));
  }, [registrations, filter, search]);

  /** ID cards are only issued to approved agents; the search box narrows them further. */
  const cardAgents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return registrations.filter((r) => r.status === "approved" && matchesSearch(r, q));
  }, [registrations, search]);

  const downloadOneCard = async () => {
    if (!selected) return;
    setCardBusy(true);
    try {
      const jpeg = await renderAgentCardJpeg(selected, selected.photoDataUrl);
      const a = document.createElement("a");
      a.href = jpeg;
      a.download = agentCardFileName(selected);
      a.click();
    } catch (e) {
      console.error("[agent card] download failed:", e);
      setActionError("Could not create the ID card. Please try again.");
    } finally {
      setCardBusy(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => setPage(1), [filter, search]);

  const selectedId = selected?.id;
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setDetailLoading(true);
    setNote("");
    setActionError(null);
    void fetchAgentRegistrationDetail(selectedId)
      .then((full) => {
        if (!cancelled && full) setSelected(full);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const review = async (status: "approved" | "rejected") => {
    if (!selected) return;
    setActionBusy(true);
    setActionError(null);
    const result = await adminSetAgentRegistrationStatus({ userId: selected.userId, status, note });
    setActionBusy(false);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    const patch = { status, reviewNote: note.trim() || null, reviewedAt: new Date().toISOString() };
    setRegistrations((list) => list.map((r) => (r.id === selected.id ? { ...r, ...patch } : r)));
    setSelected((s) => (s ? { ...s, ...patch } : s));
  };

  const docs: [string, string | null][] = selected
    ? [
        ["Photo", selected.photoDataUrl],
        ["Membership ID card", selected.membershipIdCardDataUrl],
        ["PVC", selected.pvcDataUrl],
      ]
    : [];

  const detailRows: [string, string][] = selected
    ? [
        ["Agent type", AGENT_LEVEL_LABELS[selected.agentLevel]],
        ["Assigned to", assignmentText(selected)],
        ["Phone", selected.phone],
        ["Email", selected.email],
        ["NIN", selected.nin ?? "—"],
        ["Voter registration number", formatVoterIdDisplay(selected.voterIdentificationNumber)],
        ["SDP membership ID", selected.sdpMembershipId],
        ["Agent's polling unit", formatLocationPick(selected.agentPollingUnit)],
        ["Agent voting unit", formatLocationPick(selected.agentVotingUnit)],
        ["Polling unit (name/code)", formatLocationPick(selected.pollingUnit)],
        ["Declaration accepted", selected.acknowledgedAt.slice(0, 16).replace("T", " ")],
        ["Registered", selected.createdAt.slice(0, 16).replace("T", " ")],
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Agent registrations</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Agents who registered themselves. Approve them to let them sign in to the agent portal.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button asChild variant="outline" className="min-h-[44px]">
            <Link href="/admin/agent-coverage">
              <MapIcon className="h-4 w-4" />
              Coverage by state
            </Link>
          </Button>
          <Button
            type="button"
            className="min-h-[44px] shrink-0 bg-sdp-primary text-white hover:bg-[#e0752a]"
            onClick={() => setCardsOpen(true)}
            disabled={cardAgents.length === 0}
            title={cardAgents.length === 0 ? "Approve agents first to issue ID cards" : undefined}
          >
            <IdCard className="h-4 w-4" />
            Download all ID cards ({cardAgents.length})
          </Button>
        </div>
      </div>

      <AgentIdCardsDialog open={cardsOpen} onOpenChange={setCardsOpen} agents={cardAgents} />

      <div className="flex flex-wrap gap-2 rounded-xl border border-neutral-200 bg-white p-2 shadow-sm">
        {FILTERS.map((f) => (
          <Button
            key={f.id}
            type="button"
            variant={filter === f.id ? "default" : "ghost"}
            className={filter === f.id ? "min-h-[44px] bg-sdp-primary" : "min-h-[44px]"}
            onClick={() => setFilter(f.id)}
          >
            {f.label} ({counts[f.id]})
          </Button>
        ))}
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="max-w-md space-y-2">
          <Label htmlFor="agent-search">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              id="agent-search"
              placeholder="Name, email, phone, NIN, membership ID, location"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-h-[44px] pl-9"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50">
              <tr>
                <th className="px-4 py-3 font-semibold text-neutral-700">Name</th>
                <th className="px-4 py-3 font-semibold text-neutral-700">Agent type</th>
                <th className="px-4 py-3 font-semibold text-neutral-700">Assigned to</th>
                <th className="px-4 py-3 font-semibold text-neutral-700">Phone</th>
                <th className="px-4 py-3 font-semibold text-neutral-700">Registered</th>
                <th className="px-4 py-3 font-semibold text-neutral-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <p className="font-medium text-neutral-900">No agent registrations here</p>
                    <p className="mt-1 text-sm text-neutral-600">
                      Registrations from <span className="font-mono">/agent/apply</span> appear here
                      after you run migration <code className="rounded bg-neutral-100 px-1">015_agent_registrations</code>.
                    </p>
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => (
                  <tr
                    key={r.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelected(r)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelected(r);
                      }
                    }}
                    className="min-h-[44px] cursor-pointer hover:bg-sdp-primary/5 focus:bg-sdp-primary/5 focus:outline-none"
                    aria-label={`Review ${fullName(r)}`}
                  >
                    <td className="px-4 py-3 font-medium text-neutral-900">{fullName(r)}</td>
                    <td className="px-4 py-3 text-neutral-600">{AGENT_LEVEL_LABELS[r.agentLevel]}</td>
                    <td className="px-4 py-3 text-neutral-600">{assignmentText(r)}</td>
                    <td className="px-4 py-3 font-mono text-neutral-700">{r.phone}</td>
                    <td className="px-4 py-3 text-neutral-600">{r.createdAt.slice(0, 10)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-neutral-200 bg-neutral-50 px-4 py-3">
            <div className="text-sm text-neutral-600">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="min-h-[44px]"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="min-h-[44px]"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent
          side="right"
          className="flex w-full min-w-0 max-w-full flex-col gap-0 overflow-y-auto overflow-x-hidden p-0"
        >
          {selected && (
            <>
              <SheetHeader className="sticky top-0 z-10 shrink-0 space-y-0 border-b border-neutral-200 bg-white px-4 py-3 sm:px-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <SheetTitle className="text-left text-base leading-snug sm:text-lg">
                      {fullName(selected)}
                    </SheetTitle>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <StatusBadge status={selected.status} />
                      {selected.memberId ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                          <BadgeCheck className="h-3.5 w-3.5" />
                          Verified SDP member
                        </span>
                      ) : (
                        <span className="inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600">
                          Not linked to a member record
                        </span>
                      )}
                    </div>
                  </div>
                  <SheetClose asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0 border-neutral-300"
                      aria-label="Close"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </SheetClose>
                </div>
              </SheetHeader>

              <div className="min-w-0 flex-1 space-y-6 px-4 py-4 sm:px-6 sm:py-6">
                {detailLoading ? (
                  <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-lg border border-neutral-100 bg-neutral-50">
                    <Loader2 className="h-8 w-8 animate-spin text-sdp-primary" />
                    <span className="text-xs text-neutral-500">Loading documents…</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {docs.map(([label, src]) => (
                      <figure key={label} className="space-y-1">
                        {src ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={src}
                            alt={label}
                            className="h-40 w-full rounded-lg border border-neutral-200 bg-white object-contain"
                          />
                        ) : (
                          <div className="flex h-32 items-center justify-center rounded-lg border border-neutral-200 text-xs text-neutral-400">
                            Not available
                          </div>
                        )}
                        <figcaption className="text-xs font-medium text-neutral-600">{label}</figcaption>
                      </figure>
                    ))}
                  </div>
                )}

                {selected.status === "approved" ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[44px] w-full border-sdp-primary/40 text-sdp-primary hover:bg-sdp-primary/5"
                    onClick={downloadOneCard}
                    disabled={cardBusy || detailLoading}
                  >
                    {cardBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <IdCard className="h-4 w-4" />}
                    Download ID card
                  </Button>
                ) : null}

                <dl className="min-w-0 space-y-4 text-sm">
                  {detailRows.map(([label, value]) => (
                    <div
                      key={label}
                      className="grid min-w-0 gap-1 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] sm:gap-x-3"
                    >
                      <dt className="shrink-0 font-medium text-neutral-500">{label}</dt>
                      <dd className="min-w-0 break-words font-medium text-neutral-900">{value || "—"}</dd>
                    </div>
                  ))}
                </dl>

                <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <h3 className="text-sm font-semibold text-neutral-900">Review</h3>
                  {selected.reviewedAt ? (
                    <p className="text-xs text-neutral-600">
                      Last reviewed {selected.reviewedAt.slice(0, 16).replace("T", " ")}
                      {selected.reviewNote ? ` — "${selected.reviewNote}"` : ""}
                    </p>
                  ) : null}
                  <div className="space-y-1.5">
                    <Label htmlFor="review-note">Note (optional)</Label>
                    <Input
                      id="review-note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. Documents verified"
                      className="min-h-[44px] bg-white"
                      maxLength={300}
                    />
                  </div>
                  {actionError ? (
                    <p className="text-sm text-red-600" role="alert">
                      {actionError}
                    </p>
                  ) : null}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      className="min-h-[44px] flex-1 bg-sdp-accent text-white hover:bg-[#018f4e]"
                      disabled={actionBusy || selected.status === "approved"}
                      onClick={() => review("approved")}
                    >
                      {actionBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Approve
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-[44px] flex-1 border-red-300 text-red-700 hover:bg-red-50"
                      disabled={actionBusy || selected.status === "rejected"}
                      onClick={() => review("rejected")}
                    >
                      Reject
                    </Button>
                  </div>
                  <p className="text-xs text-neutral-500">
                    Approved agents can sign in at <span className="font-mono">/agent/login</span> with the
                    email and password they registered with. Rejecting blocks sign-in.
                  </p>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
