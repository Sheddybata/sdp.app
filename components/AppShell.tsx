"use client";

import Link from "next/link";
import Image from "next/image";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function AppShell() {
  return (
    <header role="banner" className="sticky top-0 z-40 border-b border-neutral-200 bg-white shadow-sm" dir="ltr">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center shrink-0 text-neutral-900 hover:opacity-80 transition-opacity min-h-[44px] min-w-[44px] -ms-2"
          aria-label="SDP Member Portal - Home"
        >
          <Image 
            src="/sdplogo.jpg" 
            alt="" 
            width={36} 
            height={36} 
            className="rounded object-contain" 
            style={{ width: '36px', height: 'auto' }}
          />
        </Link>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
