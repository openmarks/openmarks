// SPDX-License-Identifier: GPL-3.0-or-later
// Helpers shared by the Dial's components: tabs, folder names, hosts.
import type { DialFolder, DialItem } from '@openmarks/module-sdk';
import { bm, browserFavicon, type Node } from './bm';

export type Tab = { id: string; label: string; items: DialItem[] };

/** Home = links directly in the Dial folder; each first-level folder = a Tab. */
export function tabsFrom(dial: DialFolder): Tab[] {
  const home: Tab = { id: 'home', label: 'HOME', items: dial.items.filter((i) => i.kind === 'link') };
  const folders = dial.items.filter((i) => i.kind === 'folder') as Extract<DialItem, { kind: 'folder' }>[];
  return [home, ...folders.map((f) => ({ id: f.id, label: f.title, items: f.items }))];
}

export function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Mini icons inside folder tiles: the browser's own favicon (Chromium only); '' elsewhere → a letter is shown. */
export function iconUrlForFolder(url: string): string {
  return browserFavicon(url, 32) ?? '';
}

/** A stable hue per site, used for logo-tile backgrounds. */
export function hue(url: string): number {
  let h = 0;
  for (const c of host(url)) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}



/** Folder names are always shown and saved in capitals, whatever case they were typed in: "reading List" → "READING LIST". */
export function folderName(title: string): string {
  return title.trim().toLocaleUpperCase();
}

/** The dial with every folder name in capitals (bookmarks themselves are untouched until renamed). */
export function withFolderNames<T extends { items: DialItem[] }>(d: T): T {
  const fix = (items: DialItem[]): DialItem[] => items.map((i) => (i.kind === 'folder' ? { ...i, title: folderName(i.title), items: fix(i.items) } : i));
  return { ...d, items: fix(d.items) };
}

export type FolderChoice = { id: string; path: string; count: number; suggested: boolean };
/** Every bookmarks folder that could be the dial, with its path and how many sites it holds. Ones that look like an
 *  existing speed dial (a "Speed Dial" folder, Vivaldi/Opera speed dials) and the bookmarks bar come first. */
export async function folderChoices(): Promise<FolderChoice[]> {
  const out: FolderChoice[] = [];
  const walk = (n: Node, path: string, depth: number) => {
    for (const c of n.children ?? []) {
      if (c.url !== undefined || c.type === 'separator') continue;
      const p = path ? `${path} › ${folderName(c.title)}` : folderName(c.title);
      const count = (c.children ?? []).filter((x) => x.url !== undefined).length;
      out.push({ id: c.id, path: p, count, suggested: depth > 0 && /speed ?dial|openmarks/i.test(c.title) || /^(bookmarks bar|bookmarks toolbar)$/i.test(c.title) });
      walk(c, p, depth + 1);
    }
  };
  for (const r of await bm.tree()) walk(r, '', 0);
  return out.sort((a, b) => Number(b.suggested) - Number(a.suggested));
}
