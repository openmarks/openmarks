// SPDX-License-Identifier: GPL-3.0-or-later
// Settings: a small Vivaldi-like set, shown visually; everything else fixed.
import { putNormal } from './private';

export type TileSize = 'icon' | 'S' | 'M' | 'L' | 'XL';
export type Provider = 'bing' | 'wikimedia' | 'picsum';
export type Wallpaper =
  | { kind: 'none' }
  | { kind: 'color'; color: string }
  | { kind: 'gradient'; colors: string[]; angle: number }
  | { kind: 'image' } // uploaded file, kept in IndexedDB
  | { kind: 'daily'; provider: Provider };
/** A search engine you added: its search address and, optionally, a suggestions address (both with %s for the text). */
export type CustomEngine = { id: string; name: string; url: string; suggest?: string };

export type Prefs = {
  theme: 'auto' | 'light' | 'dark'; // light/dark mode
  themeId: string; // the look (themes.ts)
  glass: boolean; // translucent tiles over the wallpaper (shown as "Transparency")
  vim: boolean; // h j k l, gg, G, o / O, H / L
  tileSize: TileSize;
  pictures: 'cover' | 'logo' | 'shot'; // what tiles show by default: the page's cover image, its logo, or a screenshot
  titles: 'show' | 'hover' | 'hide';
  maxColumns: number; // 0 = as many as fit (capped at 10)
  searchStyle: 'off' | 'icon' | 'bar'; // the search button in the corner, or a search bar in the top bar
  engine: string; // a built-in engine id (search.ts) or one of `engines`
  suggest: boolean; // search suggestions from the engine as you type
  engines: CustomEngine[];
  addButton: boolean;
  clock: boolean;
  wallpaper: Wallpaper;
  dialFolder: string | null; // null = the default "Openmarks" folder
};

const defaults: Prefs = {
  theme: 'auto', themeId: 'openmarks', glass: true, vim: false, tileSize: 'M', pictures: 'cover', titles: 'show', maxColumns: 0, searchStyle: 'bar', engine: 'google', suggest: true, engines: [],
  addButton: true, clock: false, wallpaper: { kind: 'none' }, dialFolder: null,
};

/** Fixed (no setting): spacing, corners, title size. Target tile widths; actual width stretches to fill each row. */
export const fixed = { gap: 20, radius: 10, fontSize: 14, cap: 10, target: { icon: 92, S: 148, M: 188, L: 236, XL: 300 } as Record<TileSize, number> };

const KEY = 'proto-prefs-v7';
const saved = (() => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Prefs> & { search?: boolean };
  } catch {
    return {};
  }
})();

// The old search on/off switch becomes the search style (on = the bar, now the default).
if (saved.searchStyle === undefined && saved.search !== undefined) saved.searchStyle = saved.search ? 'bar' : 'off';
delete saved.search;
delete (saved as { focusPage?: boolean }).focusPage; // 1.1.0's "focus the dial on new tabs", since removed
export const prefs = $state<Prefs>({ ...defaults, ...saved });
function migrate() {
  // NASA was removed as a daily source: anyone who had it gets Bing.
  if (prefs.wallpaper.kind === 'daily' && !['bing', 'wikimedia', 'picsum'].includes(prefs.wallpaper.provider)) prefs.wallpaper = { kind: 'daily', provider: 'bing' };
  // The navy theme was renamed to Vapor: map its old saved id (split so the old name stays out of searches).
  if ((prefs.themeId as string) === 'st' + 'eam') prefs.themeId = 'vapor';
}
migrate();

/** The settings a settings file carries: all but the dial folder, a bookmark id that means nothing in another browser. */
export const portablePrefs = (): Partial<Prefs> => {
  const { dialFolder: _, ...rest } = $state.snapshot(prefs);
  return rest;
};

// The values each choice can take, so a hand-edited or foreign file can't put the page in a state it can't show.
const choices: Partial<Record<keyof Prefs, readonly unknown[]>> = {
  theme: ['auto', 'light', 'dark'], tileSize: ['icon', 'S', 'M', 'L', 'XL'], pictures: ['cover', 'logo', 'shot'],
  titles: ['show', 'hover', 'hide'], searchStyle: ['off', 'icon', 'bar'],
};
const isStr = (v: unknown): v is string => typeof v === 'string';
function validWallpaper(w: unknown): w is Wallpaper {
  const x = w as Record<string, unknown> | null;
  if (!x || typeof x !== 'object') return false;
  if (x.kind === 'none' || x.kind === 'image') return true;
  if (x.kind === 'color') return isStr(x.color);
  if (x.kind === 'gradient') return Array.isArray(x.colors) && x.colors.length >= 2 && x.colors.length <= 4 && x.colors.every(isStr) && typeof x.angle === 'number';
  return x.kind === 'daily' && isStr(x.provider);
}
const validEngine = (e: unknown): e is CustomEngine => {
  const x = e as Record<string, unknown> | null;
  return !!x && isStr(x.id) && isStr(x.name) && isStr(x.url) && (x.suggest === undefined || isStr(x.suggest));
};

/** Takes the settings from a settings file: each one that's known and valid replaces yours, the rest stay as they are.
 *  Returns how many were taken. */
export function applyPrefs(from: Record<string, unknown>): number {
  let n = 0;
  for (const k of Object.keys(defaults) as (keyof Prefs)[]) {
    const v = from[k];
    if (k === 'dialFolder' || v === undefined) continue;
    const ok = k === 'wallpaper' ? validWallpaper(v)
      : k === 'engines' ? Array.isArray(v) && v.every(validEngine)
      : k === 'maxColumns' ? Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 10
      : typeof v === typeof defaults[k] && (!choices[k] || choices[k]!.includes(v));
    if (!ok) continue;
    (prefs as Record<string, unknown>)[k] = v;
    n++;
  }
  migrate();
  return n;
}

/** Bumped when site access changes, so tiles re-read their pictures. */
export const epoch = $state({ n: 0 });

export function savePrefs() {
  localStorage.setItem(KEY, JSON.stringify(prefs));
  putNormal(KEY, localStorage.getItem(KEY));
  // The right-click "Add to Openmarks" (background) adds to the same folder the dial shows.
  (globalThis as { chrome?: { storage?: { local?: { set(v: object): unknown } } } }).chrome?.storage?.local?.set({ 'proto-dialFolder': prefs.dialFolder });
}

// Keep the background's copy of the dial folder current from the start.
(globalThis as { chrome?: { storage?: { local?: { set(v: object): unknown } } } }).chrome?.storage?.local?.set({ 'proto-dialFolder': prefs.dialFolder });
