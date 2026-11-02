<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Search, like Spotlight or KRunner: one box, results as you type, in this order: an address you typed, your dial,
     your other bookmarks, "search the web for what you typed", then the engine's suggestions.
     ↑ ↓ move, Enter opens, Shift+Enter searches the web for what you typed, Esc closes.
     It grows out of what opened it (as in GNOME's search): the search bar widens in place into the panel and the
     results unroll from it; from the search button it grows out of the button. Closing plays it back. -->
<script lang="ts">
  import type { DialItem } from '@openmarks/module-sdk';
  import { prefs } from './prefs.svelte';
  import { addressOf, engineById, otherBookmarks, rank, searchUrl, searchWeb, suggestions, type Hit } from './search';
  import { bm, sameSite, browserFavicon } from './bm';
  import { peekPreview } from './preview';
  import { host } from './shared';
  import { icons } from './icons';
  import EngineIcon from './EngineIcon.svelte';
  import { untrack } from 'svelte';

  let { initial = '', from, dial, dialId, onfolder, onclose }: {
    initial?: string;
    from?: { el: HTMLElement; kind: 'bar' | 'icon' }; // what opened it: the panel grows out of it and back into it
    dial: { item: DialItem; where: string }[]; // everything on the dial, with where it is
    dialId: string;
    onfolder: (id: string) => void;
    onclose: () => void;
  } = $props();

  // What was typed to open search (and any keys typed before the box had focus: Shell adds them to `initial`), then yours.
  let text = $state('');
  $effect.pre(() => {
    text = initial;
  });
  let active = $state(0);
  let input = $state<HTMLInputElement>();
  let list = $state<HTMLElement>();
  const engine = $derived(engineById(prefs.engine, prefs.engines));

  // Bookmarks outside the dial, read once search has opened (minus the ones the dial already has): reading them all
  // while it opens could cost the opening a frame.
  let others = $state<{ item: DialItem; where: string }[]>([]);
  let settled = $state(false);
  $effect(() => {
    if (!settled) return;
    const onDial = dial.flatMap((d) => (d.item.kind === 'link' ? [d.item.url] : []));
    otherBookmarks(dialId).then((all) => (others = all.filter((o) => o.item.kind === 'link' && !onDial.some((u) => sameSite(u, (o.item as { url: string }).url)))));
  });

  // The engine's suggestions, a moment after typing stops; a newer keystroke cancels the older request.
  let suggested = $state<string[]>([]);
  $effect(() => {
    const t = text.trim(), e = engine, on = prefs.suggest;
    if (!t || !on || !e.suggest) return void (suggested = []);
    const ctrl = new AbortController();
    const timer = setTimeout(() => suggestions(e, t, ctrl.signal).then((s) => { if (!ctrl.signal.aborted) suggested = s; }), 120);
    return () => { clearTimeout(timer); ctrl.abort(); };
  });

  type Row =
    | { kind: 'address'; url: string }
    | { kind: 'dial' | 'bookmark'; hit: Hit }
    | { kind: 'web'; text: string }
    | { kind: 'suggestion'; text: string };
  const groups = $derived.by(() => {
    const t = text.trim();
    if (!t) return [];
    const out: { label: string; rows: Row[] }[] = [];
    const d = rank(t, dial, 8), b = rank(t, others, 5);
    // Typed like an address ("google.com"): going there comes first, as in the address bar.
    const url = addressOf(t);
    if (url) out.push({ label: 'Go to', rows: [{ kind: 'address', url }] });
    if (d.length) out.push({ label: 'Dial', rows: d.map((hit) => ({ kind: 'dial', hit })) });
    if (b.length) out.push({ label: 'Bookmarks', rows: b.map((hit) => ({ kind: 'bookmark', hit })) });
    out.push({ label: 'Web', rows: [{ kind: 'web', text: t }] });
    if (suggested.length) out.push({ label: `${engine.name} suggestions`, rows: suggested.map((s) => ({ kind: 'suggestion', text: s })) });
    return out;
  });
  const rows = $derived(groups.flatMap((g) => g.rows));
  $effect(() => {
    void text;
    active = 0;
  });
  $effect(() => {
    input?.focus({ preventScroll: true });
    const n = input?.value.length ?? 0;
    input?.setSelectionRange(n, n);
  });

  // ---- where it sits, and how it opens and closes ----
  // The panel is laid out once, at its place and size, and stays there. What grows is its skin: the box drawn behind
  // what's in it, empty, so resizing it costs no layout. Meanwhile what's in it slides and scales from where the bar
  // drew the same things (transforms, which the browser draws without the page), and the rest fades in as the box
  // reaches it. Nothing in it is squeezed or laid out again on the way, and a busy page doesn't stall it.
  let panel = $state<HTMLElement>(), skin = $state<HTMLElement>(), clip = $state<HTMLElement>(), inner = $state<HTMLElement>(), scrim = $state<HTMLElement>();
  let lens = $state<SVGSVGElement>(), engineEl = $state<HTMLElement>();
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  /** Widened in place over the search bar; else up in the middle (at the top on a phone). */
  function place() {
    const phone = innerWidth < 600, width = phone ? innerWidth - 20 : Math.min(680, innerWidth - 32);
    const top = from?.kind === 'bar' ? from.el.getBoundingClientRect().top : phone ? 10 : Math.round(innerHeight * 0.12);
    return { left: Math.round((innerWidth - width) / 2), top, width };
  }
  let pos = $state(place());
  // The panel is as tall as what's in it (the box alone until you type), and moves to a new height smoothly.
  let height = $state(0);
  $effect(() => {
    if (!inner) return;
    const ro = new ResizeObserver(() => (height = inner!.offsetHeight + 2)); // + the panel's border
    ro.observe(inner);
    return () => ro.disconnect();
  });
  const OPEN = { duration: 280, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' };
  const CLOSE = { duration: 200, easing: 'cubic-bezier(0.4, 0, 0.6, 1)', fill: 'forwards' as const };
  /** The skin over the bar or button, relative to the panel; both are round-ended. */
  function skinAtOpener(el: HTMLElement) {
    const r = el.getBoundingClientRect(), p = panel!.getBoundingClientRect();
    return { left: `${r.left - p.left}px`, top: `${r.top - p.top}px`, width: `${r.width}px`, height: `${r.height}px`, borderRadius: `${r.height / 2}px` };
  }
  const skinHome = { left: '0px', top: '0px', width: '100%', height: '100%', borderRadius: '14px' };
  /** The same box as a clip on what's in the panel (which sits 1px in, inside the border), so nothing shows outside
   *  the box as it grows. It moves exactly with the skin, both straight lines on the same timing. */
  function clipAtOpener(el: HTMLElement) {
    const r = el.getBoundingClientRect(), p = panel!.getBoundingClientRect();
    const left = r.left - p.left, top = r.top - p.top;
    return `inset(${top - 1}px ${p.width - 1 - left - r.width}px ${height - 1 - top - r.height}px ${left - 1}px round ${Math.max(0, r.height / 2 - 1)}px)`;
  }
  const clipHome = 'inset(0px 0px 0px 0px round 13px)';
  /** Where the bar draws the lens, the "Search" text and the engine, as a move (and resize) of the same things here.
   *  Each turns about its left middle (see the styles), so the move puts that point on the bar's. */
  function fromBar(bar: HTMLElement): [Element, string][] {
    const out: [Element, string][] = [];
    const size = (e: Element) => parseFloat(getComputedStyle(e).fontSize);
    const pair = (mine: Element | undefined, theirs: Element | null | undefined, scale: (m: DOMRect, t: DOMRect) => number, at: Element | null | undefined = mine) => {
      if (!mine || !theirs || !at) return;
      const m = at.getBoundingClientRect(), t = theirs.getBoundingClientRect();
      out.push([mine, `translate(${t.left - m.left}px, ${t.top + t.height / 2 - (m.top + m.height / 2)}px) scale(${scale(m, t)})`]);
    };
    pair(lens, bar.querySelector('svg'), (m, t) => t.width / m.width);
    const ph = bar.querySelector('.ph');
    if (input && ph) pair(input, ph, () => size(ph) / size(input!));
    // Lined up by their icons: here the engine sits in a pill, there it doesn't.
    pair(engineEl, bar.querySelector('.engine > *'), () => 1, engineEl?.firstElementChild);
    return out;
  }
  // Open (once): from the bar or button to its place.
  let opened = false;
  let moves: [Element, string][] = [];
  $effect(() => {
    if (!panel || !skin || !clip || !inner || opened) return;
    opened = true;
    untrack(() => {
      height = inner!.offsetHeight + 2;
      if (still || !from) return void (settled = true);
      const fx = [
        skin!.animate([{ ...skinAtOpener(from.el), opacity: from.kind === 'icon' ? 0.4 : 1 }, { ...skinHome, opacity: 1 }], OPEN),
        clip!.animate([{ clipPath: clipAtOpener(from.el) }, { clipPath: clipHome }], OPEN),
      ];
      if (from.kind === 'bar') {
        moves = fromBar(from.el);
        for (const [el, t] of moves) fx.push(el.animate([{ transform: t }, { transform: 'none' }], OPEN));
      }
      // What the bar doesn't have (the results), or all of it from the button, fades in as the box reaches it.
      for (const el of from.kind === 'bar' ? [...inner!.querySelectorAll('.list, .foot')] : [clip!])
        fx.push(el.animate([{ opacity: 0 }, { opacity: 0, offset: 0.35 }, { opacity: 1 }], OPEN));
      Promise.allSettled(fx.map((a) => a.finished)).then(() => (settled = true));
    });
  });
  let closing = false;
  /** Close: back into the bar or button it came from (or just fade), then gone. */
  export function close() {
    if (closing) return;
    closing = true;
    if (!panel || !skin || !clip || !inner || still) return onclose();
    let fx: Animation[];
    if (from) {
      fx = [
        skin.animate([{ ...skinHome, opacity: 1 }, { ...skinAtOpener(from.el), opacity: from.kind === 'icon' ? 0 : 1 }], CLOSE),
        clip.animate([{ clipPath: clipHome }, { clipPath: clipAtOpener(from.el) }], CLOSE),
      ];
      if (from.kind === 'bar') for (const [el, t] of moves) fx.push(el.animate([{ transform: 'none' }, { transform: t }], CLOSE));
      for (const el of from.kind === 'bar' ? [...inner.querySelectorAll('.list, .foot')] : [clip])
        fx.push(el.animate([{ opacity: 1 }, { opacity: 0, offset: 0.6 }, { opacity: 0 }], CLOSE));
    } else fx = [panel.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-6px) scale(0.98)' }], CLOSE)];
    scrim?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' });
    fx[0]!.finished.then(onclose, onclose);
  }

  /** Opens a result in a background tab, search staying open (Ctrl/⌘+Enter, Ctrl/⌘+click, middle-click). */
  function goBehind(r: Row | undefined) {
    if (!r) return;
    if (r.kind === 'address') return void bm.openTab(r.url);
    if (r.kind === 'web' || r.kind === 'suggestion') return void bm.openTab(searchUrl(engine, r.text));
    const it = r.hit.item;
    if (it.kind === 'link') void bm.openTab(it.url);
  }
  function go(r: Row | undefined) {
    if (!r) return;
    if (r.kind === 'address') return void (location.href = r.url);
    if (r.kind === 'web' || r.kind === 'suggestion') return searchWeb(engine, r.text);
    const it = r.hit.item;
    if (it.kind === 'folder') {
      close();
      return onfolder(it.id);
    }
    location.href = it.url;
  }
  function keys(e: KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown' && rows.length) { e.preventDefault(); active = (active + 1) % rows.length; reveal(); }
    else if (e.key === 'ArrowUp' && rows.length) { e.preventDefault(); active = (active - 1 + rows.length) % rows.length; reveal(); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) goBehind(rows[active]);
      else if (e.shiftKey && text.trim()) searchWeb(engine, text.trim());
      else go(rows[active]);
    }
  }
  const reveal = () => queueMicrotask(() => list?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }));

  /** The title in pieces, the parts that match what you typed marked. */
  function marks(title: string): { s: string; m: boolean }[] {
    const lower = title.toLowerCase(), hits: [number, number][] = [];
    for (const w of text.trim().toLowerCase().split(/\s+/).filter(Boolean)) {
      const i = lower.indexOf(w);
      if (i >= 0) hits.push([i, i + w.length]);
    }
    hits.sort((a, b) => a[0] - b[0]);
    const out: { s: string; m: boolean }[] = [];
    let at = 0;
    for (const [a, b] of hits) {
      if (b <= at) continue;
      if (a > at) out.push({ s: title.slice(at, a), m: false });
      out.push({ s: title.slice(Math.max(a, at), b), m: true });
      at = b;
    }
    if (at < title.length) out.push({ s: title.slice(at), m: false });
    return out;
  }
  /** An icon we already have (no fetching while you type): the cached one, the browser's (Chromium), else a letter. */
  const iconOf = (url: string) => peekPreview(url)?.icon ?? browserFavicon(url, 32);
  const index = (r: Row) => rows.indexOf(r);
