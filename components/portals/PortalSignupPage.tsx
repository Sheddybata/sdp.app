"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Lock, Mail, Phone, User, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { portalSignup } from "@/app/actions/portalAuth";
import type { PortalRole } from "@/lib/portal-token";

const variantStyles: Record<
  PortalRole,
  { ring: string; button: string; badge: string }
> = {
  agent: {
    ring: "ring-sdp-primary/20",
    button: "bg-sdp-primary hover:bg-sdp-primary/90",
    badge: "bg-sdp-primary/10 text-sdp-primary",
  },
  cluster: {
    ring: "ring-sdp-accent/25",
    button: "bg-sdp-accent hover:bg-[#018f4e]",
    badge: "bg-sdp-accent/10 text-sdp-accent",
  },
};

export function PortalSignupPage({
  variant,
  title,
  subtitle,
  loginPath,
  dashboardPath,
}: {
  variant: PortalRole;
  title: string;
  subtitle: string;
  loginPath: string;
  dashboardPath: string;
}) {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const s = variantStyles[variant];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    const result = await portalSignup({
      role: variant,
      inviteCode,
      fullName,
      phone,
      email,
      password,
      confirmPassword,
    });
    setIsLoading(false);
    if (result.success) {
      router.push(dashboardPath);
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
              <Label htmlFor="invite-code">Invitation code</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  id="invite-code"
                  placeholder="SDP-XXXX-XXXX-XXXX"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="pl-10 min-h-[44px] font-mono text-sm"
                  autoComplete="off"
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-neutral-500">
                Issued by the national secretariat (SDP admin). Single use.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="su-name">Full name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  id="su-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10 min-h-[44px]"
                  autoComplete="name"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="su-phone">Phone number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  id="su-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 min-h-[44px]"
                  autoComplete="tel"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="su-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  id="su-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 min-h-[44px]"
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-neutral-500">You will use this email to sign in.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="su-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  id="su-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 min-h-[44px]"
                  autoComplete="new-password"
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-neutral-500">At least 8 characters.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="su-confirm">Confirm password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  id="su-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 min-h-[44px]"
                  autoComplete="new-password"
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
                  Creating account…
                </>
              ) : (
                "Create account"
              )}
            </Button>

            <p className="text-center text-sm text-neutral-600">
              Already have an account?{" "}
              <Link href={loginPath} className="font-medium text-neutral-900 underline">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
