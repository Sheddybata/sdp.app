"use client";

import Link from "next/link";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionCardProps {
  href: string;
  /** Lucide icon — omit when using imageSrc */
  icon?: LucideIcon;
  /** e.g. /images/enrollement.png — full card background when set */
  imageSrc?: string;
  title: string;
  description?: string;
  primary?: boolean;
  className?: string;
  "aria-label"?: string;
}

export function ActionCard({
  href,
  icon: Icon,
  imageSrc,
  title,
  description,
  primary,
  className,
  "aria-label": ariaLabel,
}: ActionCardProps) {
  const isPhotoCard = Boolean(imageSrc);

  return (
    <Link
      href={href}
      aria-label={ariaLabel ?? title}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sdp-primary",
        isPhotoCard
          ? cn(
              "min-h-[168px] justify-end p-5 shadow-sm border-neutral-200/80 hover:border-neutral-300 hover:shadow-md",
              primary && "border-sdp-primary/30 ring-2 ring-sdp-primary/40 ring-offset-0"
            )
          : cn(
              "min-h-[120px] gap-3 p-6",
              primary
                ? "border-sdp-primary/30 bg-sdp-primary/5 hover:bg-sdp-primary/10 hover:border-sdp-primary/50"
                : "border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-md"
            ),
        className
      )}
    >
      {isPhotoCard && imageSrc ? (
        <>
          <Image
            src={imageSrc}
            alt=""
            fill
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            aria-hidden
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/15"
            aria-hidden
          />
          {primary ? (
            <div
              className="absolute inset-0 bg-sdp-primary/20 mix-blend-multiply"
              aria-hidden
            />
          ) : null}
        </>
      ) : Icon ? (
        <span
          className={cn(
            "relative z-0 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg transition-colors",
            primary ? "bg-sdp-primary text-white" : "bg-neutral-100 text-neutral-700 group-hover:bg-sdp-primary/10 group-hover:text-sdp-primary"
          )}
        >
          <Icon className="h-6 w-6" aria-hidden />
        </span>
      ) : null}

      <div className="relative z-10">
        <h3
          className={cn(
            "text-base font-semibold",
            isPhotoCard ? "text-white drop-shadow-md" : "text-neutral-900"
          )}
        >
          {title}
        </h3>
        {description ? (
          <p
            className={cn(
              "mt-1 text-sm leading-relaxed",
              isPhotoCard ? "text-white/90 drop-shadow" : "text-neutral-600"
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
