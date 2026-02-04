"use client";

import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionCardProps {
  href: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  primary?: boolean;
  className?: string;
  "aria-label"?: string;
}

export function ActionCard({ href, icon: Icon, title, description, primary, className, "aria-label": ariaLabel }: ActionCardProps) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel ?? title}
      className={cn(
        "group flex flex-col gap-3 rounded-xl border p-6 min-h-[120px] transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sdp-primary",
        primary
          ? "border-sdp-primary/30 bg-sdp-primary/5 hover:bg-sdp-primary/10 hover:border-sdp-primary/50"
          : "border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-md",
        className
      )}
    >
      <span
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg transition-colors",
          primary ? "bg-sdp-primary text-white" : "bg-neutral-100 text-neutral-700 group-hover:bg-sdp-primary/10 group-hover:text-sdp-primary"
        )}
      >
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <div>
        <h3 className="font-semibold text-neutral-900 text-base">{title}</h3>
        {description && <p className="mt-1 text-sm text-neutral-600">{description}</p>}
      </div>
    </Link>
  );
}
