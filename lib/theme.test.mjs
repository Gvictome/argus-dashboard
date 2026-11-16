// Run with `npm test` (node --test, no extra dependencies).
// Node 24 strips the TypeScript types when importing ./theme.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
  parseThemePreference,
} from "./theme.ts";

// ---------- preference parsing ----------

test("parseThemePreference keeps explicit light and dark", () => {
  assert.equal(parseThemePreference("light"), "light");
  assert.equal(parseThemePreference("dark"), "dark");
});

test("parseThemePreference falls back to system for anything else", () => {
  for (const value of [null, undefined, "", "system", "Dark", "blue", 1]) {
    assert.equal(parseThemePreference(value), "system");
  }
});

// ---------- the no-flash <head> script ----------

function runInitScript(storage) {
  const attrs = {};
  const document = {
    documentElement: { setAttribute: (name, value) => (attrs[name] = value) },
  };
  new Function("localStorage", "document", THEME_INIT_SCRIPT)(storage, document);
  return attrs;
}

test("init script pins a saved light or dark choice", () => {
  for (const saved of ["light", "dark"]) {
    const attrs = runInitScript({ getItem: (k) => (k === THEME_STORAGE_KEY ? saved : null) });
    assert.equal(attrs["data-theme"], saved);
  }
});

test("init script leaves data-theme unset when following the system", () => {
  assert.deepEqual(runInitScript({ getItem: () => null }), {});
  assert.deepEqual(runInitScript({ getItem: () => "<img onerror=x>" }), {});
});

test("init script survives blocked storage", () => {
  const blocked = {
    getItem() {
      throw new Error("SecurityError");
    },
  };
  assert.doesNotThrow(() => runInitScript(blocked));
});

// ---------- token contrast, read from the real stylesheet ----------

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

/** { name: { light: "#rrggbb", dark: "#rrggbb" } } for every hex light-dark() token. */
function readTokens(source) {
  const tokens = {};
  const re = /--([a-z0-9-]+):\s*light-dark\(\s*(#[0-9a-f]{6})\s*,\s*(#[0-9a-f]{6})\s*\)/gi;
  for (const [, name, light, dark] of source.matchAll(re)) tokens[name] = { light, dark };
  return tokens;
}

function luminance(hex) {
  const channel = (i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const tokens = readTokens(css);
const MODES = ["light", "dark"];
const TEXT_TOKENS = ["foreground", "muted", "accent", "success", "warning", "danger", "offline"];
const SURFACES = ["background", "surface", "surface-raised"];

test("every text token is declared for both modes", () => {
  for (const name of [...TEXT_TOKENS, ...SURFACES]) assert.ok(tokens[name], `--${name} missing`);
});

for (const mode of MODES) {
  test(`${mode}: text tokens reach WCAG AA (4.5:1) on every surface`, () => {
    for (const text of TEXT_TOKENS) {
      for (const surface of SURFACES) {
        const ratio = contrast(tokens[text][mode], tokens[surface][mode]);
        assert.ok(ratio >= 4.5, `--${text} on --${surface} is ${ratio.toFixed(2)}:1`);
      }
    }
  });

  test(`${mode}: text on solid accent and status fills reaches 4.5:1`, () => {
    const pairs = [
      ["accent-foreground", "accent"],
      ["on-status", "success"],
      ["on-status", "danger"],
    ];
    for (const [fg, bg] of pairs) {
      const ratio = contrast(tokens[fg][mode], tokens[bg][mode]);
      assert.ok(ratio >= 4.5, `--${fg} on --${bg} is ${ratio.toFixed(2)}:1`);
    }
  });

  test(`${mode}: chart marks reach 3:1 on the chart surface`, () => {
    for (const mark of ["series-1", "series-2", "series-3", "series-4", "anomaly"]) {
      const ratio = contrast(tokens[mark][mode], tokens.surface[mode]);
      assert.ok(ratio >= 3, `--${mark} on --surface is ${ratio.toFixed(2)}:1`);
    }
  });
}
