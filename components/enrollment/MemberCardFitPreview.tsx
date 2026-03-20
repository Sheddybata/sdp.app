"use client";

import { useEffect, useRef, useState } from "react";
import type { EnrollmentFormData } from "@/lib/enrollment-schema";
import { MemberCard } from "./MemberCard";

/** MemberCard is 952×560px; scale down to fit the parent width (no horizontal scroll). */
const MEMBER_CARD_W = 952;
const MEMBER_CARD_H = 560;

export type MemberCardFitPreviewData = EnrollmentFormData & { portraitDataUrl?: string };

export function MemberCardFitPreview({
  data,
  showBarcode = true,
}: {
  data: MemberCardFitPreviewData;
  showBarcode?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      if (w <= 0) return;
      setScale(Math.min(1, w / MEMBER_CARD_W));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full min-w-0 max-w-full">
      <div
        className="mx-auto overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 shadow-inner"
        style={{
          width: MEMBER_CARD_W * scale,
          height: MEMBER_CARD_H * scale,
        }}
      >
        <div
          style={{
            width: MEMBER_CARD_W,
            height: MEMBER_CARD_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <MemberCard
            data={{ ...data, portraitDataUrl: data.portraitDataUrl }}
            showBarcode={showBarcode}
          />
        </div>
      </div>
    </div>
  );
}
