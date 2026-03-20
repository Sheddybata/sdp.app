"use client";

import { useEffect, useRef, useState } from "react";
import type { EnrollmentFormData } from "@/lib/enrollment-schema";
import { MEMBER_CARD_H, MEMBER_CARD_W } from "@/lib/member-card-back-content";
import { MemberCard } from "./MemberCard";
import { MemberCardBack } from "./MemberCardBack";
import { Button } from "@/components/ui/button";

export type MemberCardFitPreviewData = EnrollmentFormData & { portraitDataUrl?: string };

export function MemberCardFitPreview({
  data,
  showBarcode = true,
  showBackToggle = true,
}: {
  data: MemberCardFitPreviewData;
  showBarcode?: boolean;
  /** Show Front / Back tabs (verify & admin preview). */
  showBackToggle?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [side, setSide] = useState<"front" | "back">("front");

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
    <div ref={containerRef} className="w-full min-w-0 max-w-full space-y-3">
      {showBackToggle ? (
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            type="button"
            variant={side === "front" ? "default" : "outline"}
            size="sm"
            className={side === "front" ? "bg-sdp-accent hover:bg-[#018f4e]" : ""}
            onClick={() => setSide("front")}
          >
            Front
          </Button>
          <Button
            type="button"
            variant={side === "back" ? "default" : "outline"}
            size="sm"
            className={side === "back" ? "bg-sdp-accent hover:bg-[#018f4e]" : ""}
            onClick={() => setSide("back")}
          >
            Back
          </Button>
        </div>
      ) : null}
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
          {!showBackToggle || side === "front" ? (
            <MemberCard
              data={{ ...data, portraitDataUrl: data.portraitDataUrl }}
              showBarcode={showBarcode}
            />
          ) : (
            <MemberCardBack />
          )}
        </div>
      </div>
    </div>
  );
}
