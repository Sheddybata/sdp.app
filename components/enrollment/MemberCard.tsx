"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import type { EnrollmentFormData } from "@/lib/enrollment-schema";
import { formatVoterIdDisplay, getMembershipIdFromData } from "@/lib/enrollment-schema";
import { NIGERIA_STATES } from "@/lib/nigeria-geo";
import { cn } from "@/lib/utils";

interface MemberCardProps {
  data: EnrollmentFormData;
  className?: string;
  showBarcode?: boolean;
  id?: string;
}

function getStateName(stateId: string): string {
  return NIGERIA_STATES.find((s) => s.id === stateId)?.name ?? stateId;
}

/** Member Since label from joinDate (e.g. "January 2026") */
function getMemberSinceLabel(joinDate?: string): string {
  if (!joinDate) return "2026";
  try {
    const d = new Date(joinDate);
    if (Number.isNaN(d.getTime())) return "2026";
    return format(d, "MMMM yyyy");
  } catch {
    return "2026";
  }
}

export function MemberCard({ data, className, showBarcode = true, id = "member-card" }: MemberCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const membershipId = getMembershipIdFromData(data);
  const voterIdRaw = (data.voterRegistrationNumber || "").replace(/\s/g, "");

  useEffect(() => {
    if (!showBarcode || !voterIdRaw) return;
    const payload = `SDP-MEMBER:${voterIdRaw}`;
    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(payload, {
        width: 160,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      })
        .then(setQrDataUrl)
        .catch(() => {});
    });
  }, [showBarcode, voterIdRaw]);


  const fullName = [data.surname, data.firstName, data.otherNames].filter(Boolean).join(" ").toUpperCase();
  const memberSince = getMemberSinceLabel(data.joinDate);

  return (
    <article
      id={id}
      className={cn(
        "relative overflow-hidden rounded-lg bg-white shadow-xl flex flex-col",
        "border-2 border-[#01a85a]",
        className
      )}
      style={{
        width: "952px",
        height: "426px",
        minWidth: "952px",
        minHeight: "426px"
      }}
      aria-label="Digital membership card"
    >
      {/* Green top banner */}
      <div className="bg-[#01a85a] px-6 py-4 flex items-center gap-4 h-[100px] shrink-0">
        <div className="w-20 h-20 rounded-sm bg-white flex items-center justify-center overflow-hidden border-2 border-white/80 shrink-0">
          <img
            src="/sdplogo.jpg"
            alt="SDP logo"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex-1 text-center">
          <p className="text-white text-2xl font-bold uppercase tracking-wide leading-tight">
            Social Democratic Party
          </p>
          <p className="text-white/95 text-xl font-bold">SDP</p>
        </div>
      </div>

      {/* Orange band */}
      <div className="bg-[#f48735] px-6 py-2 text-center shrink-0">
        <p className="text-white text-lg font-bold uppercase tracking-widest">Digital Membership Card</p>
      </div>

      {/* White content area with green borders */}
      <div className="border-x-2 border-b-2 border-[#01a85a] flex-1 flex flex-col min-h-0">
        <div className="px-6 flex-1 flex items-center">
          <div className="grid gap-8 grid-cols-[180px_1fr_180px] items-center w-full">
          {/* Portrait – left, green border */}
          <div className="w-[180px] h-[220px] rounded-md overflow-hidden bg-neutral-200 border-2 border-[#01a85a] shrink-0">
            {data.portraitDataUrl ? (
              <img
                src={data.portraitDataUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">
                Photo
              </div>
            )}
          </div>

          {/* Details – center */}
          <div className="min-w-0">
            <p className="text-3xl font-bold text-neutral-900 uppercase tracking-wide leading-tight break-words">
              {fullName || "—"}
            </p>
            <p className="mt-1 text-lg">
              <span className="text-[#f48735] font-semibold">Membership ID: </span>
              <span className="text-[#e0762a] font-bold">{membershipId}</span>
            </p>
 
            <div className="grid grid-cols-2 gap-x-10 gap-y-4 mt-6">
              <div>
                <p className="text-neutral-500 uppercase text-[10px] font-bold">State</p>
                <p className="font-bold text-neutral-900 text-lg break-words">{getStateName(data.state)}</p>
              </div>
              <div>
                <p className="text-neutral-500 uppercase text-[10px] font-bold">Tel</p>
                <p className="font-bold text-neutral-900 text-lg break-words">{data.phone}</p>
              </div>
              <div>
                <p className="text-neutral-500 uppercase text-[10px] font-bold">LGA</p>
                <p className="font-bold text-neutral-900 text-lg leading-tight break-words" title={data.lga}>{data.lga}</p>
              </div>
              <div>
                <p className="text-neutral-500 uppercase text-[10px] font-bold">Member Since</p>
                <p className="font-bold text-neutral-900 text-lg leading-tight">{memberSince}</p>
              </div>
              <div>
                <p className="text-neutral-500 uppercase text-[10px] font-bold">Ward</p>
                <p className="font-bold text-neutral-900 text-lg leading-tight break-words" title={data.ward}>{data.ward}</p>
              </div>
              <div>
                <p className="text-neutral-500 uppercase text-[10px] font-bold">Voter Reg No</p>
                <p className="font-bold text-neutral-900 font-mono tracking-wide whitespace-nowrap text-lg">
                  {formatVoterIdDisplay(data.voterRegistrationNumber)}
                </p>
              </div>
            </div>
          </div>

          {/* QR code – right */}
          {showBarcode && data.voterRegistrationNumber && (
            <div className="w-[180px] h-[180px] border-2 border-[#f48735] rounded bg-white flex items-center justify-center shrink-0" aria-hidden>
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt=""
                  className="w-[160px] h-[160px] block"
                  width={160}
                  height={160}
                />
              ) : (
                <span className="text-xs text-neutral-400">QR…</span>
              )}
            </div>
          )}
        </div>
        </div>

        {/* Green bottom banner */}
        <div className="h-3 bg-[#01a85a] mt-auto shrink-0" />
      </div>
    </article>
  );
}
