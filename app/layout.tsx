import type { Metadata, Viewport } from "next";
import "./globals.css";
import { OfflineBanner } from "@/components/OfflineBanner";
import { AppShell } from "@/components/AppShell";
import { TrustSignals } from "@/components/TrustSignals";
import { LanguageProvider } from "@/lib/i18n/context";
import { ServiceWorkerRegistration } from "./sw-register";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "SDP Member Portal",
  description: "Social Democratic Party - Member Enrollment & Admin",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#f48735",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased flex flex-col">
        <ChunkErrorHandler />
        <ErrorBoundary>
          <LanguageProvider>
            <AppShell />
            <div className="flex-1 flex flex-col">{children}</div>
            <footer className="border-t border-neutral-200 bg-white py-4 text-center" role="contentinfo">
              <TrustSignals compact />
            </footer>
            <OfflineBanner />
            <ServiceWorkerRegistration />
          </LanguageProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
