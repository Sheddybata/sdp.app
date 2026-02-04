"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

const SDP_GREEN = "#008751";
const SPLASH_DURATION_MS = 2200;

interface VideoSplashScreenProps {
  onComplete: () => void;
  onTransitionStart?: () => void;
  statusText?: string;
  logoSrc?: string;
}

export function VideoSplashScreen({
  onComplete,
  onTransitionStart,
  statusText = "Initializing Secure Enrollment...",
  logoSrc = "/sdplogo.jpg",
}: VideoSplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAnimationEnd = useCallback(() => {
    setShowPulse(true);
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = setTimeout(() => {
      pulseTimerRef.current = null;
      setShowPulse(false);
      setIsExiting(true);
      onTransitionStart?.();
    }, 400);
  }, [onTransitionStart]);

  useEffect(() => {
    startTimeRef.current = performance.now();
    const endTimer = setTimeout(handleAnimationEnd, SPLASH_DURATION_MS);
    return () => {
      clearTimeout(endTimer);
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    };
  }, [handleAnimationEnd]);

  const hasCompletedExitRef = useRef(false);

  const handleExitComplete = useCallback(() => {
    if (!hasCompletedExitRef.current) {
      hasCompletedExitRef.current = true;
      onComplete();
    }
  }, [onComplete]);

  // Animate progress bar over fixed duration
  useEffect(() => {
    const updateProgress = () => {
      if (startTimeRef.current && !isExiting) {
        const elapsed = performance.now() - startTimeRef.current;
        const pct = Math.min(100, (elapsed / SPLASH_DURATION_MS) * 100);
        setProgress(pct);
      }
      rafRef.current = requestAnimationFrame(updateProgress);
    };

    rafRef.current = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isExiting]);

  return (
    <motion.div
      key="splash"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FFFFFF]"
      initial={{ opacity: 1, scale: 1 }}
      animate={
        isExiting
          ? { opacity: 0, scale: 1.05 }
          : { opacity: 1, scale: 1 }
      }
      transition={{
        duration: 0.5,
        ease: "easeInOut",
      }}
      onAnimationComplete={() => {
        if (isExiting) handleExitComplete();
      }}
    >
      {/* Centered animated logo */}
      <div className="flex flex-1 w-full items-center justify-center px-4 py-6 sm:px-8 sm:py-8">
        <motion.div
          className="relative flex items-center justify-center w-full max-w-[200px] sm:max-w-[240px] aspect-square"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          transition={{
            duration: 0.6,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <motion.div
            className="relative w-full h-full"
            animate={{
              scale: [1, 1.03, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
              repeatDelay: 0.3,
            }}
          >
            <Image
              src={logoSrc}
              alt="SDP Logo"
              fill
              sizes="(max-width: 640px) 200px, 240px"
              className="object-contain"
              priority
            />
          </motion.div>
        </motion.div>
      </div>

      {/* Progress bar and status */}
      <div className="absolute bottom-[10vh] left-1/2 w-full max-w-md -translate-x-1/2 px-6">
        <div className="h-[2px] w-full overflow-hidden rounded-full bg-neutral-200/80 relative">
          <motion.div
            className="h-full rounded-full relative overflow-hidden"
            style={{ backgroundColor: SDP_GREEN }}
            initial={{ width: "0%" }}
            animate={{
              width: `${progress}%`,
              boxShadow: showPulse
                ? `0 0 8px 1px ${SDP_GREEN}, 0 0 16px 2px rgba(0,135,81,0.4)`
                : "none",
            }}
            transition={{
              width: { duration: 0.15, ease: "easeOut" },
              boxShadow: { duration: 0.3 },
            }}
          >
            {progress > 0 && progress < 100 && (
              <motion.div
                className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{
                  x: ["-100%", "200%"],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            )}
          </motion.div>
        </div>
        <motion.p
          className="mt-2 text-center text-xs font-light text-neutral-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          {statusText}
        </motion.p>
      </div>
    </motion.div>
  );
}
