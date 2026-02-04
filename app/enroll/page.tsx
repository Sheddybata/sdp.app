"use client";

import Link from "next/link";
import { UserPlus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionCard } from "@/components/ActionCard";

export default function EnrollHubPage() {
  return (
    <main className="min-h-screen bg-neutral-50 flex flex-col">
      <div className="mx-auto w-full max-w-content flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <section className="max-w-content-narrow mx-auto">
          <h1 className="text-display-sm font-bold text-neutral-900 mb-2">
            Member Enrollment
          </h1>
          <p className="text-body text-neutral-600 mb-8">
            Enroll as a new member or verify an existing membership
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-8">
            <ActionCard
              href="/enroll/new"
              icon={UserPlus}
              title="New Enrollment"
              description="Start the member registration form"
              primary
              aria-label="Start new member enrollment"
            />
            <ActionCard
              href="/enroll/verify"
              icon={ShieldCheck}
              title="Verify Membership"
              description="Check status by ID or voter card"
              aria-label="Verify existing membership"
            />
          </div>

          <p className="text-overline text-neutral-500 text-center">Verify by Membership ID or Voter ID</p>
        </section>
      </div>
    </main>
  );
}
