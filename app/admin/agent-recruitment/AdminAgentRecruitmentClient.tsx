"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Copy, KeyRound, Loader2, RefreshCw, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  adminGenerateMissingAroCodes,
  adminGenerateMissingStateCodes,
  adminRevokeAroCode,
  adminRevokeNamedCode,
  adminRevokeStateCode,
  adminRotateAroCode,
  adminRotateStateCode,
  adminSetNamedCodePlain,
} from "@/app/actions/agentRecruitment";
import type { AgentRecruitmentOfficer } from "@/lib/db/agent-recruitment";
import type { AgentStateRecruitmentCode } from "@/lib/db/agent-state-recruitment";
import type { AgentNamedRecruitmentCode } from "@/lib/db/agent-named-recruitment";
import { titleCaseStateName } from "@/lib/inec-states";

type Stats = Awaited<ReturnType<typeof import("@/lib/db/agent-recruitment").getAroRegistrationStats>>;

export function AdminAgentRecruitmentClient({
  initialOfficers,
  initialStateCodes,
  initialNamedCodes,
  initialStats,
}: {
  initialOfficers: AgentRecruitmentOfficer[];
  initialStateCodes: AgentStateRecruitmentCode[];
  initialNamedCodes: AgentNamedRecruitmentCode[];
  initialStats: Stats;
}) {
  const [officers, setOfficers] = useState(initialOfficers);
  const [stateCodes, setStateCodes] = useState(initialStateCodes);
  const [namedCodes, setNamedCodes] = useState(initialNamedCodes);
  const [stats] = useState(initialStats);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<number, string>>({});
  const [revealedStates, setRevealedStates] = useState<Record<string, string>>({});
  const [revealedNamed, setRevealedNamed] = useState<Record<string, string>>({});
  const [batchCodes, setBatchCodes] = useState<{ officerNumber: number; plainCode: string }[] | null>(
    null
  );
  const [stateBatchCodes, setStateBatchCodes] = useState<
    { stateId: string; stateName: string; plainCode: string }[] | null
  >(null);

  const missingCodes = useMemo(
    () => officers.filter((o) => !o.hasCode || o.status !== "active").length,
    [officers]
  );
  const missingStateCodes = useMemo(
    () => stateCodes.filter((c) => !c.hasCode || c.status !== "active").length,
    [stateCodes]
  );

  const refreshOfficers = (patch: Partial<AgentRecruitmentOfficer> & { officerNumber: number }) => {
    setOfficers((prev) =>
      prev.map((o) => (o.officerNumber === patch.officerNumber ? { ...o, ...patch } : o))
    );
  };

  const refreshStateCode = (
    patch: Partial<AgentStateRecruitmentCode> & { stateId: string }
  ) => {
    setStateCodes((prev) =>
      prev.map((c) => (c.stateId === patch.stateId ? { ...c, ...patch } : c))
    );
  };

  const generateMissing = async () => {
    setBusy("batch");
    setError(null);
    setBatchCodes(null);
    const result = await adminGenerateMissingAroCodes();
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setBatchCodes(result.codes);
    const map: Record<number, string> = {};
    for (const c of result.codes) {
      map[c.officerNumber] = c.plainCode;
      refreshOfficers({
        officerNumber: c.officerNumber,
        hasCode: true,
        status: "active",
        codeGeneratedAt: new Date().toISOString(),
      });
    }
    setRevealed((r) => ({ ...r, ...map }));
  };

  const generateMissingStates = async () => {
    setBusy("state-batch");
    setError(null);
    setStateBatchCodes(null);
    const result = await adminGenerateMissingStateCodes();
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setStateBatchCodes(result.codes);
    const map: Record<string, string> = {};
    for (const c of result.codes) {
      map[c.stateId] = c.plainCode;
      refreshStateCode({
        stateId: c.stateId,
        hasCode: true,
        status: "active",
        codeGeneratedAt: new Date().toISOString(),
      });
    }
    setRevealedStates((r) => ({ ...r, ...map }));
  };

  const rotate = async (officerNumber: number) => {
    setBusy(`rotate-${officerNumber}`);
    setError(null);
    const result = await adminRotateAroCode(officerNumber);
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRevealed((r) => ({ ...r, [officerNumber]: result.plainCode }));
    refreshOfficers({
      officerNumber,
      hasCode: true,
      status: "active",
      codeGeneratedAt: new Date().toISOString(),
    });
  };

  const revoke = async (officerNumber: number) => {
    setBusy(`revoke-${officerNumber}`);
    setError(null);
    const result = await adminRevokeAroCode(officerNumber);
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRevealed((r) => {
      const next = { ...r };
      delete next[officerNumber];
      return next;
    });
    refreshOfficers({ officerNumber, status: "revoked" });
  };

  const rotateState = async (stateId: string) => {
    setBusy(`state-rotate-${stateId}`);
    setError(null);
    const result = await adminRotateStateCode(stateId);
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRevealedStates((r) => ({ ...r, [stateId]: result.plainCode }));
    refreshStateCode({
      stateId,
      hasCode: true,
      status: "active",
      codeGeneratedAt: new Date().toISOString(),
    });
  };

  const revokeState = async (stateId: string) => {
    setBusy(`state-revoke-${stateId}`);
    setError(null);
    const result = await adminRevokeStateCode(stateId);
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRevealedStates((r) => {
      const next = { ...r };
      delete next[stateId];
      return next;
    });
    refreshStateCode({ stateId, status: "revoked" });
  };

  const reactivateNamed = async (slug: string, plainCode: string) => {
    setBusy(`named-${slug}`);
    setError(null);
    const result = await adminSetNamedCodePlain(slug, plainCode);
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRevealedNamed((r) => ({ ...r, [slug]: result.plainCode }));
    setNamedCodes((prev) =>
      prev.map((c) =>
        c.slug === slug
          ? { ...c, hasCode: true, status: "active", codeGeneratedAt: new Date().toISOString() }
          : c
      )
    );
  };

  const revokeNamed = async (slug: string) => {
    setBusy(`named-revoke-${slug}`);
    setError(null);
    const result = await adminRevokeNamedCode(slug);
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRevealedNamed((r) => {
      const next = { ...r };
      delete next[slug];
      return next;
    });
    setNamedCodes((prev) =>
      prev.map((c) => (c.slug === slug ? { ...c, status: "revoked" } : c))
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Agent recruitment codes</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">
            Named sponsors (e.g. governors), independent state codes, and ARO 1–5. State-locked codes
            block National Agent. Copy codes when revealed — they are shown once.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="min-h-[44px]">
            <Link href="/admin/agent-registrations">Agent registrations</Link>
          </Button>
          <Button
            type="button"
            className="min-h-[44px] bg-sdp-primary text-white hover:bg-sdp-primary/90"
            disabled={!!busy || missingStateCodes === 0}
            onClick={generateMissingStates}
          >
            {busy === "state-batch" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            {missingStateCodes > 0
              ? `Generate all state codes (${missingStateCodes})`
              : "All state codes generated"}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
      ) : null}

      <section id="named-codes" className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Named codes (governors & sponsors)</h2>
          <p className="text-sm text-neutral-600">
            Each code locks to one state and appears as <strong>Registered by</strong> on agent
            applications. Nasarawa governor code: <span className="font-mono">GOV-IG754</span>.
          </p>
        </div>
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50">
              <tr>
                <th className="px-4 py-3 font-semibold text-neutral-700">Sponsor</th>
                <th className="px-4 py-3 font-semibold text-neutral-700">Locked state</th>
                <th className="px-4 py-3 font-semibold text-neutral-700">Status</th>
                <th className="px-4 py-3 font-semibold text-neutral-700">Registrations</th>
                <th className="px-4 py-3 font-semibold text-neutral-700">Current code</th>
                <th className="px-4 py-3 font-semibold text-neutral-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {namedCodes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-neutral-600">
                    No named codes yet. Run migration 025, then refresh.
                  </td>
                </tr>
              ) : (
                namedCodes.map((c) => (
                  <tr key={c.slug}>
                    <td className="px-4 py-3 font-medium text-neutral-900">{c.label}</td>
                    <td className="px-4 py-3 text-neutral-700">
                      {titleCaseStateName(c.stateName)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          c.status === "active"
                            ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800"
                            : "rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600"
                        }
                      >
                        {c.status === "active" ? "Active" : "Revoked"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-neutral-800">{c.registrationCount}</td>
                    <td className="px-4 py-3">
                      {revealedNamed[c.slug] ? (
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-neutral-100 px-2 py-1 font-mono tracking-wide">
                            {revealedNamed[c.slug]}
                          </code>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => navigator.clipboard.writeText(revealedNamed[c.slug]!)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-neutral-500">
                          {c.hasCode
                            ? "Active (hidden — re-activate to reveal)"
                            : "Not set"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-[40px]"
                          disabled={!!busy}
                          onClick={() => {
                            const known =
                              c.slug === "governor-nasarawa" ? "GOV-IG754" : "";
                            const entered =
                              known ||
                              window.prompt(`Enter plaintext code for ${c.label}`) ||
                              "";
                            if (entered.trim()) void reactivateNamed(c.slug, entered.trim());
                          }}
                        >
                          {busy === `named-${c.slug}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                          {c.hasCode ? "Re-activate / reveal" : "Set code"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-[40px] border-red-200 text-red-700 hover:bg-red-50"
                          disabled={!!busy || c.status === "revoked"}
                          onClick={() => revokeNamed(c.slug)}
                        >
                          {busy === `named-revoke-${c.slug}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Ban className="h-4 w-4" />
                          )}
                          Revoke
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section id="state-codes" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">State codes (37)</h2>
            <p className="text-sm text-neutral-600">
              Independent of ARO. Unlocking a state code locks that state and blocks National Agent.
              Use <strong>Generate</strong> on a row, or generate all missing states above.
            </p>
          </div>
          {missingStateCodes > 0 ? (
            <Button
              type="button"
              className="min-h-[44px] bg-sdp-primary text-white hover:bg-sdp-primary/90"
              disabled={!!busy}
              onClick={generateMissingStates}
            >
              {busy === "state-batch" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              Generate missing state codes ({missingStateCodes})
            </Button>
          ) : null}
        </div>

        {stateBatchCodes && stateBatchCodes.length > 0 ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
            <p className="font-semibold text-emerald-950">New state codes (copy now — shown once):</p>
            <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
              {stateBatchCodes.map((c) => (
                <li key={c.stateId} className="flex items-center gap-2">
                  <span className="w-40 shrink-0 font-medium text-emerald-900">
                    {titleCaseStateName(c.stateName)}
                  </span>
                  <code className="flex-1 rounded border border-emerald-200 bg-white px-3 py-2 font-mono tracking-wide">
                    {c.plainCode}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`Copy ${c.stateName} code`}
                    onClick={() => navigator.clipboard.writeText(c.plainCode)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50">
              <tr>
                <th className="px-4 py-3 font-semibold text-neutral-700">State</th>
                <th className="px-4 py-3 font-semibold text-neutral-700">Status</th>
                <th className="px-4 py-3 font-semibold text-neutral-700">Registrations</th>
                <th className="px-4 py-3 font-semibold text-neutral-700">Current code</th>
                <th className="px-4 py-3 font-semibold text-neutral-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {stateCodes.map((c) => (
                <tr key={c.stateId}>
                  <td className="px-4 py-3 font-medium text-neutral-900">
                    {titleCaseStateName(c.stateName)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        c.status === "active"
                          ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800"
                          : "rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600"
                      }
                    >
                      {c.status === "active" ? "Active" : "Revoked"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-neutral-800">{c.registrationCount}</td>
                  <td className="px-4 py-3">
                    {revealedStates[c.stateId] ? (
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-neutral-100 px-2 py-1 font-mono tracking-wide">
                          {revealedStates[c.stateId]}
                        </code>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => navigator.clipboard.writeText(revealedStates[c.stateId]!)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-500">
                        {c.hasCode ? "Hidden (rotate to reveal a new code)" : "Not generated yet"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-[40px]"
                        disabled={!!busy}
                        onClick={() => rotateState(c.stateId)}
                      >
                        {busy === `state-rotate-${c.stateId}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        {c.hasCode ? "Rotate" : "Generate"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-[40px] border-red-200 text-red-700 hover:bg-red-50"
                        disabled={!!busy || c.status === "revoked"}
                        onClick={() => revokeState(c.stateId)}
                      >
                        {busy === `state-revoke-${c.stateId}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Ban className="h-4 w-4" />
                        )}
                        Revoke
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">ARO 1–5</h2>
            <p className="text-sm text-neutral-600">
              National Agent Registration Officers. Codes are not tied to a state.
            </p>
          </div>
          {missingCodes > 0 ? (
            <Button
              type="button"
              className="min-h-[44px] bg-sdp-primary text-white hover:bg-sdp-primary/90"
              disabled={!!busy}
              onClick={generateMissing}
            >
              {busy === "batch" ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Generate missing ARO codes ({missingCodes})
            </Button>
          ) : null}
        </div>

        {batchCodes && batchCodes.length > 0 ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
            <p className="font-semibold text-emerald-950">New ARO codes (copy now — shown once):</p>
            <ul className="mt-3 space-y-2">
              {batchCodes.map((c) => (
                <li key={c.officerNumber} className="flex items-center gap-2">
                  <span className="w-16 font-medium text-emerald-900">ARO {c.officerNumber}</span>
                  <code className="flex-1 rounded border border-emerald-200 bg-white px-3 py-2 font-mono tracking-wide">
                    {c.plainCode}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`Copy ARO ${c.officerNumber} code`}
                    onClick={() => navigator.clipboard.writeText(c.plainCode)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50">
              <tr>
                <th className="px-4 py-3 font-semibold text-neutral-700">Officer</th>
                <th className="px-4 py-3 font-semibold text-neutral-700">Status</th>
                <th className="px-4 py-3 font-semibold text-neutral-700">Registrations</th>
                <th className="px-4 py-3 font-semibold text-neutral-700">Current code</th>
                <th className="px-4 py-3 font-semibold text-neutral-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {officers.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-neutral-900">ARO {o.officerNumber}</div>
                    <div className="text-xs text-neutral-500">{o.label}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        o.status === "active"
                          ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800"
                          : "rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600"
                      }
                    >
                      {o.status === "active" ? "Active" : "Revoked"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-neutral-800">{o.registrationCount}</td>
                  <td className="px-4 py-3">
                    {revealed[o.officerNumber] ? (
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-neutral-100 px-2 py-1 font-mono tracking-wide">
                          {revealed[o.officerNumber]}
                        </code>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => navigator.clipboard.writeText(revealed[o.officerNumber]!)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-500">
                        {o.hasCode ? "Hidden (rotate to reveal a new code)" : "Not generated yet"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-[40px]"
                        disabled={!!busy}
                        onClick={() => rotate(o.officerNumber)}
                      >
                        {busy === `rotate-${o.officerNumber}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        {o.hasCode ? "Rotate" : "Generate"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-[40px] border-red-200 text-red-700 hover:bg-red-50"
                        disabled={!!busy || o.status === "revoked"}
                        onClick={() => revoke(o.officerNumber)}
                      >
                        {busy === `revoke-${o.officerNumber}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Ban className="h-4 w-4" />
                        )}
                        Revoke
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-neutral-900">By Agent Registration Officer</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {stats.byAro.map((a) => (
            <div key={a.officerNumber} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                ARO {a.officerNumber}
              </p>
              <p className="mt-1 text-2xl font-bold text-neutral-900">{a.total}</p>
              <p className="mt-1 text-xs text-neutral-600">
                {a.pending} pending · {a.approved} approved · {a.rejected} rejected
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-neutral-900">By state</h2>
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50">
              <tr>
                <th className="px-4 py-3 font-semibold text-neutral-700">State</th>
                <th className="px-4 py-3 font-semibold text-neutral-700">Total</th>
                <th className="px-4 py-3 font-semibold text-neutral-700">Pending</th>
                <th className="px-4 py-3 font-semibold text-neutral-700">Approved</th>
                <th className="px-4 py-3 font-semibold text-neutral-700">Rejected</th>
                <th className="px-4 py-3 font-semibold text-neutral-700">By ARO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {stats.byState.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-neutral-600">
                    No agent registrations yet.
                  </td>
                </tr>
              ) : (
                stats.byState.map((s) => (
                  <tr key={s.stateId}>
                    <td className="px-4 py-3 font-medium text-neutral-900">{s.stateName}</td>
                    <td className="px-4 py-3 font-mono">{s.total}</td>
                    <td className="px-4 py-3 font-mono text-amber-700">{s.pending}</td>
                    <td className="px-4 py-3 font-mono text-emerald-700">{s.approved}</td>
                    <td className="px-4 py-3 font-mono text-red-700">{s.rejected}</td>
                    <td className="px-4 py-3 text-xs text-neutral-600">
                      {[1, 2, 3, 4, 5]
                        .map((n) => (s.byAro[n] ? `ARO${n}:${s.byAro[n]}` : null))
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
