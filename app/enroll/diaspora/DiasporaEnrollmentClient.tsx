"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Globe, CheckCircle2, Mail, MapPin, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInecGeo } from "@/hooks/useInecGeo";
import { COUNTRY_DIAL_LIST, prioritizedCountries } from "@/lib/data/country-dial-codes";
import { flagEmoji } from "@/lib/geo/flag-emoji";
import { submitDiasporaEnrollment } from "@/app/actions/diaspora-enroll";
import { DiasporaPhotoBlock } from "./DiasporaPhotoBlock";

const countries = prioritizedCountries(COUNTRY_DIAL_LIST);

function SectionTitle({
  children,
  description,
}: {
  children: React.ReactNode;
  description?: string;
}) {
  return (
    <div className="border-b border-neutral-200 pb-3">
      <h2 className="text-base font-semibold text-neutral-900">{children}</h2>
      {description ? (
        <p className="mt-1 text-sm text-neutral-600">{description}</p>
      ) : null}
    </div>
  );
}

const THANK_YOU_MESSAGE =
  "Thank you for pledging to support SDP. An SDP representative will reach out to you regarding membership registration, information regarding convention, congress and primaries.";

export default function DiasporaEnrollmentClient() {
  const [surname, setSurname] = useState("");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCountryIso2, setPhoneCountryIso2] = useState("US");
  const [phoneNational, setPhoneNational] = useState("");
  const [residenceCountryIso2, setResidenceCountryIso2] = useState("");
  const [residenceCity, setResidenceCity] = useState("");
  const [residenceAddress, setResidenceAddress] = useState("");
  const [nigeriaStateId, setNigeriaStateId] = useState("");
  const [nigeriaLgaId, setNigeriaLgaId] = useState("");
  const [vin, setVin] = useState("");
  const [portraitDataUrl, setPortraitDataUrl] = useState<string | null>(null);
  const [idDocumentDataUrl, setIdDocumentDataUrl] = useState<string | null>(null);
  const [portraitError, setPortraitError] = useState<string | null>(null);
  const [idDocError, setIdDocError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [registrationComplete, setRegistrationComplete] = useState(false);

  const successPanelRef = useRef<HTMLDivElement>(null);

  const { states, loading: statesIndexLoading, stateData, stateDataLoading } =
    useInecGeo(nigeriaStateId || undefined);

  const lgas = stateData?.lgas ?? [];

  useEffect(() => {
    setNigeriaLgaId("");
  }, [nigeriaStateId]);

  useEffect(() => {
    if (registrationComplete && successPanelRef.current) {
      successPanelRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [registrationComplete]);

  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    startTransition(async () => {
      const st = states.find((s) => s.id === nigeriaStateId);
      const lg = lgas.find((l) => l.id === nigeriaLgaId);
      const res = await submitDiasporaEnrollment({
        surname,
        firstName,
        email,
        phoneCountryIso2,
        phoneNational,
        residenceCountryIso2,
        residenceCity,
        residenceAddress,
        nigeriaStateId,
        nigeriaLgaId,
        nigeriaStateName: st?.name ?? "",
        nigeriaLgaName: lg?.name ?? "",
        vin: vin.trim() || undefined,
        portraitDataUrl,
        idDocumentDataUrl,
      });
      if (!res.ok) {
        setFormError(res.error);
        return;
      }
      setRegistrationComplete(true);
      setSurname("");
      setFirstName("");
      setEmail("");
      setPhoneCountryIso2("US");
      setPhoneNational("");
      setResidenceCountryIso2("");
      setResidenceCity("");
      setResidenceAddress("");
      setNigeriaStateId("");
      setNigeriaLgaId("");
      setVin("");
      setPortraitDataUrl(null);
      setIdDocumentDataUrl(null);
    });
  };

  const countrySelectItems = useMemo(
    () =>
      countries.map((c) => (
        <SelectItem key={c.iso2} value={c.iso2}>
          <span className="flex items-center gap-2">
            <span className="text-base leading-none" aria-hidden>
              {flagEmoji(c.iso2)}
            </span>
            <span>{c.name}</span>
          </span>
        </SelectItem>
      )),
    []
  );

  /** Dropdown: flag + dial only (full country name in `title` for hover/accessibility). */
  const phoneCodeItems = useMemo(
    () =>
      countries.map((c) => (
        <SelectItem key={`dial-${c.iso2}`} value={c.iso2} textValue={`+${c.dial} ${c.iso2}`}>
          <span
            className="flex items-center gap-2 font-mono text-sm tabular-nums"
            title={c.name}
          >
            <span className="text-base leading-none" aria-hidden>
              {flagEmoji(c.iso2)}
            </span>
            <span>+{c.dial}</span>
          </span>
        </SelectItem>
      )),
    []
  );

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to homepage
          </Link>
          <h1 className="mt-3 text-xl font-semibold text-neutral-900 flex items-center gap-2">
            <Globe className="h-6 w-6 text-sdp-accent" aria-hidden />
            Diaspora registration
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Join SDP from outside Nigeria as a supporter. A PVC is not required; you may add
            a VIN later if you have a voter card.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        {registrationComplete ? (
          <div
            ref={successPanelRef}
            className="rounded-2xl border-2 border-sdp-accent bg-gradient-to-b from-sdp-accent/10 to-white p-6 shadow-md"
            role="status"
            aria-live="polite"
          >
            <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sdp-accent/40 bg-white px-4 py-2 text-sm font-semibold text-sdp-accent shadow-sm">
                <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
                Supporter pledge received
              </div>
              <p className="max-w-prose text-base leading-relaxed text-neutral-800">
                {THANK_YOU_MESSAGE}
              </p>
              <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:justify-start">
                <Button asChild className="min-h-[44px] bg-sdp-accent hover:bg-[#018f4e]">
                  <Link href="/">Back to homepage</Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-[44px]"
                  onClick={() => setRegistrationComplete(false)}
                >
                  Submit another registration
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {!registrationComplete ? (
        <form
          onSubmit={handleSubmit}
          className="space-y-10 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
        >
          {formError ? (
            <p
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              role="alert"
            >
              {formError}
            </p>
          ) : null}

          <section className="space-y-4">
            <SectionTitle description="Legal name and how we can reach you.">
              Identity
            </SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="d-surname">Surname</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <Input
                    id="d-surname"
                    required
                    className="pl-10 min-h-[44px]"
                    placeholder="As on official ID"
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="d-first">First name</Label>
                <Input
                  id="d-first"
                  required
                  className="min-h-[44px]"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="d-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <Input
                    id="d-email"
                    type="email"
                    required
                    className="pl-10 min-h-[44px]"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="d-phone-national">Phone</Label>
                <div className="flex items-stretch gap-2">
                  <Select value={phoneCountryIso2} onValueChange={setPhoneCountryIso2}>
                    <SelectTrigger
                      className="h-11 w-[4.75rem] shrink-0 px-2 sm:w-[5.25rem]"
                      aria-label="Country calling code"
                    >
                      <SelectValue placeholder="+" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72 min-w-[8rem]">{phoneCodeItems}</SelectContent>
                  </Select>
                  <Input
                    id="d-phone-national"
                    type="tel"
                    required
                    className="min-h-[44px] min-w-0 flex-1"
                    placeholder="Phone number"
                    autoComplete="tel-national"
                    value={phoneNational}
                    onChange={(e) => setPhoneNational(e.target.value)}
                  />
                </div>
                <p className="text-xs text-neutral-500">
                  Choose the flag and code in the small box, then enter your number (no leading 0).
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <SectionTitle description="Where you live today (outside Nigeria or your current address abroad).">
              Geography
            </SectionTitle>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="d-res-country">Country of residence</Label>
                <Select
                  value={residenceCountryIso2 || undefined}
                  onValueChange={setResidenceCountryIso2}
                  required
                >
                  <SelectTrigger id="d-res-country" className="min-h-[44px]">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">{countrySelectItems}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="d-city">City</Label>
                <Input
                  id="d-city"
                  required
                  className="min-h-[44px]"
                  autoComplete="address-level2"
                  value={residenceCity}
                  onChange={(e) => setResidenceCity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="d-address">Street address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                  <Input
                    id="d-address"
                    required
                    className="min-h-[44px] pl-10"
                    placeholder="House number, street, area"
                    autoComplete="street-address"
                    value={residenceAddress}
                    onChange={(e) => setResidenceAddress(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <SectionTitle description="State and LGA you identify with in Nigeria (origin / home ties).">
              Nigerian origin
            </SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="d-ng-state">State</Label>
                <Select
                  value={nigeriaStateId || undefined}
                  onValueChange={setNigeriaStateId}
                  disabled={statesIndexLoading}
                  required
                >
                  <SelectTrigger id="d-ng-state" className="min-h-[44px]">
                    <SelectValue
                      placeholder={
                        statesIndexLoading ? "Loading states…" : "Select state"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {states.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="d-ng-lga">LGA</Label>
                <Select
                  value={nigeriaLgaId || undefined}
                  onValueChange={setNigeriaLgaId}
                  disabled={!nigeriaStateId || stateDataLoading}
                  required
                >
                  <SelectTrigger id="d-ng-lga" className="min-h-[44px]">
                    <SelectValue
                      placeholder={
                        !nigeriaStateId
                          ? "Select state first"
                          : stateDataLoading
                            ? "Loading LGAs…"
                            : "Select LGA"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {lgas.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <SectionTitle description="Same options as domestic membership registration: device camera or upload.">
              Photos
            </SectionTitle>
            <DiasporaPhotoBlock
              label="Membership photo (optional)"
              hint="Use device camera to take a photo, or upload an existing image. Shown to admins only."
              dataUrl={portraitDataUrl}
              onDataUrl={setPortraitDataUrl}
              facingMode="user"
              error={portraitError}
              onError={setPortraitError}
            />
            <DiasporaPhotoBlock
              label="ID or proof (optional)"
              hint="e.g. passport or residence permit. Use camera or upload."
              dataUrl={idDocumentDataUrl}
              onDataUrl={setIdDocumentDataUrl}
              facingMode="environment"
              error={idDocError}
              onError={setIdDocError}
            />
          </section>

          <details className="group rounded-xl border border-neutral-200 bg-neutral-50/80 open:bg-white open:shadow-sm">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-neutral-900 [&::-webkit-details-marker]:hidden">
              <span className="inline-flex w-full items-center justify-between gap-2">
                Optional: Nigerian voter card (PVC / VIN)
                <span className="text-xs font-normal text-neutral-500">Expand</span>
              </span>
            </summary>
            <div className="space-y-4 border-t border-neutral-200 px-4 pb-4 pt-4">
              <p className="text-sm text-neutral-600">
                If you have a PVC, you may add your VIN. Leave blank if you do not have one —
                you still qualify as a supporter.
              </p>
              <div className="space-y-2">
                <Label htmlFor="d-vin">Voter identification number (VIN)</Label>
                <Input
                  id="d-vin"
                  className="min-h-[44px] font-mono text-sm"
                  placeholder="Optional"
                  autoComplete="off"
                  value={vin}
                  onChange={(e) => setVin(e.target.value)}
                />
              </div>
            </div>
          </details>

          <Button
            type="submit"
            disabled={pending}
            className="w-full min-h-[44px] bg-sdp-accent hover:bg-[#018f4e]"
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              "Submit registration"
            )}
          </Button>
        </form>
        ) : null}
      </div>
    </main>
  );
}