</script>

<svelte:window onresize={() => (pos = place())} />
<button class="scrim" bind:this={scrim} aria-label="Close search" tabindex="-1" onclick={close}></button>
<div class="spot" role="dialog" aria-label="Search" bind:this={panel}
  style:left="{pos.left}px" style:top="{pos.top}px" style:width="{pos.width}px" style:height={height ? `${height}px` : undefined}>
  <div class="skin" bind:this={skin} aria-hidden="true"></div>
  <div class="clip" bind:this={clip}>
  <div class="inner" bind:this={inner}>
  <div class="field">
    <svg class="lens" bind:this={lens} viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
    <input bind:this={input} bind:value={text} type="text" spellcheck="false" autocomplete="off" placeholder="Search"
      role="combobox" aria-expanded={rows.length > 0} aria-controls="spot-list" aria-activedescendant={rows.length ? `spot-${active}` : undefined} onkeydown={keys} />
    <span class="engine" bind:this={engineEl} title="Search engine (change it in Settings › Page)"><EngineIcon {engine} size={14} />{engine.name}</span>
  </div>

  {#if groups.length}
    <div class="list" id="spot-list" role="listbox" aria-label="Results" bind:this={list}>
      {#each groups as g (g.label)}
        <div class="group" role="presentation">{g.label}</div>
        {#each g.rows as r}
          {@const i = index(r)}
          <div id="spot-{i}" class="row" role="option" tabindex="-1" aria-selected={i === active}
            onmousemove={() => (active = i)} onclick={(e) => (e.ctrlKey || e.metaKey ? goBehind(r) : go(r))}
            onauxclick={(e) => { if (e.button === 1) { e.preventDefault(); goBehind(r); } }} onkeydown={() => {}}>
            {#if r.kind === 'dial' || r.kind === 'bookmark'}
              {@const it = r.hit.item}
              <span class="ic">
                {#if it.kind === 'folder'}
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d={icons.open} /></svg>
                {:else if iconOf(it.url)}
                  <img src={iconOf(it.url)} alt="" width="18" height="18" />
                {:else}
                  <span class="letter">{(it.title || host(it.url)).charAt(0).toUpperCase()}</span>
                {/if}
              </span>
              <span class="main">
                <span class="title">{#each marks(it.title || (it.kind === 'link' ? host(it.url) : '')) as p}{#if p.m}<b>{p.s}</b>{:else}{p.s}{/if}{/each}</span>
                <span class="sub">{it.kind === 'link' ? host(it.url) : 'Folder'}{#if r.hit.where}{' · '}{r.hit.where}{/if}</span>
              </span>
              <span class="hint">{it.kind === 'folder' ? 'Open folder' : 'Open'}</span>
            {:else if r.kind === 'address'}
              <span class="ic">
                {#if iconOf(r.url)}<img src={iconOf(r.url)} alt="" width="18" height="18" />{:else}<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>{/if}
              </span>
              <span class="main"><span class="title">Open <b>{new URL(r.url).host.replace(/^www\./, '')}</b></span><span class="sub">{r.url}</span></span>
              <span class="hint">Open</span>
            {:else if r.kind === 'web'}
              <span class="ic"><EngineIcon {engine} size={18} /></span>
              <span class="main"><span class="title">Search {engine.name} for “<b>{r.text}</b>”</span></span>
              <span class="hint">Search</span>
            {:else if r.kind === 'suggestion'}
              <span class="ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></span>
              <span class="main"><span class="title">{r.text}</span></span>
              <span class="hint">Search</span>
            {/if}
            <kbd class="enter" aria-hidden="true">↵</kbd>
          </div>
        {/each}
      {/each}
    </div>
    <div class="foot" aria-hidden="true"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>↵</kbd> open</span><span><kbd>Shift</kbd><kbd>↵</kbd> search the web</span><span><kbd>Ctrl</kbd><kbd>↵</kbd> new tab</span><span><kbd>Esc</kbd> close</span></div>
  {/if}
  </div>
  </div>
</div>

<style>
  .scrim { position: fixed; inset: 0; z-index: 60; border: 0; padding: 0; background: rgb(0 0 0 / 0.3); backdrop-filter: var(--scrim-blur, none); cursor: default; animation: fade 0.2s ease-out; }
  @media (prefers-reduced-motion: reduce) { .spot { transition: none; } }
  /* Placed and sized from the script (where it opened from, how much it holds); its height glides as results come
     and go, so they unroll from the box. */
  .spot { position: fixed; z-index: 61; box-sizing: border-box; color: var(--text); font: 14px/1.35 var(--font-family); transition: height 0.22s var(--ease, ease-out); }
  /* The box itself, drawn behind what's in it: the part that grows out of the bar or button (from the script). */
  .skin {
    position: absolute; left: 0; top: 0; width: 100%; height: 100%; box-sizing: border-box; pointer-events: none;
    background: var(--float); backdrop-filter: var(--float-blur); border: 1px solid var(--line); border-radius: 14px; box-shadow: 0 24px 64px rgb(0 0 0 / 0.32), 0 4px 14px rgb(0 0 0 / 0.14);
  }
  /* clip, not hidden: a box that can't scroll, so focusing the box before it has its height doesn't scroll it. */
  .clip { position: absolute; inset: 1px; overflow: clip; border-radius: 13px; }
  .inner { display: flex; flex-direction: column; max-height: calc(72vh - 2px); }
  /* Moved and sized about their left middle as they come from the bar. */
  .lens, .field input, .engine { transform-origin: left center; }
  @keyframes fade { from { opacity: 0; } }
  .field { flex: none; display: flex; align-items: center; gap: 10px; padding: 0 12px 0 14px; height: 48px; }
  .lens { flex: none; color: var(--muted); }
  .field input { flex: 1; min-width: 0; height: 100%; padding: 0; border: 0; outline: 0; background: none; color: var(--text); font: inherit; font-size: 16px; }
  .field input::placeholder { color: var(--muted); }
  .engine { flex: none; display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px 3px 6px; border-radius: 999px; background: var(--tint); color: var(--muted); font-size: 12px; white-space: nowrap; }
  .list { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 4px 8px 8px; border-top: 1px solid var(--line); }
  .group { padding: 10px 10px 4px; color: var(--muted); font-size: 11px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
  .row { display: flex; align-items: center; gap: 12px; min-height: 44px; padding: 4px 10px; border-radius: 8px; cursor: pointer; }
  .row[aria-selected='true'] { background: var(--tint-press); }
  .ic { flex: none; width: 28px; height: 28px; display: grid; place-items: center; border-radius: 7px; background: var(--surface-2); color: var(--muted); overflow: hidden; }
  .ic img { width: 18px; height: 18px; object-fit: contain; }
  .letter { font-weight: 600; font-size: 13px; color: var(--text); }
  .main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .title, .sub { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .title b { font-weight: 700; }
  .sub { color: var(--muted); font-size: 12px; }
  .hint { flex: none; color: var(--muted); font-size: 12px; opacity: 0; }
  .enter { flex: none; opacity: 0; }
  .row[aria-selected='true'] .hint, .row[aria-selected='true'] .enter { opacity: 1; }
  kbd { display: inline-block; min-width: 18px; padding: 1px 5px; box-sizing: border-box; text-align: center; border: 1px solid var(--line); border-bottom-width: 2px; border-radius: 5px; background: var(--surface-2); color: var(--muted); font: 600 11px/1.4 ui-monospace, monospace; }
  .foot { flex: none; display: flex; flex-wrap: wrap; gap: 6px 16px; padding: 8px 16px; border-top: 1px solid var(--line); color: var(--muted); font-size: 12px; }
  .foot span { display: inline-flex; align-items: center; gap: 4px; }
  @media (max-width: 599px) {
    .inner { max-height: calc(100vh - 22px); }
    .foot { display: none; }
  }
</style>
