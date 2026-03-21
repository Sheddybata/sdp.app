import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

/** Trust signals for user confidence */
export function TrustSignals({ compact = false }: { compact?: boolean }) {
  return (
    <p
      className={cn(
        compact ? "text-[11px] text-neutral-500" : "text-xs text-neutral-500",
        "flex flex-row flex-nowrap items-center justify-center gap-x-1.5 text-center"
      )}
      role="contentinfo"
    >
      <span className="shrink-0">Copyrights Reserved ©</span>
      <span className="shrink-0 text-neutral-400" aria-hidden>
        ·
      </span>
      <Shield className="h-3.5 w-3.5 shrink-0 text-neutral-500" aria-hidden />
      <span className="shrink-0">Official SDP Portal</span>
    </p>
  );
}
