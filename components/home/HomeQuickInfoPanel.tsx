"use client";

import { useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/context";

const SESSION_KEY = "sdp-home-quickinfo-dismissed";

type Props = {
  heading: string;
  bullets: readonly string[];
};

export function HomeQuickInfoPanel({ heading, bullets }: Props) {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "1") setVisible(false);
    } catch {
      /* ignore */
    }
  }, []);

  const dismiss = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  if (!mounted || !visible) return null;

  return (
    <div className="mt-8 rounded-xl border border-sdp-primary/25 bg-sdp-primary/5 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="flex min-w-0 flex-1 items-start gap-2 text-sm font-semibold leading-snug text-neutral-900 sm:text-base">
          <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-sdp-primary" aria-hidden />
          <span className="text-balance">{heading}</span>
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 text-neutral-600 hover:bg-neutral-200/80 hover:text-neutral-900"
          onClick={dismiss}
          aria-label={t.common.close}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-relaxed text-neutral-700 sm:pl-6 sm:text-[15px]">
        {bullets.map((text, i) => (
          <li key={i}>{text}</li>
        ))}
      </ul>
    </div>
  );
}
