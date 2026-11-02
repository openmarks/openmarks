// SPDX-License-Identifier: GPL-3.0-or-later
// Settings › About: your settings as a YAML file, to keep or to carry to another browser, and back. It holds the
// settings and your own CSS themes; not the dial folder (a bookmark id, different in every browser) or your uploaded
// wallpaper picture (a file, not a setting). The YAML library loads only when you use one of the two.
import { applyPrefs, portablePrefs } from './prefs.svelte';
import { ownThemeFiles, putOwnThemes } from './ownthemes.svelte';

const FORMAT = 1;

export async function exportSettings(version: string): Promise<{ name: string; text: string }> {
  const { stringify } = await import('yaml');
  const body = stringify({ openmarks: FORMAT, settings: portablePrefs(), themes: ownThemeFiles() }, { lineWidth: 0 });
  const d = new Date();
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { name: `openmarks-settings-${day}.yaml`, text: `# Openmarks ${version} settings, saved ${day}\n${body}` };
}

/** Reads a settings file into the page. Returns what happened, to show under the buttons. */
export async function importSettings(text: string): Promise<{ ok: boolean; message: string }> {
  const { parse } = await import('yaml');
  let doc: unknown;
  try {
    doc = parse(text);
  } catch {
    return { ok: false, message: 'That file isn’t valid YAML.' };
  }
  const d = doc as { openmarks?: unknown; settings?: unknown; themes?: unknown } | null;
  if (!d || typeof d !== 'object' || typeof d.openmarks !== 'number') return { ok: false, message: 'That isn’t an Openmarks settings file.' };
  if (d.openmarks > FORMAT) return { ok: false, message: 'That file is from a newer Openmarks. Update this one first.' };
  let themes = 0;
  try {
    themes = Array.isArray(d.themes) ? putOwnThemes(d.themes) : 0;
  } catch {
    return { ok: false, message: 'There’s no room left to keep the themes in that file.' };
  }
  const n = d.settings && typeof d.settings === 'object' ? applyPrefs(d.settings as Record<string, unknown>) : 0;
  if (!n && !themes) return { ok: false, message: 'That file has no settings in it.' };
  return { ok: true, message: `Imported ${n} setting${n === 1 ? '' : 's'}${themes ? ` and ${themes} theme${themes === 1 ? '' : 's'}` : ''}.` };
}
