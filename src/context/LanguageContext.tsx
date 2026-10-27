"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { translations, toBengaliNumber, type Language, type TranslationDictionary } from "@/lib/translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (path: string, fallback?: string) => string;
  formatNumber: (val: number | string) => string;
  formatPrice: (amount: number | string) => string;
  isBn: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = "tourlover_lang";
const COOKIE_NAME = "tourlover_lang";

function getInitialLanguage(): Language {
  if (typeof window === "undefined") return "en";
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (saved === "en" || saved === "bn") return saved;
  } catch {}
  return "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLangState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const init = getInitialLanguage();
    setLangState(init);
    setMounted(true);
    document.documentElement.lang = init;
    document.documentElement.classList.toggle("lang-bn", init === "bn");
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLangState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      document.cookie = `${COOKIE_NAME}=${lang}; path=/; max-age=31536000; SameSite=Lax`;
      document.documentElement.lang = lang;
      document.documentElement.classList.toggle("lang-bn", lang === "bn");
    } catch {}
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === "en" ? "bn" : "en");
  }, [language, setLanguage]);

  const t = useCallback(
    (path: string, fallback?: string): string => {
      const keys = path.split(".");
      let current: any = translations[language];

      for (const key of keys) {
        if (current && typeof current === "object" && key in current) {
          current = current[key];
        } else {
          // Fallback to English if translation key is missing in Bengali
          let enFallback: any = translations.en;
          for (const enKey of keys) {
            if (enFallback && typeof enFallback === "object" && enKey in enFallback) {
              enFallback = enFallback[enKey];
            } else {
              enFallback = undefined;
              break;
            }
          }
          return typeof enFallback === "string" ? enFallback : fallback || path;
        }
      }

      return typeof current === "string" ? current : fallback || path;
    },
    [language]
  );

  const formatNumber = useCallback(
    (val: number | string): string => {
      if (language === "bn") {
        return toBengaliNumber(val);
      }
      return String(val);
    },
    [language]
  );

  const formatPrice = useCallback(
    (amount: number | string): string => {
      const num = typeof amount === "string" ? parseFloat(amount) || 0 : amount;
      const formattedNum = Math.round(num).toLocaleString("en-BD");
      if (language === "bn") {
        return "৳" + toBengaliNumber(formattedNum);
      }
      return "৳" + formattedNum;
    },
    [language]
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        formatNumber,
        formatPrice,
        isBn: language === "bn",
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      language: "en" as Language,
      setLanguage: () => {},
      toggleLanguage: () => {},
      t: (path: string, fallback?: string) => fallback || path,
      formatNumber: (val: number | string) => String(val),
      formatPrice: (amount: number | string) => "৳" + Math.round(Number(amount) || 0).toLocaleString("en-BD"),
      isBn: false,
    };
  }
  return context;
}
