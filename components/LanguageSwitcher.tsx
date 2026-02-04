"use client";

import { useLanguage } from "@/lib/i18n/context";
import { LANGUAGES, type Language } from "@/lib/i18n/languages";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          aria-label="Change language"
        >
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{LANGUAGES[language].flag}</span>
          <span className="hidden md:inline">{LANGUAGES[language].nativeName}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end">
        <div className="space-y-1">
          {Object.values(LANGUAGES).map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                language === lang.code
                  ? "bg-sdp-primary/10 text-sdp-primary font-medium"
                  : "hover:bg-neutral-100 text-neutral-700"
              }`}
            >
              <span className="text-lg">{lang.flag}</span>
              <div className="flex-1 text-left">
                <div className="font-medium">{lang.nativeName}</div>
                <div className="text-xs text-neutral-500">{lang.name}</div>
              </div>
              {language === lang.code && (
                <span className="text-sdp-primary">✓</span>
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
