/**
 * Helpers so html2canvas captures match on-screen preview (fonts + layout flush).
 */

import { MEMBER_CARD_H, MEMBER_CARD_PORTRAIT_H } from "@/lib/member-card-back-content";
import { MEMBER_CARD_WATERMARK_OPACITY } from "@/lib/member-card-watermark";

export function waitForCaptureReady(): Promise<void> {
  return new Promise((resolve) => {
    const flushLayout = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    };
    if (typeof document !== "undefined" && document.fonts?.ready) {
      void document.fonts.ready.then(flushLayout).catch(flushLayout);
    } else {
      flushLayout();
    }
  });
}

/** Card roots used for PNG/PDF — patch clone only, never changes on-screen preview. */
const HTML2CANVAS_CARD_IDS = [
  "member-card-capture",
  "member-card-capture-portrait",
  "member-card-back-capture",
  "member-card-back-capture-portrait",
] as const;

function minHeightPxForCardId(id: string): number {
  return id.includes("portrait") ? MEMBER_CARD_PORTRAIT_H : MEMBER_CARD_H;
}

/**
 * html2canvas often clips text (glyphs look “sliced”) when:
 * - fixed card height is shorter than relaxed line-height (bottom half of copy is outside the box)
 * - flex children use min-h-0 / overflow hidden
 * - scaled logo + white JPG letterbox paint over the membership block in the raster
 * - (We avoid opaque white on the member block — that would hide the card watermark in exports.)
 *
 * Preview is unchanged; only the cloned DOM (used for raster) is patched.
 */
