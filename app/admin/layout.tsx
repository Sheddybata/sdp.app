import Link from "next/link";
import { PullToRefresh } from "@/components/PullToRefresh";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { AdminNav } from "@/components/admin/AdminNav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-100">
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-4 sm:gap-6">
            <Link href="/" className="shrink-0 font-semibold text-neutral-900">
              SDP Admin
            </Link>
            <AdminNav />
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-7xl w-full p-4 sm:p-6 lg:p-8">
        <PullToRefresh>{children}</PullToRefresh>
      </main>
    </div>
  );
}
