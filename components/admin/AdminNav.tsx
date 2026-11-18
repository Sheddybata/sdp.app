"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  ChevronDown,
  KeyRound,
  LayoutDashboard,
  Map as MapIcon,
  Ticket,
  Upload,
  UserCheck,
  Users,
  Vote,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  match?: (path: string) => boolean;
};

const PRIMARY: NavItem[] = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
    match: (p) => p === "/admin",
  },
  {
    href: "/admin/members",
    label: "Members",
    icon: <Users className="h-4 w-4" />,
  },
  {
    href: "/admin/elections",
    label: "Elections",
    icon: <Vote className="h-4 w-4" />,
  },
];

const AGENTS: NavItem[] = [
  {
    href: "/admin/agent-registrations",
    label: "Registrations",
    icon: <UserCheck className="h-4 w-4" />,
  },
  {
    href: "/admin/agent-recruitment",
    label: "ARO codes",
    icon: <KeyRound className="h-4 w-4" />,
  },
  {
    href: "/admin/agent-coverage",
    label: "Coverage",
    icon: <MapIcon className="h-4 w-4" />,
  },
];

const MORE: NavItem[] = [
  {
    href: "/admin/events",
    label: "Events & News",
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    href: "/admin/portal-invites",
    label: "Portal invites",
    icon: <Ticket className="h-4 w-4" />,
  },
  {
    href: "/admin/portal-uploads",
    label: "Bulk uploads",
    icon: <Upload className="h-4 w-4" />,
  },
];

function pathActive(pathname: string, item: NavItem): boolean {
  if (item.match) return item.match(pathname);
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLink({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate?: () => void }) {
  const active = pathActive(pathname, item);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-sdp-primary/10 text-sdp-primary" : "text-neutral-700 hover:bg-neutral-100"
      )}
    >
      {item.icon}
      {item.label}
    </Link>
  );
}

function NavMenu({
  label,
  items,
  pathname,
  accent,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  accent?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const childActive = items.some((item) => pathActive(pathname, item));

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          childActive || open
            ? accent || childActive
              ? "bg-sdp-primary/10 text-sdp-primary"
              : "bg-neutral-100 text-neutral-900"
            : "text-neutral-700 hover:bg-neutral-100"
        )}
      >
        {label}
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute left-0 top-full z-50 mt-1 min-w-[12rem] rounded-xl border border-neutral-200 bg-white p-1 shadow-lg"
        >
          {items.map((item) => (
            <div key={item.href} role="none">
              <NavLink item={item} pathname={pathname} onNavigate={() => setOpen(false)} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AdminNav() {
  const pathname = usePathname() || "/admin";

  return (
    <nav
      className="-mx-1 flex max-w-full items-center gap-0.5 overflow-x-auto px-1 sm:gap-1"
      aria-label="Admin navigation"
    >
      {PRIMARY.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} />
      ))}
      <NavMenu label="Agents" items={AGENTS} pathname={pathname} accent />
      <NavMenu label="More" items={MORE} pathname={pathname} />
    </nav>
  );
}