export function patchClonedMemberCardsForExport(clonedDoc: Document): void {
  const head = clonedDoc.head;
  if (head) {
    const scoped = clonedDoc.createElement("style");
    scoped.setAttribute("data-sdp-export-patch", "1");
    scoped.textContent = `
      #member-card-capture .leading-tight,
      #member-card-capture-portrait .leading-tight {
        line-height: 1.45 !important;
      }

      /* Drop preview ring in raster — extra box-shadow layer can confuse stacking in canvas */
      #member-card-capture.sdp-member-card,
      #member-card-capture-portrait.sdp-member-card-portrait,
      #member-card-back-capture.sdp-member-card-back,
      #member-card-back-capture-portrait.sdp-member-card-back-portrait {
        box-shadow: none !important;
      }

      /*
       * Membership block: stay above scaled-logo raster spill only.
       * Background stays transparent so the z-0 watermark (background image) stays visible in PNG/PDF.
       */
      [data-sdp-member-body] {
        position: relative !important;
        z-index: 8 !important;
        overflow: visible !important;
        background-color: transparent !important;
        background-image: none !important;
      }
      #member-card-capture [data-sdp-member-body] > div:first-child {
        padding-bottom: 16px !important;
        position: relative !important;
        z-index: 2 !important;
        overflow: visible !important;
        background-color: transparent !important;
        background-image: none !important;
      }
      #member-card-capture-portrait [data-sdp-member-body] {
        padding-bottom: 18px !important;
        overflow: visible !important;
        background-color: transparent !important;
        background-image: none !important;
      }

      /* Ensure watermark layer is not flattened away in clone */
      #member-card-capture > div.pointer-events-none.absolute.inset-0,
      #member-card-capture-portrait > div.pointer-events-none.absolute.inset-0,
      #member-card-back-capture > div.pointer-events-none.absolute.inset-0,
      #member-card-back-capture-portrait > div.pointer-events-none.absolute.inset-0 {
        z-index: 0 !important;
        opacity: ${MEMBER_CARD_WATERMARK_OPACITY} !important;
      }

      /* Clip scaled SDP logo to header column so white JPG + transform don’t cover the body in canvas */
      #member-card-capture header.grid > div.flex.flex-col:first-child {
        overflow: hidden !important;
        position: relative !important;
        z-index: 0 !important;
      }
      #member-card-capture-portrait header.flex > div:first-child {
        overflow: hidden !important;
      }

      /* Front card body copy (exclude portrait full-width banner div) */
      #member-card-capture > div:not([data-sdp-red-banner]) p,
      #member-card-capture-portrait > div:not([data-sdp-red-banner]) p {
        line-height: 1.72 !important;
        overflow-x: hidden !important;
        overflow-y: visible !important;
        text-shadow: none !important;
        padding-top: 2px !important;
        padding-bottom: 2px !important;
      }

      #member-card-capture header p,
      #member-card-capture-portrait header p {
        text-shadow: none !important;
        line-height: 1.42 !important;
        overflow: visible !important;
      }

      /*
       * Export-only vertical nudge: move the whole header (or header + banner) up together.
       * Avoid negative margins between party line and red bar — that squeezed them together.
       */
      #member-card-capture header.grid {
        transform: translateY(-6px) !important;
      }
      /* Slightly more space between party headline and red bar (export) */
      #member-card-capture header .min-w-0 > div:first-child {
        padding-bottom: 12px !important;
      }
      #member-card-capture-portrait header.flex {
        transform: translateY(-6px) !important;
      }
      #member-card-capture-portrait > div[data-sdp-red-banner] {
        transform: translateY(-6px) !important;
        margin-top: 12px !important;
      }
    `;
    head.appendChild(scoped);
  }

  clonedDoc.querySelectorAll<HTMLElement>(".member-cards-capture-host").forEach((host) => {
    host.style.setProperty("overflow", "visible", "important");
  });

  for (const id of HTML2CANVAS_CARD_IDS) {
    const root = clonedDoc.getElementById(id);
    if (!root) continue;
    const rootEl = root as HTMLElement;

    /* Grow with content so descenders / extra line-height aren’t clipped at card bottom */
    const minH = minHeightPxForCardId(id);
    rootEl.style.setProperty("height", "auto", "important");
    rootEl.style.setProperty("min-height", `${minH}px`, "important");
    rootEl.style.setProperty("overflow", "visible", "important");

    /* Step5Preview wraps each card in a fixed-H box; allow clone to grow with content */
    const wrap = rootEl.parentElement;
    if (wrap instanceof HTMLElement) {
      wrap.style.setProperty("height", "auto", "important");
      wrap.style.setProperty("min-height", `${minH}px`, "important");
      wrap.style.setProperty("overflow", "visible", "important");
    }

    root.querySelectorAll<HTMLElement>(".min-h-0").forEach((el) => {
      el.style.setProperty("min-height", "auto", "important");
    });

    const header = root.querySelector("header");
    if (header) {
      header.querySelectorAll<HTMLElement>("div, p, span").forEach((el) => {
        el.style.setProperty("overflow", "visible", "important");
      });
      header.querySelectorAll("p").forEach((node) => {
        const el = node as HTMLElement;
        el.style.setProperty("line-height", "1.42", "important");
        el.style.setProperty("overflow", "visible", "important");
        el.style.setProperty("padding-top", "3px", "important");
        el.style.setProperty("padding-bottom", "3px", "important");
        el.style.setProperty("text-shadow", "none", "important");
      });
    }

    root.querySelectorAll<HTMLElement>("[data-sdp-red-banner]").forEach((banner) => {
      banner.style.setProperty("overflow", "visible", "important");
      banner.querySelectorAll("p").forEach((node) => {
        const el = node as HTMLElement;
        el.style.setProperty("line-height", "1.35", "important");
        el.style.setProperty("overflow", "visible", "important");
      });
    });

    root.querySelectorAll("p").forEach((node) => {
      if (header?.contains(node)) return;
      const el = node as HTMLElement;
      el.style.setProperty("line-height", "1.72", "important");
      el.style.setProperty("overflow-x", "hidden", "important");
      el.style.setProperty("overflow-y", "visible", "important");
      el.style.setProperty("text-shadow", "none", "important");
      el.style.setProperty("padding-top", "2px", "important");
      el.style.setProperty("padding-bottom", "2px", "important");
    });

    root.querySelectorAll<HTMLElement>("div.flex").forEach((el) => {
      if (header?.contains(el)) {
        el.style.setProperty("overflow", "visible", "important");
      }
    });

    root.querySelectorAll<HTMLElement>("div").forEach((el) => {
      if (header?.contains(el)) return;
      if (el.style.display === "grid" && el.style.gridTemplateColumns) {
        el.style.setProperty("line-height", "1.65", "important");
        el.style.setProperty("overflow", "visible", "important");
      }
    });

    root.querySelectorAll<HTMLElement>("div.flex.min-h-0").forEach((el) => {
      if (!header?.contains(el)) {
        el.style.setProperty("overflow", "visible", "important");
      }
    });

    /* Member body row/column: ensure flex doesn’t clip (clone only) */
    root.querySelectorAll<HTMLElement>("[data-sdp-member-body]").forEach((el) => {
      el.style.setProperty("min-height", "auto", "important");
      el.style.setProperty("overflow", "visible", "important");
    });
  }
}

/** Stack two captures vertically; uses intrinsic canvas sizes (avoids stretch/clipping bugs). */
export function mergeCanvasesVertical(
  top: HTMLCanvasElement,
  bottom: HTMLCanvasElement,
  gapPx: number
): HTMLCanvasElement {
  const w = Math.max(top.width, bottom.width);
  const h = top.height + gapPx + bottom.height;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d");
  if (!ctx) return out;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(top, Math.floor((w - top.width) / 2), 0);
  ctx.drawImage(bottom, Math.floor((w - bottom.width) / 2), top.height + gapPx);
  return out;
}
