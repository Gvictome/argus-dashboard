// Light/dark theme preference.
//
// "system" means no data-theme on <html>: the CSS tokens follow the OS via
// `color-scheme: light dark`. "light" / "dark" pin the theme with
// data-theme and are remembered in localStorage.

export const THEME_STORAGE_KEY = "argus-theme";

export const THEME_PREFERENCES = ["system", "light", "dark"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

/** Anything that is not an explicit "light" or "dark" means follow the OS. */
export function parseThemePreference(value: unknown): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

/**
 * Runs in <head> during HTML parsing, before first paint, so a saved
 * choice never flashes the other theme. Kept dependency-free and wrapped
 * in try/catch: localStorage can throw (privacy modes, blocked storage).
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
