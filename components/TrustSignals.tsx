import { Shield } from "lucide-react";

/** Trust signals for user confidence */
export function TrustSignals({ compact = false }: { compact?: boolean }) {
  return (
    <p className={compact ? "text-[11px] text-neutral-500" : "text-xs text-neutral-500"} role="contentinfo">
      <span className="inline-flex items-center gap-1.5">Copyrights Reserved ©</span>
      <span className="mx-2" aria-hidden>·</span>
      <span className="inline-flex items-center gap-1.5">
        <Shield className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Official SDP Portal
      </span>
    </p>
  );
}
