"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  ChevronsLeft,
  ChevronsRight,
  KeyRound,
  LayoutDashboard,
  Map as MapIcon,
  Menu,
  Ticket,
  Upload,
  UserCheck,
  Users,
  Vote,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { PullToRefresh } from "@/components/PullToRefresh";
import { Button } from "@/components/ui/button";

const SIDEBAR_KEY = "sdp-admin-sidebar-collapsed";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  match?: (path: string) => boolean;
};

type NavSection = { title: string; items: NavItem[] };

const SECTIONS: NavSection[] = [
  {
    title: "Main",
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        icon: <LayoutDashboard className="h-4 w-4 shrink-0" />,
        match: (p) => p === "/admin",
      },
      {
        href: "/admin/members",
        label: "Members",
        icon: <Users className="h-4 w-4 shrink-0" />,
      },
      {
        href: "/admin/elections",
        label: "Elections",
        icon: <Vote className="h-4 w-4 shrink-0" />,
      },
    ],
  },
  {
    title: "Agents",
    items: [
      {
        href: "/admin/agent-registrations",
        label: "Registrations",
        icon: <UserCheck className="h-4 w-4 shrink-0" />,
      },
      {
        href: "/admin/agent-recruitment",
        label: "ARO codes",
        icon: <KeyRound className="h-4 w-4 shrink-0" />,
      },
      {
        href: "/admin/agent-coverage",
        label: "Coverage",
        icon: <MapIcon className="h-4 w-4 shrink-0" />,
      },
    ],
  },
  {
    title: "More",
    items: [
      {
        href: "/admin/events",
        label: "Events & News",
        icon: <Calendar className="h-4 w-4 shrink-0" />,
      },
      {
        href: "/admin/portal-invites",
        label: "Portal invites",
        icon: <Ticket className="h-4 w-4 shrink-0" />,
      },
      {
        href: "/admin/portal-uploads",
        label: "Bulk uploads",
        icon: <Upload className="h-4 w-4 shrink-0" />,
      },
    ],
  },
];

function pathActive(pathname: string, item: NavItem): boolean {
  if (item.match) return item.match(pathname);
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function pageTitle(pathname: string): string {
  for (const section of SECTIONS) {
    for (const item of section.items) {
      if (pathActive(pathname, item)) return item.label;
    }
  }
  return "Admin";
}

function SidebarNav({
  pathname,
  collapsed,
  onNavigate,
}: {
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-2 py-3" aria-label="Admin navigation">
      {SECTIONS.map((section) => (
        <div key={section.title}>
          {!collapsed ? (
            <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
              {section.title}
            </p>
          ) : (
            <div className="mb-1 border-t border-neutral-200 first:border-0 first:pt-0" aria-hidden />
          )}
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = pathActive(pathname, item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                      collapsed && "justify-center px-2",
                      active
                        ? "bg-sdp-primary/10 text-sdp-primary"
                        : "text-neutral-700 hover:bg-neutral-100"
                    )}
                  >
                    {item.icon}
                    {!collapsed ? <span className="truncate">{item.label}</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/admin";
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const isLogin = pathname === "/admin/login";

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1");
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!ready || isLogin) return;
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed, ready, isLogin]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  if (isLogin) {
    return <>{children}</>;
  }

  const desktopWidth = collapsed ? "md:w-[4.5rem]" : "md:w-60";
  const desktopPad = collapsed ? "md:pl-[4.5rem]" : "md:pl-60";

  return (
    <div className="min-h-screen bg-neutral-100">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-neutral-200 bg-white md:flex md:flex-col",
          desktopWidth
        )}
      >
        <div
          className={cn(
            "flex h-14 shrink-0 items-center border-b border-neutral-200 px-3",
            collapsed ? "justify-center" : "justify-between gap-2"
          )}
        >
          {!collapsed ? (
            <Link href="/admin" className="truncate font-semibold text-neutral-900">
              SDP Admin
            </Link>
          ) : (
            <Link
              href="/admin"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-sdp-primary/10 text-sm font-bold text-sdp-primary"
              title="SDP Admin"
            >
              S
            </Link>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-neutral-600"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </Button>
        </div>
        <SidebarNav pathname={pathname} collapsed={collapsed} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] flex-col bg-white shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-neutral-200 px-3">
              <Link href="/admin" className="font-semibold text-neutral-900" onClick={() => setMobileOpen(false)}>
                SDP Admin
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <SidebarNav pathname={pathname} collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className={cn("flex min-h-screen flex-col", desktopPad)}>
        <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white shadow-sm">
          <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 md:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-neutral-900">{pageTitle(pathname)}</p>
                <p className="hidden text-xs text-neutral-500 sm:block">National secretariat</p>
              </div>
            </div>
            <LogoutButton />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">
          <PullToRefresh>{children}</PullToRefresh>
        </main>
      </div>
    </div>
  );
}
