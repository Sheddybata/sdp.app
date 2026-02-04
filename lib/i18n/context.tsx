"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { getTranslations, type TranslationKeys } from "./translations";
import { getLanguageFromCode, DEFAULT_LANGUAGE, type Language } from "./languages";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationKeys;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = "sdp-language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Get language from localStorage or browser preference
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored) {
        setLanguageState(getLanguageFromCode(stored));
      } else {
        // Try to detect from browser
        const browserLang = navigator.language.split("-")[0];
        const detected = getLanguageFromCode(browserLang);
        if (detected !== DEFAULT_LANGUAGE) {
          setLanguageState(detected);
        }
      }
      setMounted(true);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      // Update HTML lang attribute
      document.documentElement.lang = lang;
      // Update dir attribute for RTL if needed (not needed for these languages)
      document.documentElement.dir = "ltr";
    }
  };

  useEffect(() => {
    if (mounted && typeof window !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language, mounted]);

  const value: LanguageContextType = {
    language,
    setLanguage,
    t: getTranslations(language),
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
