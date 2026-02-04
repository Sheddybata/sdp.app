import Link from "next/link";
import { LayoutDashboard, Users, Calendar } from "lucide-react";
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
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="font-semibold text-neutral-900">
            SDP Admin
          </Link>
          <div className="flex items-center gap-4">
            <nav className="flex gap-2" aria-label="Admin navigation">
              <Link
                href="/admin"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                href="/admin/members"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
              >
                <Users className="h-4 w-4" />
                Members
              </Link>
              <Link
                href="/admin/events"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
              >
                <Calendar className="h-4 w-4" />
                Events & News
              </Link>
            </nav>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl w-full p-4 sm:p-6 lg:p-8">
        <PullToRefresh>{children}</PullToRefresh>
      </main>
    </div>
  );
}
