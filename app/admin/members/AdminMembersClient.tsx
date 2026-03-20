"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { filterMembers, type MemberRecord } from "@/lib/mock-members";
import { NIGERIA_STATES } from "@/lib/nigeria-geo";
import type { DiasporaSupporterRecord } from "@/lib/db/diaspora-supporters";
import { getCountryName } from "@/lib/data/country-dial-codes";
import { flagEmoji } from "@/lib/geo/flag-emoji";
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
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MemberCardFitPreview } from "@/components/enrollment/MemberCardFitPreview";
import { Download, Search, FileDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import { jsPDF } from "jspdf";

function getStateName(id: string) {
  return NIGERIA_STATES.find((s) => s.id === id)?.name ?? id;
}

function getLGAName(stateId: string, lgaId: string) {
  const state = NIGERIA_STATES.find((s) => s.id === stateId);
  return state?.lgas.find((l) => l.id === lgaId)?.name ?? lgaId;
}

function getWardName(stateId: string, lgaId: string, wardId: string) {
  const state = NIGERIA_STATES.find((s) => s.id === stateId);
  const lga = state?.lgas.find((l) => l.id === lgaId);
  return lga?.wards.find((w) => w.id === wardId)?.name ?? wardId;
}

type AdminMembersTab = "domestic" | "diaspora";

export function AdminMembersClient({
  initialMembers,
  initialDiaspora = [],
}: {
  initialMembers: MemberRecord[];
  initialDiaspora?: DiasporaSupporterRecord[];
}) {
  const [tab, setTab] = useState<AdminMembersTab>("domestic");
  const [search, setSearch] = useState("");
  const [diasporaSearch, setDiasporaSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [lgaFilter, setLgaFilter] = useState("");
  const [wardFilter, setWardFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedMember, setSelectedMember] = useState<MemberRecord | null>(null);
  const [selectedDiaspora, setSelectedDiaspora] = useState<DiasporaSupporterRecord | null>(
    null
  );
  const [sortBy, setSortBy] = useState<keyof MemberRecord>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const membersPerPage = 50;

  const filtered = useMemo(
    () =>
      filterMembers(initialMembers, {
        search: search || undefined,
        state: stateFilter || undefined,
        lga: lgaFilter || undefined,
        ward: wardFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    [initialMembers, search, stateFilter, lgaFilter, wardFilter, dateFrom, dateTo]
  );

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const va = a[sortBy];
      const vb = b[sortBy];
      if (va == null && vb == null) return 0;
      if (va == null) return sortDir === "asc" ? 1 : -1;
      if (vb == null) return sortDir === "asc" ? -1 : 1;
      const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  // Pagination calculations
  const totalPages = Math.ceil(sorted.length / membersPerPage);
  const startIndex = (currentPage - 1) * membersPerPage;
  const endIndex = startIndex + membersPerPage;
  const paginatedMembers = sorted.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, stateFilter, lgaFilter, wardFilter, dateFrom, dateTo]);

  useEffect(() => {
    setCurrentPage(1);
  }, [tab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [diasporaSearch]);

  const filteredDiaspora = useMemo(() => {
    const q = diasporaSearch.trim().toLowerCase();
    if (!q) return initialDiaspora;
    return initialDiaspora.filter(
      (d) =>
        d.surname.toLowerCase().includes(q) ||
        d.firstName.toLowerCase().includes(q) ||
        d.email.toLowerCase().includes(q) ||
        d.phoneE164.toLowerCase().includes(q) ||
        d.residenceCity.toLowerCase().includes(q) ||
        (d.vin && d.vin.toLowerCase().includes(q))
    );
  }, [initialDiaspora, diasporaSearch]);

  const diasporaTotalPages = Math.max(1, Math.ceil(filteredDiaspora.length / membersPerPage));
  const diasporaStart = (currentPage - 1) * membersPerPage;
  const paginatedDiaspora = filteredDiaspora.slice(
    diasporaStart,
    diasporaStart + membersPerPage
  );

  const toggleSort = useCallback((key: keyof MemberRecord) => {
    setSortBy(key);
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  }, []);

  const handleExportDiasporaCSV = useCallback(() => {
    const headers = [
      "ID",
      "Surname",
      "FirstName",
      "Email",
      "PhoneE164",
      "PhoneCountry",
      "ResidenceCountry",
      "City",
      "Address",
      "NigeriaStateId",
      "NigeriaLGAId",
      "NigeriaStateName",
      "NigeriaLGAName",
      "VIN",
      "RegisteredVia",
      "CreatedAt",
    ];
    const rows = filteredDiaspora.map((d) =>
      [
        d.id,
        d.surname,
        d.firstName,
        d.email,
        d.phoneE164,
        d.phoneCountryIso2,
        d.residenceCountryIso2,
        d.residenceCity,
        d.residenceAddress.replace(/\n/g, " "),
        d.nigeriaStateId,
        d.nigeriaLgaId,
        d.nigeriaStateName,
        d.nigeriaLgaName,
        d.vin ?? "",
        d.registeredVia,
        d.createdAt,
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SDP-Diaspora-Supporters-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredDiaspora]);

  const handleExportCSV = useCallback(() => {
    const headers = [
      "ID",
      "Title",
      "Surname",
      "FirstName",
      "OtherNames",
      "NIN",
      "Phone",
      "Email",
      "DOB",
      "Address",
      "JoinDate",
      "State",
      "LGA",
      "Ward",
      "PollingUnit",
      "VoterID",
      "Gender",
      "RegisteredBy",
      "MembershipStatus",
      "MonthsOwed",
      "AmountOwed",
      "MonthlyDue",
    ];
    const rows = sorted.map((m) =>
      [
        m.id,
        m.title,
        m.surname,
        m.firstName,
        m.otherNames ?? "",
        m.nin ?? "",
        m.phone,
        m.email ?? "",
        m.dateOfBirth,
        m.address ?? "",
        m.joinDate ?? "",
        getStateName(m.state),
        getLGAName(m.state, m.lga),
        getWardName(m.state, m.lga, m.ward),
        m.pollingUnit ?? "",
        m.voterRegistrationNumber,
        m.gender ?? "",
        m.registeredBy ?? "",
        m.membershipStatus ?? "",
        m.monthsOwed ?? "",
        m.amountOwed ?? "",
        m.monthlyDue ?? "",
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SDP-Members-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sorted]);

  const handleExportPDF = useCallback(() => {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm" });
    pdf.setFontSize(14);
    pdf.text("SDP Member List (filtered)", 14, 14);
    pdf.setFontSize(10);
    let y = 22;
    sorted.slice(0, 50).forEach((m, i) => {
      if (y > 270) { pdf.addPage(); y = 14; }
      pdf.text(`${i + 1}. ${m.surname} ${m.firstName} - ${m.voterRegistrationNumber} - ${getStateName(m.state)}`, 14, y);
      y += 6;
    });
    pdf.save(`SDP-Members-${new Date().toISOString().slice(0, 10)}.pdf`);
  }, [sorted]);

  const handleExportDiasporaPDF = useCallback(() => {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm" });
    pdf.setFontSize(14);
    pdf.text("SDP Diaspora supporters (filtered)", 14, 14);
    pdf.setFontSize(10);
    let y = 22;
    filteredDiaspora.slice(0, 50).forEach((d, i) => {
      if (y > 270) { pdf.addPage(); y = 14; }
      pdf.text(
        `${i + 1}. ${d.surname} ${d.firstName} — ${d.email} — ${d.phoneE164}`,
        14,
        y
      );
      y += 6;
    });
    pdf.save(`SDP-Diaspora-${new Date().toISOString().slice(0, 10)}.pdf`);
  }, [filteredDiaspora]);

  const lgas = stateFilter ? NIGERIA_STATES.find((s) => s.id === stateFilter)?.lgas ?? [] : [];
  const wards = stateFilter && lgaFilter ? NIGERIA_STATES.find((s) => s.id === stateFilter)?.lgas.find((l) => l.id === lgaFilter)?.wards ?? [] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Master Member Table</h1>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={tab === "domestic" ? handleExportCSV : handleExportDiasporaCSV}
            className="min-h-[44px]"
            aria-label="Export to CSV"
          >
            <FileDown className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={tab === "domestic" ? handleExportPDF : handleExportDiasporaPDF}
            className="min-h-[44px]"
            aria-label="Export to PDF"
          >
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-neutral-200 bg-white p-2 shadow-sm">
        <Button
          type="button"
          variant={tab === "domestic" ? "default" : "ghost"}
          className={tab === "domestic" ? "min-h-[44px] bg-sdp-primary" : "min-h-[44px]"}
          onClick={() => setTab("domestic")}
        >
          Domestic members ({initialMembers.length})
        </Button>
        <Button
          type="button"
          variant={tab === "diaspora" ? "default" : "ghost"}
          className={tab === "diaspora" ? "min-h-[44px] bg-sdp-primary" : "min-h-[44px]"}
          onClick={() => setTab("diaspora")}
        >
          Diaspora supporters ({initialDiaspora.length})
        </Button>
      </div>

      {tab === "domestic" ? (
      <>
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-neutral-700">Filters (applied to export)</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="space-y-2">
            <Label htmlFor="search">Global Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input id="search" placeholder="Name, Voter ID, Phone" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 min-h-[44px]" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Select value={stateFilter || "__all__"} onValueChange={(v) => { setStateFilter(v === "__all__" ? "" : v); setLgaFilter(""); setWardFilter(""); }}>
              <SelectTrigger id="state" className="min-h-[44px]"><SelectValue placeholder="All states" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All states</SelectItem>
                {NIGERIA_STATES.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lga">LGA</Label>
            <Select value={lgaFilter || "__all__"} onValueChange={(v) => { setLgaFilter(v === "__all__" ? "" : v); setWardFilter(""); }} disabled={!stateFilter}>
              <SelectTrigger id="lga" className="min-h-[44px]"><SelectValue placeholder="All LGAs" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All LGAs</SelectItem>
                {lgas.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ward">Ward</Label>
            <Select value={wardFilter || "__all__"} onValueChange={(v) => setWardFilter(v === "__all__" ? "" : v)} disabled={!lgaFilter}>
              <SelectTrigger id="ward" className="min-h-[44px]"><SelectValue placeholder="All wards" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All wards</SelectItem>
                {wards.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateFrom">Date From</Label>
            <Input id="dateFrom" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="min-h-[44px]" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateTo">Date To</Label>
            <Input id="dateTo" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="min-h-[44px]" />
          </div>
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          Showing {startIndex + 1}-{Math.min(endIndex, sorted.length)} of {sorted.length} member(s). Export respects current filters.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50">
              <tr>
                <th className="px-4 py-3 font-semibold text-neutral-700"><button type="button" onClick={() => toggleSort("surname")} className="hover:text-sdp-primary">Name {sortBy === "surname" && (sortDir === "asc" ? "↑" : "↓")}</button></th>
                <th className="px-4 py-3 font-semibold text-neutral-700"><button type="button" onClick={() => toggleSort("phone")} className="hover:text-sdp-primary">Phone {sortBy === "phone" && (sortDir === "asc" ? "↑" : "↓")}</button></th>
                <th className="px-4 py-3 font-semibold text-neutral-700"><button type="button" onClick={() => toggleSort("state")} className="hover:text-sdp-primary">State {sortBy === "state" && (sortDir === "asc" ? "↑" : "↓")}</button></th>
                <th className="px-4 py-3 font-semibold text-neutral-700">LGA / Ward</th>
                <th className="px-4 py-3 font-semibold text-neutral-700"><button type="button" onClick={() => toggleSort("voterRegistrationNumber")} className="hover:text-sdp-primary">Voter ID {sortBy === "voterRegistrationNumber" && (sortDir === "asc" ? "↑" : "↓")}</button></th>
                <th className="px-4 py-3 font-semibold text-neutral-700"><button type="button" onClick={() => toggleSort("joinDate")} className="hover:text-sdp-primary">Join Date {sortBy === "joinDate" && (sortDir === "asc" ? "↑" : "↓")}</button></th>
                <th className="px-4 py-3 font-semibold text-neutral-700">Status</th>
                <th className="px-4 py-3 font-semibold text-neutral-700">Owed (₦)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <p className="font-medium text-neutral-900">No members found</p>
                    <p className="mt-1 text-sm text-neutral-600">Enrollment will populate this list. Try adjusting your filters.</p>
                  </td>
                </tr>
              ) : paginatedMembers.map((m) => (
                <tr key={m.id} role="button" tabIndex={0} onClick={() => setSelectedMember(m)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedMember(m); } }} className="cursor-pointer hover:bg-sdp-primary/5 focus:bg-sdp-primary/5 focus:outline-none min-h-[44px]" aria-label={`View profile for ${m.surname} ${m.firstName}`}>
                  <td className="px-4 py-3 font-medium text-neutral-900">{m.title} {m.surname} {m.firstName}</td>
                  <td className="px-4 py-3 text-neutral-600">{m.phone}</td>
                  <td className="px-4 py-3 text-neutral-600">{getStateName(m.state)}</td>
                  <td className="px-4 py-3 text-neutral-600">{getLGAName(m.state, m.lga)} / {getWardName(m.state, m.lga, m.ward)}</td>
                  <td className="px-4 py-3 font-mono text-neutral-700">{m.voterRegistrationNumber}</td>
                  <td className="px-4 py-3 text-neutral-600">{m.joinDate ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-600">{m.membershipStatus ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-600">{m.amountOwed != null ? m.amountOwed : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sorted.length > membersPerPage && (
          <div className="flex items-center justify-between border-t border-neutral-200 bg-neutral-50 px-4 py-3">
            <div className="text-sm text-neutral-600">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="min-h-[44px]"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="min-h-[44px]"
                aria-label="Next page"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
      </>
      ) : (
      <>
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-neutral-700">Search diaspora supporters</h2>
        <div className="max-w-md space-y-2">
          <Label htmlFor="diaspora-search">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              id="diaspora-search"
              placeholder="Name, email, phone, city, VIN"
              value={diasporaSearch}
              onChange={(e) => setDiasporaSearch(e.target.value)}
              className="pl-9 min-h-[44px]"
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          Showing {filteredDiaspora.length === 0 ? 0 : diasporaStart + 1}-
          {Math.min(diasporaStart + membersPerPage, filteredDiaspora.length)} of{" "}
          {filteredDiaspora.length} supporter(s).
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50">
              <tr>
                <th className="px-4 py-3 font-semibold text-neutral-700">Name</th>
                <th className="px-4 py-3 font-semibold text-neutral-700">Email</th>
                <th className="px-4 py-3 font-semibold text-neutral-700">Phone</th>
                <th className="px-4 py-3 font-semibold text-neutral-700">Residence</th>
                <th className="px-4 py-3 font-semibold text-neutral-700">State / LGA (NG)</th>
                <th className="px-4 py-3 font-semibold text-neutral-700">VIN</th>
                <th className="px-4 py-3 font-semibold text-neutral-700">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredDiaspora.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <p className="font-medium text-neutral-900">No diaspora supporters yet</p>
                    <p className="mt-1 text-sm text-neutral-600">
                      Registrations from <span className="font-mono">/enroll/diaspora</span> appear here after you run migration <code className="rounded bg-neutral-100 px-1">012_diaspora_supporters</code>.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedDiaspora.map((d) => (
                  <tr
                    key={d.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedDiaspora(d)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedDiaspora(d);
                      }
                    }}
                    className="cursor-pointer hover:bg-sdp-primary/5 focus:bg-sdp-primary/5 focus:outline-none min-h-[44px]"
                    aria-label={`View ${d.surname} ${d.firstName}`}
                  >
                    <td className="px-4 py-3 font-medium text-neutral-900">
                      {d.surname} {d.firstName}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{d.email}</td>
                    <td className="px-4 py-3 font-mono text-neutral-700">{d.phoneE164}</td>
                    <td className="px-4 py-3 text-neutral-600">
                      <span className="mr-1" aria-hidden>
                        {flagEmoji(d.residenceCountryIso2)}
                      </span>
                      {getCountryName(d.residenceCountryIso2) ?? d.residenceCountryIso2} ·{" "}
                      {d.residenceCity}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {d.nigeriaStateName} / {d.nigeriaLgaName}
                    </td>
                    <td className="px-4 py-3 font-mono text-neutral-700">{d.vin ?? "—"}</td>
                    <td className="px-4 py-3 text-neutral-600">
                      {d.createdAt?.slice(0, 10) ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filteredDiaspora.length > membersPerPage && (
          <div className="flex items-center justify-between border-t border-neutral-200 bg-neutral-50 px-4 py-3">
            <div className="text-sm text-neutral-600">
              Page {currentPage} of {diasporaTotalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="min-h-[44px]"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.min(diasporaTotalPages, p + 1))}
                disabled={currentPage === diasporaTotalPages}
                className="min-h-[44px]"
                aria-label="Next page"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
      </>
      )}

      <Sheet open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <SheetContent
          side="right"
          className="flex w-full min-w-0 max-w-full flex-col gap-0 overflow-x-hidden overflow-y-auto p-0"
        >
          {selectedMember && (
            <>
              <SheetHeader className="sticky top-0 z-10 shrink-0 space-y-0 border-b border-neutral-200 bg-white px-4 py-3 sm:px-6">
                <div className="flex items-start justify-between gap-3">
                  <SheetTitle className="min-w-0 flex-1 text-left text-base leading-snug sm:text-lg">
                    {`${selectedMember.title} ${selectedMember.surname} ${selectedMember.firstName}`}
                  </SheetTitle>
                  <SheetClose asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0 border-neutral-300"
                      aria-label="Close member preview"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </SheetClose>
                </div>
              </SheetHeader>
              <div className="min-w-0 flex-1 space-y-6 px-4 py-4 sm:px-6 sm:py-6">
                <MemberCardFitPreview data={selectedMember} />
                <dl className="min-w-0 space-y-4 text-sm">
                  {(
                    [
                      ["NIN", selectedMember.nin || "—"],
                      ["Phone", selectedMember.phone],
                      ["Email", selectedMember.email || "—"],
                      ["DOB", selectedMember.dateOfBirth],
                      ["Address", selectedMember.address || "—"],
                      ["Polling Unit", selectedMember.pollingUnit || "—"],
                      ["Registered By", selectedMember.registeredBy ?? "—"],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label} className="min-w-0 grid gap-1 sm:grid-cols-[minmax(0,7rem)_minmax(0,1fr)] sm:gap-x-3">
                      <dt className="shrink-0 font-medium text-neutral-500">{label}</dt>
                      <dd className="min-w-0 break-words font-medium text-neutral-900">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet
        open={!!selectedDiaspora}
        onOpenChange={(open) => !open && setSelectedDiaspora(null)}
      >
        <SheetContent
          side="right"
          className="flex w-full min-w-0 max-w-full flex-col gap-0 overflow-x-hidden overflow-y-auto p-0"
        >
          {selectedDiaspora && (
            <>
              <SheetHeader className="sticky top-0 z-10 shrink-0 space-y-0 border-b border-neutral-200 bg-white px-4 py-3 sm:px-6">
                <div className="flex items-start justify-between gap-3">
                  <SheetTitle className="min-w-0 flex-1 text-left text-base leading-snug sm:text-lg">
                    Diaspora supporter · {selectedDiaspora.surname}{" "}
                    {selectedDiaspora.firstName}
                  </SheetTitle>
                  <SheetClose asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0 border-neutral-300"
                      aria-label="Close"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </SheetClose>
                </div>
              </SheetHeader>
              <div className="min-w-0 flex-1 space-y-6 px-4 py-4 sm:px-6 sm:py-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  {selectedDiaspora.portraitDataUrl ? (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-neutral-500">Membership photo</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedDiaspora.portraitDataUrl}
                        alt="Portrait"
                        className="max-h-48 w-full rounded-lg border border-neutral-200 object-cover"
                      />
                    </div>
                  ) : null}
                  {selectedDiaspora.idDocumentDataUrl ? (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-neutral-500">ID / proof</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedDiaspora.idDocumentDataUrl}
                        alt="ID document"
                        className="max-h-48 w-full rounded-lg border border-neutral-200 object-cover"
                      />
                    </div>
                  ) : null}
                </div>
                <dl className="min-w-0 space-y-4 text-sm">
                  {(
                    [
                      ["Email", selectedDiaspora.email],
                      ["Phone", selectedDiaspora.phoneE164],
                      [
                        "Phone country",
                        `${flagEmoji(selectedDiaspora.phoneCountryIso2)} ${getCountryName(selectedDiaspora.phoneCountryIso2) ?? selectedDiaspora.phoneCountryIso2}`,
                      ],
                      [
                        "Residence",
                        `${flagEmoji(selectedDiaspora.residenceCountryIso2)} ${getCountryName(selectedDiaspora.residenceCountryIso2) ?? selectedDiaspora.residenceCountryIso2} · ${selectedDiaspora.residenceCity}`,
                      ],
                      ["Address", selectedDiaspora.residenceAddress],
                      [
                        "Nigeria (origin)",
                        `${selectedDiaspora.nigeriaStateName} / ${selectedDiaspora.nigeriaLgaName}`,
                      ],
                      ["VIN", selectedDiaspora.vin ?? "—"],
                      ["Registered", selectedDiaspora.createdAt?.slice(0, 19) ?? "—"],
                    ] as const
                  ).map(([label, value]) => (
                    <div
                      key={label}
                      className="min-w-0 grid gap-1 sm:grid-cols-[minmax(0,7rem)_minmax(0,1fr)] sm:gap-x-3"
                    >
                      <dt className="shrink-0 font-medium text-neutral-500">{label}</dt>
                      <dd className="min-w-0 break-words font-medium text-neutral-900">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="text-xs text-neutral-500">
                  Diaspora supporters are stored in the <code className="rounded bg-neutral-100 px-1">diaspora_supporters</code> table (not the domestic <code className="rounded bg-neutral-100 px-1">members</code> PVC register). There is no SDP membership card PDF for this path unless you add one later.
                </p>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
