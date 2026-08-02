"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";

const LOCALE_KEY = "vestora.locale";

type Direction = "ltr" | "rtl";

interface LocaleContextValue {
  locale: Locale;
  dir: Direction;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function dirFor(locale: Locale): Direction {
  return locale === "ar" ? "rtl" : "ltr";
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  // Hydrate stored preference on mount.
  useEffect(() => {
    const stored = window.localStorage.getItem(LOCALE_KEY);
    if (stored === "ar" || stored === "en") setLocaleState(stored);
  }, []);

  // Keep <html lang/dir> in sync with the active locale.
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dirFor(locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    window.localStorage.setItem(LOCALE_KEY, next);
    setLocaleState(next);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "en" ? "ar" : "en");
  }, [locale, setLocale]);

  const t = useCallback(
    (key: string) => dictionaries[locale][key] ?? dictionaries.en[key] ?? key,
    [locale]
  );

  return (
    <LocaleContext.Provider
      value={{ locale, dir: dirFor(locale), setLocale, toggleLocale, t }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within <LocaleProvider>");
  return ctx;
}

export function useT(): (key: string) => string {
  return useLocale().t;
}
