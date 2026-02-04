"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { filterMembers, type MemberRecord } from "@/lib/mock-members";
import { NIGERIA_STATES } from "@/lib/nigeria-geo";
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
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MemberCard } from "@/components/enrollment/MemberCard";
import { Download, Search, FileDown, ChevronLeft, ChevronRight } from "lucide-react";
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

export function AdminMembersClient({ initialMembers }: { initialMembers: MemberRecord[] }) {
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [lgaFilter, setLgaFilter] = useState("");
  const [wardFilter, setWardFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedMember, setSelectedMember] = useState<MemberRecord | null>(null);
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

  const toggleSort = useCallback((key: keyof MemberRecord) => {
    setSortBy(key);
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  }, []);

  const handleExportCSV = useCallback(() => {
    const headers = ["ID", "Title", "Surname", "FirstName", "OtherNames", "Phone", "Email", "DOB", "JoinDate", "State", "LGA", "Ward", "VoterID", "Gender", "RegisteredBy"];
    const rows = sorted.map((m) =>
      [m.id, m.title, m.surname, m.firstName, m.otherNames ?? "", m.phone, m.email ?? "", m.dateOfBirth, m.joinDate ?? "", getStateName(m.state), getLGAName(m.state, m.lga), getWardName(m.state, m.lga, m.ward), m.voterRegistrationNumber, m.gender ?? "", m.registeredBy ?? ""].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
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

  const lgas = stateFilter ? NIGERIA_STATES.find((s) => s.id === stateFilter)?.lgas ?? [] : [];
  const wards = stateFilter && lgaFilter ? NIGERIA_STATES.find((s) => s.id === stateFilter)?.lgas.find((l) => l.id === lgaFilter)?.wards ?? [] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Master Member Table</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExportCSV} className="min-h-[44px]" aria-label="Export to CSV">
            <FileDown className="h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={handleExportPDF} className="min-h-[44px]" aria-label="Export to PDF">
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

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
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
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

      <Sheet open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedMember ? `${selectedMember.title} ${selectedMember.surname} ${selectedMember.firstName}` : "Member Profile"}</SheetTitle>
          </SheetHeader>
          {selectedMember && (
            <div className="mt-6 space-y-6">
              <MemberCard data={{ ...selectedMember, portraitDataUrl: selectedMember.portraitDataUrl }} showBarcode={true} />
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="text-neutral-500">Phone</dt><dd className="font-medium">{selectedMember.phone}</dd>
                <dt className="text-neutral-500">Email</dt><dd className="font-medium">{selectedMember.email || "—"}</dd>
                <dt className="text-neutral-500">DOB</dt><dd className="font-medium">{selectedMember.dateOfBirth}</dd>
                <dt className="text-neutral-500">Registered By</dt><dd className="font-medium">{selectedMember.registeredBy ?? "—"}</dd>
              </dl>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
