import Link from "next/link";
import { LayoutDashboard, Users, Calendar, Ticket, Upload, UserCheck, Map as MapIcon, Vote, KeyRound } from "lucide-react";
import { PullToRefresh } from "@/components/PullToRefresh";
import { LogoutButton } from "@/components/admin/LogoutButton";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-100">
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-2 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex shrink-0 items-center justify-between gap-4">
            <Link href="/" className="font-semibold text-neutral-900">
              SDP Admin
            </Link>
            <div className="lg:hidden">
              <LogoutButton />
            </div>
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <nav
              className="-mx-1 flex min-w-0 flex-1 flex-wrap gap-1 overflow-x-auto px-1 pb-1 lg:flex-nowrap lg:overflow-x-auto"
              aria-label="Admin navigation"
            >
              <Link
                href="/admin"
                className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                href="/admin/members"
                className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
              >
                <Users className="h-4 w-4" />
                Members
              </Link>
              <Link
                href="/admin/events"
                className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
              >
                <Calendar className="h-4 w-4" />
                Events & News
              </Link>
              <Link
                href="/admin/portal-invites"
                className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
              >
                <Ticket className="h-4 w-4" />
                Portal invites
              </Link>
              <Link
                href="/admin/agent-recruitment"
                className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-sdp-primary hover:bg-sdp-primary/10"
              >
                <KeyRound className="h-4 w-4" />
                ARO codes
              </Link>
              <Link
                href="/admin/agent-registrations"
                className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
              >
                <UserCheck className="h-4 w-4" />
                Agent registrations
              </Link>
              <Link
                href="/admin/agent-coverage"
                className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
              >
                <MapIcon className="h-4 w-4" />
                Agent coverage
              </Link>
              <Link
                href="/admin/elections"
                className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
              >
                <Vote className="h-4 w-4" />
                Elections
              </Link>
              <Link
                href="/admin/portal-uploads"
                className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
              >
                <Upload className="h-4 w-4" />
                Bulk uploads
              </Link>
            </nav>
            <div className="hidden shrink-0 lg:block">
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl w-full p-4 sm:p-6 lg:p-8">
        <PullToRefresh>{children}</PullToRefresh>
      </main>
    </div>
  );
}
