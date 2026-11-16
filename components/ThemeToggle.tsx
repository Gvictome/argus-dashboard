"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import {
  THEME_STORAGE_KEY,
  parseThemePreference,
  type ThemePreference,
} from "@/lib/theme";

// Same-tab changes fire this; other tabs fire the native "storage" event.
const CHANGE_EVENT = "argus-theme-change";

function readPreference(): ThemePreference {
  try {
    return parseThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

function applyToDocument(preference: ThemePreference) {
  const root = document.documentElement;
  if (preference === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", preference);
}

function setPreference(preference: ThemePreference) {
  try {
    if (preference === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage blocked: the choice still applies for this page view.
  }
  applyToDocument(preference);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    applyToDocument(readPreference());
    onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Mounted once in the root layout. The inline <head> script already set
 * data-theme before paint; in development React's Strict Mode remount
 * resets <html> attributes, so re-apply the saved choice before paint.
 * A no-op in production.
 */
export function ThemeSync() {
  useLayoutEffect(() => {
    applyToDocument(readPreference());
  }, []);
  return null;
}

const OPTIONS: { value: ThemePreference; label: string; icon: React.ReactNode }[] = [
  {
    value: "system",
    label: "System",
    icon: (
      <>
        <rect x="2" y="3" width="12" height="8" rx="1.5" />
        <path d="M6 14h4M8 11v3" />
      </>
    ),
  },
  {
    value: "light",
    label: "Light",
    icon: (
      <>
        <circle cx="8" cy="8" r="3" />
        <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.06 1.06M11.54 11.54l1.06 1.06M3.4 12.6l1.06-1.06M11.54 4.46l1.06-1.06" />
      </>
    ),
  },
  {
    value: "dark",
    label: "Dark",
    icon: <path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7Z" />,
  },
];

/** System / Light / Dark switcher for the header. */
export function ThemeToggle() {
  const current = useSyncExternalStore(subscribe, readPreference, () => "system" as const);

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="flex items-center gap-0.5 rounded-lg border border-border bg-surface p-1 shadow-sm"
    >
      {OPTIONS.map((option) => {
        const isActive = current === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={`${option.label} theme`}
            title={`${option.label} theme`}
            onClick={() => setPreference(option.value)}
            className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
              isActive
                ? "bg-surface-raised text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            <svg
              viewBox="0 0 16 16"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              {option.icon}
            </svg>
          </button>
        );
      })}
    </div>
  );
}
