"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { portalLogin } from "@/app/actions/portalAuth";

type PortalVariant = "agent" | "cluster";

const variantStyles: Record<
  PortalVariant,
  { ring: string; button: string; badge: string }
> = {
  agent: {
    ring: "ring-sdp-primary/20",
    button: "bg-sdp-primary hover:bg-sdp-primary/90",
    badge: "bg-sdp-primary/10 text-sdp-primary",
  },
  // Cluster uses SDP accent (green) — same brand palette as enrollment CTAs
  cluster: {
    ring: "ring-sdp-accent/25",
    button: "bg-sdp-accent hover:bg-[#018f4e]",
    badge: "bg-sdp-accent/10 text-sdp-accent",
  },
};

export function PortalLoginPage({
  variant,
  title,
  subtitle,
  dashboardPath,
  signupPath,
}: {
  variant: PortalVariant;
  title: string;
  subtitle: string;
  dashboardPath: string;
  signupPath: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const s = variantStyles[variant];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    setIsLoading(true);
    const result = await portalLogin(variant, email, password);
    setIsLoading(false);
    if (result.success) {
      const next = new URLSearchParams(
        typeof window !== "undefined" ? window.location.search : ""
      ).get("next");
      const dest =
        next && next.startsWith(`/${variant}`) && next !== `/${variant}/login`
          ? next
          : dashboardPath;
      router.push(dest);
      router.refresh();
    } else {
      setError(result.error);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to homepage
        </Link>

        <div
          className={cn(
            "bg-white rounded-xl border border-neutral-200 shadow-sm p-6 sm:p-8 ring-2",
            s.ring
          )}
        >
          <div className="text-center mb-6">
            <span
              className={cn(
                "inline-block text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full mb-3",
                s.badge
              )}
            >
              {variant === "agent" ? "Field agent" : "Cluster lead"}
            </span>
            <h1 className="text-2xl font-semibold text-neutral-900">{title}</h1>
            <p className="mt-2 text-sm text-neutral-600">{subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="portal-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  id="portal-email"
                  type="email"
                  placeholder="you@sdp.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 min-h-[44px]"
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="portal-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  id="portal-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 min-h-[44px]"
                  autoComplete="current-password"
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className={cn("w-full min-h-[44px] text-white", s.button)}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>

            <p className="text-center text-sm text-neutral-600">
              First time here?{" "}
              <Link href={signupPath} className="font-medium text-neutral-900 underline">
                Create an account with your invitation code
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
