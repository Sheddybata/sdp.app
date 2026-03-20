"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, ShieldCheck, LayoutDashboard, Briefcase, Network, Globe } from "lucide-react";
import { EventsAnnouncements } from "@/components/EventsAnnouncements";
import { InstallPrompt } from "@/components/InstallPrompt";
import { VideoSplashScreen } from "@/components/VideoSplashScreen";
import { ActionCard } from "@/components/ActionCard";
import { HomeInstitutionalSection } from "@/components/home/HomeInstitutionalSection";
import type { EventRecord, AnnouncementRecord } from "@/lib/db/content";
import { useLanguage } from "@/lib/i18n/context";

const SPLASH_SEEN_KEY = "sdp-portal-splash-seen";

export function HomeClient({ events, announcements }: { events: EventRecord[]; announcements: AnnouncementRecord[] }) {
  const { t } = useLanguage();
  const [showSplash, setShowSplash] = useState(true);
  const [contentVisible, setContentVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [splashSeen, setSplashSeen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const seen = !!sessionStorage.getItem(SPLASH_SEEN_KEY);
      setSplashSeen(seen);
      if (seen) { setShowSplash(false); setContentVisible(true); }
      setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }
  }, []);

  const handleSplashComplete = () => { sessionStorage.setItem(SPLASH_SEEN_KEY, "1"); setShowSplash(false); };
  const handleSplashTransitionStart = () => setContentVisible(true);

  return (
    <>
      <main
        className={`flex min-h-screen flex-col overflow-x-hidden ${showSplash ? "bg-[#FFFFFF]" : "bg-neutral-50"}`}
      >
        <AnimatePresence mode="wait">
          {showSplash && !reduceMotion && <VideoSplashScreen onComplete={handleSplashComplete} onTransitionStart={handleSplashTransitionStart} statusText={t.home.initializing} />}
          {showSplash && reduceMotion && (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FFFFFF] p-6">
              <Image 
                src="/sdplogo.jpg" 
                alt="SDP" 
                width={96} 
                height={96} 
                className="rounded-lg mb-6" 
                priority
              />
              <p className="text-neutral-600 text-center mb-8">{t.home.initializing}</p>
              <button type="button" onClick={() => { sessionStorage.setItem(SPLASH_SEEN_KEY, "1"); setShowSplash(false); setContentVisible(true); }} className="px-6 py-3 rounded-lg bg-sdp-primary text-white font-medium min-h-[44px]">{t.home.enterPortal}</button>
            </div>
          )}
        </AnimatePresence>
        <motion.div initial={reduceMotion ? {} : { opacity: 0 }} animate={{ opacity: contentVisible || reduceMotion ? 1 : 0 }} transition={{ duration: reduceMotion ? 0 : 0.5, ease: "easeInOut" }} className={!contentVisible && !reduceMotion ? "pointer-events-none" : ""}>
          <div className="mx-auto max-w-content px-4 py-8 sm:px-6 lg:px-8">
            <section className="mb-12 text-center sm:mb-14" aria-labelledby="home-main-title">
              <div className="mb-6 flex justify-center">
                <Image
                  src="/sdplogo.jpg"
                  alt=""
                  width={88}
                  height={88}
                  className="rounded-lg object-contain shadow-sm ring-1 ring-neutral-200/80"
                  style={{ width: "88px", height: "auto" }}
                  priority={splashSeen}
                  aria-hidden
                />
              </div>
              <h1
                id="home-main-title"
                className="mx-auto max-w-2xl text-balance text-display font-bold text-neutral-900 sm:text-3xl"
              >
                {t.home.title}
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-body leading-relaxed text-neutral-600">
                {t.home.description}
              </p>
            </section>

            <HomeInstitutionalSection home={t.home} />

            <section aria-labelledby="home-services-heading" className="mb-12 border-t border-neutral-200 pt-12 sm:mb-14 sm:pt-14">
              <h2
                id="home-services-heading"
                className="text-lg font-semibold tracking-tight text-neutral-900 sm:text-xl"
              >
                {t.home.memberServicesHeading}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-600 sm:text-base">
                {t.home.memberServicesDescription}
              </p>
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <ActionCard href="/enroll/new" icon={UserPlus} title={t.home.newEnrollment} description={t.home.newEnrollmentDesc} primary aria-label="Start new member enrollment" />
                <ActionCard href="/enroll/verify" icon={ShieldCheck} title={t.home.verifyMembership} description={t.home.verifyMembershipDesc} aria-label="Verify existing membership" />
                <ActionCard href="/admin/login" icon={LayoutDashboard} title={t.home.adminCommand} description={t.home.adminCommandDesc} aria-label="Go to Admin Command Center" />
                <ActionCard href="/agent/login" icon={Briefcase} title={t.home.agentPortal} description={t.home.agentPortalDesc} aria-label="Open agent portal login" />
                <ActionCard href="/cluster/login" icon={Network} title={t.home.clusterPortal} description={t.home.clusterPortalDesc} aria-label="Open cluster portal login" />
                <ActionCard href="/enroll/diaspora" icon={Globe} title={t.home.diasporaRegistration} description={t.home.diasporaRegistrationDesc} aria-label="Start diaspora registration preview" />
              </div>
            </section>
            <section className="mx-auto max-w-content-narrow border-t border-neutral-200 pt-12 sm:pt-14">
              <EventsAnnouncements events={events} announcements={announcements} />
            </section>
          </div>
          <p className="px-4 pb-8 pt-6 text-center text-overline text-neutral-500" dir="ltr">{t.home.pwaDescription}</p>
        </motion.div>
      </main>
      <InstallPrompt />
    </>
  );
}
