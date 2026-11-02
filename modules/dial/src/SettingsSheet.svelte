<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Settings: a sheet from the bottom, so the dial stays in view above it and every change shows at once. Six tabs in
     one pill, and in each mostly pictures, in the same style as the welcome (Choice, Segmented, Art):
       Theme      the themes (or your own, from a CSS file), light or dark, transparency
       Tiles      size (incl. icons only), titles, pictures, how many in a row
       Wallpaper  none, a colour or gradient (2–4 colours and a direction), your picture, or a daily picture
       Search     bar, button or off; the engine; suggestions
       More       the add button, the clock, Vim keys; which bookmarks folder; your settings as a file
       About      the version, the website and source -->
<script lang="ts">
  import { prefs, savePrefs, type TileSize, type Provider, type Wallpaper } from './prefs.svelte';
  import { providers, dailyWallpaper, loadWallpaper, previewOf, type Daily } from './wallpaper';
  import { builtIn, themeById, themeToCss, type Theme } from './themes';
  import { ownThemes, addOwnTheme, removeOwnTheme, ownThemeFile } from './ownthemes.svelte';
  import { allEngines, engineById } from './search';
  import { exportSettings, importSettings } from './settingsfile';
  import ThemePreview from './ThemePreview.svelte';
  import EngineIcon from './EngineIcon.svelte';
  import Choice from './Choice.svelte';
  import Segmented from './Segmented.svelte';
  import Art from './Art.svelte';
  let { dark, folderLabel, daily, onclose, onpickfolder, onpickengine, onwallpaper, onrefreshdaily, oncaptureall }: {
    dark: boolean; folderLabel: string; daily: Daily | null; oncaptureall: () => Promise<number>;
    onclose: () => void; onpickfolder: () => void; onpickengine: () => void; onwallpaper: (f: File) => void; onrefreshdaily: () => void;
  } = $props();
  $effect(() => {
    JSON.stringify(prefs);
    savePrefs();
  });

  const TABS = [
    ['theme', 'Theme', 'M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z'],
    ['tiles', 'Tiles', 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z'],
    ['wallpaper', 'Wallpaper', 'M3 5h18v14H3zM8.5 10a1.5 1.5 0 1 0 0-.01M21 15l-5-5-11 9'],
    ['search', 'Search', 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5'],
    ['more', 'More', 'M5 12h.01M12 12h.01M19 12h.01'],
    ['about', 'About', 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v5M12 8h.01'],
  ] as const;
  let tab = $state<(typeof TABS)[number][0]>('theme');
  const modeDark = $derived(prefs.theme === 'auto' ? matchMedia('(prefers-color-scheme: dark)').matches : prefs.theme === 'dark');
  const cur = $derived(themeById(prefs.themeId, ownThemes.list));

  // ---- Theme: your own themes from a CSS file; any theme can be saved as one, to start from ----
  let cssFile = $state<HTMLInputElement>();
  let cssError = $state('');
  async function loadCss() {
    const f = cssFile?.files?.[0];
    if (!f) return;
    const t = addOwnTheme(f.name, await f.text());
    if (cssFile) cssFile.value = '';
    if (typeof t === 'string') return void (cssError = t);
    cssError = '';
    prefs.themeId = t.id;
  }
  function download(name: string, blob: Blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function downloadCss(t: Theme) {
    const own = ownThemeFile(t.id);
    download(own?.file ?? `${t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.css`, new Blob([own?.css ?? themeToCss(t)], { type: 'text/css' }));
  }
  function removeTheme(t: Theme) {
    if (prefs.themeId === t.id) prefs.themeId = 'openmarks';
    removeOwnTheme(t.id);
  }

  // ---- Tiles ----
  const sizes: { k: TileSize; label: string }[] = [
    { k: 'icon', label: 'Icons' }, { k: 'S', label: 'Small' }, { k: 'M', label: 'Medium' }, { k: 'L', label: 'Large' }, { k: 'XL', label: 'Huge' },
  ];
  let capturing = $state(false);
  let captured = $state<number | null>(null);

  // ---- Wallpaper ----
  let file = $state<HTMLInputElement>();
  // The picture you uploaded, shown on its card even while another kind of wallpaper is on.
  let ownPic = $state<string | null>(null);
  loadWallpaper().then((u) => (ownPic = u)).catch(() => {});
  function pickPicture(f = file?.files?.[0]) {
    if (!f || !/^image\//.test(f.type)) return;
    ownPic = URL.createObjectURL(f);
    onwallpaper(f);
  }
  let dropping = $state(false);
  const wk = $derived(prefs.wallpaper.kind);
  // Colour: one colour is a plain background, two to four make a gradient. (Saved as before: 'color' or 'gradient'.)
  type Paint = { colors: string[]; angle: number };
  const w0 = prefs.wallpaper;
  let paint = $state<Paint>(w0.kind === 'color' ? { colors: [w0.color], angle: 135 } : w0.kind === 'gradient' ? { colors: [...w0.colors], angle: w0.angle } : { colors: ['#3b4a6b'], angle: 135 });
  const PRESETS: Paint[] = [
    { colors: ['#3b4a6b'], angle: 135 }, { colors: ['#1f2328'], angle: 135 }, { colors: ['#2f5d50'], angle: 135 }, { colors: ['#7a3e48'], angle: 135 }, { colors: ['#e9e4da'], angle: 135 },
    { colors: ['#4e54c8', '#8f94fb'], angle: 135 }, { colors: ['#0f2027', '#2c5364'], angle: 160 }, { colors: ['#43cea2', '#185a9d'], angle: 135 },
    { colors: ['#f6d365', '#fda085'], angle: 120 }, { colors: ['#ff9a8b', '#ff6a88', '#ff99ac'], angle: 90 }, { colors: ['#a1c4fd', '#c2e9fb'], angle: 180 }, { colors: ['#232526', '#414345'], angle: 135 },
  ];
  const paintCss = (p: Paint) => (p.colors.length === 1 ? p.colors[0]! : `linear-gradient(${p.angle}deg, ${p.colors.join(', ')})`);
  const samePaint = (a: Paint, b: Paint) => a.colors.join() === b.colors.join() && (a.colors.length === 1 || a.angle === b.angle);
  // Today's picture from every source (each cached for the day), for the preview cards.
  let previews = $state<Partial<Record<Provider, Daily | null>>>({});
  $effect(() => {
    if (tab !== 'wallpaper' || prefs.wallpaper.kind !== 'daily') return;
    for (const p of Object.keys(providers) as Provider[])
      if (previews[p] === undefined) dailyWallpaper(p).then((d) => (previews[p] = d)).catch(() => (previews[p] = null));
  });
  let lastProvider = $state<Provider>(prefs.wallpaper.kind === 'daily' ? prefs.wallpaper.provider : 'bing');
  const set = (w: Wallpaper) => (prefs.wallpaper = w);
  function setPaint(colors: string[], angle = paint.angle) {
    paint = { colors, angle };
    set(colors.length === 1 ? { kind: 'color', color: colors[0]! } : { kind: 'gradient', colors, angle });
  }
  const recolor = (i: number, c: string) => setPaint(paint.colors.map((x, j) => (j === i ? c : x)));
  const addColor = () => setPaint([...paint.colors, ['#f5a524', '#e8453c', '#0b57d0', '#0f9d58', '#8f94fb'].find((c) => !paint.colors.includes(c)) ?? '#ffffff']);
  const removeColor = (i: number) => setPaint(paint.colors.filter((_, j) => j !== i));

  // ---- Search ----
  const engine = $derived(engineById(prefs.engine, prefs.engines));
  const engines = $derived(allEngines(prefs.engines));

  // ---- More: your settings as a YAML file ----
  type Rt = { runtime?: { getManifest?(): { version: string } } };
  const g = globalThis as { browser?: Rt; chrome?: Rt };
  const version = (g.browser ?? g.chrome)?.runtime?.getManifest?.().version ?? '';
  let yamlFile = $state<HTMLInputElement>();
  let fileNote = $state<{ ok: boolean; message: string } | null>(null);
  async function exportYaml() {
    const { name, text } = await exportSettings(version);
    download(name, new Blob([text], { type: 'application/yaml' }));
    fileNote = { ok: true, message: `Saved ${name}.` };
  }
  async function importYaml() {
    const f = yamlFile?.files?.[0];
    if (yamlFile) yamlFile.value = '';
    if (!f) return;
    fileNote = f.size > 2 * 1024 * 1024 ? { ok: false, message: 'That file is over 2 MB.' } : await importSettings(await f.text());
    // The wallpaper tab keeps its own copy of the colours and source in use: take the imported ones.
    const w = prefs.wallpaper;
    if (w.kind === 'color') paint = { colors: [w.color], angle: paint.angle };
    if (w.kind === 'gradient') paint = { colors: [...w.colors], angle: w.angle };
    if (w.kind === 'daily') lastProvider = w.provider;
  }

  const ICON = { up: 'M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3', down: 'M12 4v12M7 11l5 5 5-5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3' };
</script>

{#snippet icon(d: string, size = 16)}
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path {d} /></svg>
{/snippet}

<!-- Esc closes the sheet, unless a dialog opened from it (engine or folder picker) is on top: Esc closes that alone. -->
<svelte:window onkeydown={(e) => e.key === 'Escape' && !document.querySelector('dialog[open]') && onclose()} />
<button class="scrim" aria-label="Close settings" onclick={onclose}></button>
<div class="sheet" class:dark role="dialog" aria-label="Settings">
  <div class="grab" aria-hidden="true"></div>
  <div class="tabs" role="tablist" aria-label="Settings">
    {#each TABS as [k, label, d] (k)}
      <button role="tab" aria-selected={tab === k} onclick={() => (tab = k)}>{@render icon(d)}<span>{label}</span></button>
    {/each}
  </div>

  {#key tab}
  <div class="panel" role="tabpanel">
  {#if tab === 'theme'}
    <section>
      <div class="head">
        <h3>Theme</h3>
        <button class="pill" title="Save “{cur.name}” as a CSS file to edit and load back as your own" onclick={() => downloadCss(cur)}>{@render icon(ICON.down, 14)}Save as CSS</button>
      </div>
      <div class="cards themes" role="radiogroup" aria-label="Theme">
        {#each [...builtIn, ...ownThemes.list] as t (t.id)}
          <div class="tcard">
            <Choice label={t.name} checked={prefs.themeId === t.id} onclick={() => (prefs.themeId = t.id)}>
              <ThemePreview theme={t} dark={modeDark} glass={prefs.glass} />
            </Choice>
            {#if t.author === 'You'}
              <button class="tdel" aria-label="Remove {t.name}" title="Remove" onclick={() => removeTheme(t)}>{@render icon('M6 6l12 12M18 6 6 18', 12)}</button>
            {/if}
          </div>
        {/each}
        <button class="addcard" onclick={() => cssFile?.click()}>
          <span class="drop">{@render icon(ICON.up, 22)}<small>.css file</small></span>
          <span>Your own…</span>
        </button>
      </div>
      <input bind:this={cssFile} type="file" accept=".css,text/css" hidden onchange={loadCss} />
      {#if cssError}<p class="note err" role="alert">{cssError}</p>{/if}
    </section>
    <section class="split">
      {#if cur.light && cur.dark}
        <Segmented label="Light or dark" value={prefs.theme} onchange={(v) => (prefs.theme = v)} options={[
          { value: 'auto', label: 'Auto', icon: 'M12 3a9 9 0 1 0 0 18zM12 3a9 9 0 0 1 0 18', filled: true },
          { value: 'light', label: 'Light', icon: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4' },
          { value: 'dark', label: 'Dark', icon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z' },
        ]} />
      {:else}
        <span class="note">{cur.name} is always {cur.dark ? 'dark' : 'light'}</span>
      {/if}
      <label class="switch">
        <span>Transparency<small>Tiles let the wallpaper show through</small></span>
        <input type="checkbox" role="switch" bind:checked={prefs.glass} />
      </label>
    </section>

  {:else if tab === 'tiles'}
    <section>
      <h3>Size</h3>
      <div class="cards five" role="radiogroup" aria-label="Tile size">
        {#each sizes as s (s.k)}
          <Choice label={s.label} art="size-{s.k}" checked={prefs.tileSize === s.k} onclick={() => (prefs.tileSize = s.k)} />
        {/each}
      </div>
    </section>
    <div class="pair">
      <section>
        <h3>Names</h3>
        <div class="cards three" role="radiogroup" aria-label="Names under tiles">
          {#each ([['show', 'Show'], ['hover', 'On hover'], ['hide', 'Hide']] as const) as [k, label] (k)}
            <Choice {label} art="titles-{k}" checked={prefs.titles === k} onclick={() => (prefs.titles = k as typeof prefs.titles)} />
          {/each}
        </div>
      </section>
      <section>
        <h3>Pictures</h3>
        <div class="cards three" role="radiogroup" aria-label="Pictures on tiles">
          {#each ([['cover', 'Photo'], ['logo', 'Logo'], ['shot', 'Screenshot']] as const) as [k, label] (k)}
            <Choice {label} art="pics-{k}" checked={prefs.pictures === k} onclick={() => (prefs.pictures = k as typeof prefs.pictures)} />
          {/each}
        </div>
      </section>
    </div>
    {#if prefs.pictures === 'shot'}
      <p class="note">
        Taken when you visit a site.
        <button class="link" disabled={capturing} onclick={async () => { capturing = true; const n = await oncaptureall(); capturing = false; captured = n; }}>
          {capturing ? 'Taking screenshots…' : 'Take them all now'}
        </button>
        {#if captured !== null && !capturing}<span>· {captured} updated</span>{/if}
      </p>
    {/if}
    <section class="split">
      <span class="label">Tiles in a row</span>
      <div class="stepper">
        <button aria-label="Fewer tiles in a row" onclick={() => (prefs.maxColumns = prefs.maxColumns === 0 ? 9 : Math.max(2, prefs.maxColumns - 1))}>−</button>
        <span class="val" aria-live="polite">{prefs.maxColumns || 'As many as fit'}</span>
        <button aria-label="More tiles in a row" onclick={() => (prefs.maxColumns = prefs.maxColumns === 0 || prefs.maxColumns >= 10 ? 0 : prefs.maxColumns + 1)}>+</button>
      </div>
    </section>

  {:else if tab === 'wallpaper'}
    <section>
      <div class="cards four" role="radiogroup" aria-label="Wallpaper">
        <Choice label="None" checked={wk === 'none'} onclick={() => set({ kind: 'none' })}><span class="sw" style:background={dark ? '#18191c' : '#f5f6f8'}></span></Choice>
        <Choice label="Colour" checked={wk === 'color' || wk === 'gradient'} onclick={() => setPaint(paint.colors)}><span class="sw" style:background={paintCss(paint)}></span></Choice>
        <Choice label="Your picture" checked={wk === 'image'} onclick={() => (ownPic && wk !== 'image' ? set({ kind: 'image' }) : file?.click())}>
          {#if ownPic}<span class="sw" style:background="center / cover no-repeat url({ownPic})"></span>
          {:else}<span class="sw pic">{@render icon('M3 5h18v14H3zM8.5 10a1.5 1.5 0 1 0 0-.01M21 15l-5-5-11 9', 22)}</span>{/if}
        </Choice>
        <Choice label="Daily photo" checked={wk === 'daily'} onclick={() => set({ kind: 'daily', provider: lastProvider })}>
          <span class="sw pic">{@render icon('M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4', 22)}</span>
        </Choice>
      </div>
      <input bind:this={file} type="file" accept="image/*" hidden onchange={() => pickPicture()} />
    </section>

    {#if wk === 'image'}
      <!-- The picture in use, large, and beside it a card to choose (or drop) another. -->
      <section class="daily">
        {#if ownPic}
          <div class="dcard on">
            <button class="dpick" aria-pressed="true" onclick={() => set({ kind: 'image' })}><img src={ownPic} alt="" /><span class="dname">Your picture</span></button>
          </div>
        {/if}
        <div class="dcard">
          <button class="dpick dadd" class:over={dropping} onclick={() => file?.click()}
            ondragover={(e) => { e.preventDefault(); dropping = true; }} ondragleave={() => (dropping = false)}
            ondrop={(e) => { e.preventDefault(); dropping = false; pickPicture(e.dataTransfer?.files[0]); }}>
            <span class="dload">{@render icon(ICON.up, 22)}<span>{ownPic ? 'Choose another' : 'Choose a picture'}</span><small>or drop one here</small></span>
          </button>
        </div>
      </section>
    {:else if wk === 'color' || wk === 'gradient'}
      <!-- Pick a ready-made colour, or make your own: one colour is plain; a second makes a gradient (and only then is
           there a direction to set). -->
      <section>
        <div class="presets" role="radiogroup" aria-label="Ready-made colours">
          {#each PRESETS as p, i (i)}
            <button class="pre" role="radio" aria-checked={samePaint(p, paint)} style:background={paintCss(p)}
              aria-label={p.colors.length === 1 ? `Colour ${p.colors[0]}` : `Gradient ${p.colors.join(' to ')}`} onclick={() => setPaint([...p.colors], p.angle)}></button>
          {/each}
        </div>
      </section>
      <section class="split own">
        <span class="label">Your colours</span>
        <div class="stops">
          {#each paint.colors as c, i (i)}
            <span class="stop">
              <input type="color" value={c} aria-label="Colour {i + 1}" oninput={(e) => recolor(i, (e.currentTarget as HTMLInputElement).value)} />
              {#if paint.colors.length > 1}
                <button class="unstop" aria-label="Remove colour {i + 1}" title="Remove" onclick={() => removeColor(i)}>{@render icon('M6 6l12 12M18 6 6 18', 10)}</button>
              {/if}
            </span>
          {/each}
          {#if paint.colors.length < 4}
            <button class="pill" onclick={addColor}>{@render icon('M12 5v14M5 12h14', 13)}{paint.colors.length === 1 ? 'Add one for a gradient' : 'Add colour'}</button>
          {/if}
        </div>
      </section>
      {#if paint.colors.length > 1}
        <section class="split own">
          <span class="label">Direction</span>
          <div class="stops">
            <span class="angle" style:--a="{paint.angle}deg" aria-hidden="true"></span>
            <input type="range" min="0" max="360" step="15" value={paint.angle} aria-label="Gradient direction" oninput={(e) => setPaint(paint.colors, +(e.currentTarget as HTMLInputElement).value)} />
          </div>
        </section>
      {/if}
    {:else if wk === 'daily'}
      <!-- Today's picture from each source, to pick by eye. Only Unsplash has more than one a day, so only it gets ↻. -->
      <section class="daily">
        {#each Object.entries(providers) as [k, label] (k)}
          {@const d = k === lastProvider && daily ? daily : previews[k as Provider]}
          <div class="dcard" class:on={lastProvider === k}>
            <button class="dpick" aria-pressed={lastProvider === k} onclick={() => { lastProvider = k as Provider; set({ kind: 'daily', provider: lastProvider }); }}>
              {#if d}<img src={previewOf(d.url)} alt="" />{:else}<span class="dload">{previews[k as Provider] === null ? 'Unavailable today' : 'Loading…'}</span>{/if}
              <span class="dname">{label}</span>
            </button>
            {#if k === 'picsum'}
              <button class="dnew" aria-label="New Unsplash picture" title="New picture"
                onclick={() => { if (lastProvider !== 'picsum') { lastProvider = 'picsum'; set({ kind: 'daily', provider: 'picsum' }); } onrefreshdaily(); }}>
                {@render icon('M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5', 15)}
              </button>
            {/if}
          </div>
        {/each}
      </section>
      {#if daily}<p class="credit">{#if daily.link}<a href={daily.link} target="_blank" rel="noreferrer">{daily.credit}</a>{:else}{daily.credit}{/if}</p>{/if}
    {/if}

  {:else if tab === 'search'}
    <section>
      <h3>Search on your dial</h3>
      <div class="cards three narrow" role="radiogroup" aria-label="Search">
        {#each ([['bar', 'Search bar'], ['icon', 'Search button'], ['off', 'Off']] as const) as [k, label] (k)}
          <Choice {label} art="search-{k}" checked={prefs.searchStyle === k} onclick={() => (prefs.searchStyle = k as typeof prefs.searchStyle)} />
        {/each}
      </div>
      <p class="note">Or just start typing anywhere on your dial.</p>
    </section>
    {#if prefs.searchStyle !== 'off'}
      <section>
        <h3>Search the web with</h3>
        <div class="engines">
          <Segmented label="Search engine" value={engine.id} onchange={(v) => (prefs.engine = v)} options={engines.map((e) => ({ value: e.id, label: e.name }))}>
            {#snippet item(o)}<EngineIcon engine={engines.find((e) => e.id === o.value) ?? engine} size={14} />{/snippet}
          </Segmented>
          <button class="pill" onclick={onpickengine}>{@render icon('M12 5v14M5 12h14', 13)}Add or edit</button>
        </div>
      </section>
      <section>
        <label class="switch" class:off={!engine.suggest}>
          <span>Suggestions as you type<small>{engine.suggest ? `What you type in search is sent to ${engine.name}` : `${engine.name} doesn’t offer any; pick another engine for them`}</small></span>
          <input type="checkbox" role="switch" bind:checked={prefs.suggest} disabled={!engine.suggest} />
        </label>
      </section>
    {/if}

  {:else if tab === 'more'}
    <section>
      <h3>On your dial</h3>
      <div class="cards three features">
        {#each ([['addButton', 'Add button', 'feature-add'], ['clock', 'Clock', 'feature-clock'], ['vim', 'Vim keys', 'feature-vim']] as const) as [k, label, art] (k)}
          <label class="feature">
            <Art name={art} view="-30 8 220 84" />
            <span class="frow">{label}<input type="checkbox" role="switch" bind:checked={prefs[k as 'addButton' | 'clock' | 'vim']} /></span>
          </label>
        {/each}
      </div>
    </section>
    <section>
      <h3>Your sites</h3>
      <div class="box">
        {@render icon('M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 20)}
        <span>Your dial shows the <b>{folderLabel}</b> folder from your bookmarks.</span>
        <button class="pill" onclick={onpickfolder}>Change</button>
      </div>
    </section>
    <section>
      <h3>Back up your settings</h3>
      <div class="box">
        {@render icon('M4 4h12l4 4v12H4zM8 4v5h7V4M8 20v-6h8v6', 20)}
        <span>Save your settings and own themes as a file, or load them from one.</span>
        <button class="pill" onclick={() => yamlFile?.click()}>{@render icon(ICON.up, 14)}Load</button>
        <button class="pill" onclick={exportYaml}>{@render icon(ICON.down, 14)}Save</button>
      </div>
      <input bind:this={yamlFile} type="file" accept=".yaml,.yml,application/yaml,text/yaml" hidden onchange={importYaml} />
      {#if fileNote}<p class="note" class:err={!fileNote.ok} role={fileNote.ok ? 'status' : 'alert'}>{fileNote.message}</p>{/if}
    </section>

  {:else}
    <section class="about">
      <svg viewBox="0 0 128 128" width="64" height="64" aria-hidden="true">
        <g fill="#4263EB"><rect width="32" height="32" rx="8"/><rect x="48" width="32" height="32" rx="8"/><rect y="48" width="32" height="32" rx="8"/><rect x="48" y="48" width="32" height="32" rx="8"/><rect y="96" width="32" height="32" rx="8"/><rect x="48" y="96" width="32" height="32" rx="8"/><rect x="96" y="96" width="32" height="32" rx="8"/></g>
        <path d="M104 0h16a8 8 0 0 1 8 8v72l-16-14-16 14V8a8 8 0 0 1 8-8z" fill="#F59F00"/>
      </svg>
      <h2>Openmarks{#if version}<span class="ver">{version}</span>{/if}</h2>
      <p>Your favourite sites, one click away on every new tab. Free and open source: no account, no ads, no tracking.</p>
      <div class="links">
        <a class="pill big" href="https://rishabh0111.github.io/openmarks/" target="_blank" rel="noreferrer">{@render icon('M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18')}Website</a>
        <a class="pill big" href="https://github.com/rishabh0111/openmarks" target="_blank" rel="noreferrer">{@render icon('M9 19c-4 1.5-4-2-6-2.5M15 21v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21')}Source code</a>
      </div>
    </section>
  {/if}
  </div>
  {/key}
</div>

<style>
  .scrim { position: fixed; inset: 0; border: 0; background: rgb(0 0 0 / 0.12); z-index: 30; cursor: default; } /* no blur: you see changes live */
  .sheet {
    --tone: color-mix(in srgb, var(--text) 6%, var(--surface));
    position: fixed; left: 50%; bottom: 0; transform: translateX(-50%); z-index: 31; box-sizing: border-box; width: min(800px, calc(100vw - 32px)); max-height: 88vh;
    display: flex; flex-direction: column; padding: 8px 0 0; border: 1px solid var(--line); border-bottom: 0; border-radius: 20px 20px 0 0;
    background: color-mix(in srgb, var(--surface) var(--float-alpha), transparent); backdrop-filter: var(--float-blur); color: var(--text);
    box-shadow: 0 -12px 48px rgb(0 0 0 / 0.22); font: 14px/1.4 var(--font-family); animation: up 0.24s ease-out;
  }
  @keyframes up { from { transform: translate(-50%, 24px); opacity: 0; } }
  .grab { flex: none; width: 40px; height: 4px; margin: 0 auto 10px; border-radius: 2px; background: color-mix(in srgb, var(--text) 18%, transparent); }

  /* The tabs: one pill, the open one raised, like every other choice here. */
  .tabs { flex: none; display: grid; grid-template-columns: repeat(6, 1fr); gap: 2px; margin: 0 20px; padding: 4px; border-radius: 16px; background: var(--tone); }
  .tabs button { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 38px; padding: 0 8px; border: 0; border-radius: 12px; background: none;
    color: var(--muted); font: inherit; font-size: 14px; font-weight: 500; cursor: pointer; transition: background 0.15s, color 0.15s; }
  .tabs button:hover { color: var(--text); }
  .tabs button[aria-selected='true'] { background: var(--surface); color: var(--text); font-weight: 600; box-shadow: 0 1px 4px rgb(0 0 0 / 0.16); }
  .tabs button[aria-selected='true'] svg { color: var(--ring); }

  /* One height for every tab, so switching never moves the sheet's top edge; a tab with more scrolls. It gives way when
     the window is too short. */
  .panel { flex: 0 1 auto; height: 440px; min-height: 0; overflow-y: auto; box-sizing: border-box; display: flex; flex-direction: column; gap: 22px;
    padding: 20px 24px 24px; scrollbar-color: color-mix(in srgb, var(--text) 25%, transparent) transparent; animation: arrive 0.2s ease-out; }
  @keyframes arrive { from { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .sheet, .panel { animation: none; } }
  section { margin: 0; }
  h3 { margin: 0 0 10px; font-size: 14px; font-weight: 600; }
  .head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
  .head h3 { margin: 0; }
  .note { margin: 8px 0 0; color: var(--muted); font-size: 13px; }
  .note.err { color: var(--danger, #c62f2f); }
  .label { font-weight: 600; }
  .split { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px 20px; }

  .cards { display: grid; gap: 10px; }
  .themes { grid-template-columns: repeat(auto-fill, minmax(128px, 1fr)); }
  .five { grid-template-columns: repeat(5, 1fr); }
  .four { grid-template-columns: repeat(4, 1fr); }
  .three { grid-template-columns: repeat(3, 1fr); }
  .three.narrow { max-width: 520px; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }

  .tcard { position: relative; display: flex; }
  .tcard > :global(.choice) { flex: 1; }
  .tdel { position: absolute; top: 2px; right: 2px; width: 24px; height: 24px; display: grid; place-items: center; padding: 0; border: 0; border-radius: 50%;
    background: var(--surface); color: var(--muted); box-shadow: 0 0 0 1px var(--line); cursor: pointer; opacity: 0; transition: opacity 0.12s; }
  .tcard:hover .tdel, .tdel:focus-visible { opacity: 1; }
  .tdel:hover { color: var(--danger, #c62f2f); }
  .addcard { display: flex; flex-direction: column; gap: 6px; padding: 6px 6px 9px; border: 2px solid transparent; border-radius: 14px; background: none;
    color: var(--muted); font: inherit; font-size: 13.5px; cursor: pointer; transition: border-color 0.15s, color 0.15s; }
  .addcard .drop { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; aspect-ratio: 4 / 3; border-radius: 8px;
    border: 2px dashed color-mix(in srgb, var(--text) 25%, transparent); }
  .addcard .drop small { font-size: 11.5px; }
  .addcard:hover { color: var(--text); border-color: color-mix(in srgb, var(--ring) 40%, transparent); }

  /* A setting that's on or off: its name, a line on what it does, the switch. */
  .switch { display: flex; align-items: center; gap: 14px; cursor: pointer; }
  .switch > span { display: flex; flex-direction: column; font-weight: 600; }
  .switch small { font-size: 12.5px; font-weight: 400; color: var(--muted); }
  section > .switch { justify-content: space-between; padding: 12px 14px; border-radius: 14px; background: var(--tone); }
  .switch.off input { opacity: 0.4; cursor: default; }
  input[role='switch'] { appearance: none; flex: none; width: 40px; height: 24px; margin: 0; border-radius: 999px; position: relative; cursor: pointer;
    background: color-mix(in srgb, var(--text) 20%, transparent); transition: background 0.15s; }
  input[role='switch']::after { content: ''; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff;
    box-shadow: 0 1px 2px rgb(0 0 0 / 0.3); transition: transform 0.15s; }
  input[role='switch']:checked { background: var(--ring); }
  input[role='switch']:checked::after { transform: translateX(16px); }

  /* The features on the dial: a drawing, the name and the switch, on one card. */
  .feature { display: flex; flex-direction: column; gap: 8px; padding: 6px 6px 8px; border: 2px solid transparent; border-radius: 14px; cursor: pointer;
    transition: border-color 0.15s; }
  .feature:hover { border-color: color-mix(in srgb, var(--ring) 40%, transparent); }
  .feature:has(input:checked) { border-color: var(--ring); background: color-mix(in srgb, var(--ring) 6%, transparent); }
  .frow { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 4px; font-weight: 600; }

  .box { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 14px; background: var(--tone); }
  .box > svg { flex: none; color: var(--ring); }
  .box > span { flex: 1; min-width: 0; }

  .pill { flex: none; display: inline-flex; align-items: center; gap: 6px; min-height: 32px; padding: 0 14px; border: 1px solid var(--line); border-radius: 999px;
    background: var(--surface); color: var(--text); font: inherit; font-size: 13px; font-weight: 600; text-decoration: none; cursor: pointer;
    transition: border-color 0.15s, background 0.15s; }
  .pill:hover { border-color: var(--ring); }
  .pill.big { min-height: 40px; padding: 0 18px; font-size: 14px; }
  .pill.big svg { color: var(--ring); }
  .engines { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }

  .stepper { display: flex; align-items: center; gap: 4px; padding: 3px; border-radius: 999px; background: var(--tone); }
  .stepper button { width: 32px; height: 32px; border: 0; border-radius: 50%; background: var(--surface); color: var(--text); font: inherit; font-size: 16px;
    cursor: pointer; box-shadow: 0 1px 3px rgb(0 0 0 / 0.14); }
  .stepper button:active { transform: scale(0.92); }
  .stepper .val { min-width: 112px; text-align: center; font-weight: 600; font-variant-numeric: tabular-nums; }

  .link { border: 0; background: none; padding: 0; color: var(--ring); font: inherit; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
  .link:disabled { color: var(--muted); cursor: default; text-decoration: none; }

  /* Wallpaper */
  .sw { display: grid; place-items: center; aspect-ratio: 16 / 10; border-radius: 8px; color: var(--muted); box-shadow: inset 0 0 0 1px var(--line); }
  .sw.pic { background: var(--tone); }
  .presets { display: grid; grid-template-columns: repeat(auto-fill, minmax(56px, 1fr)); gap: 8px; }
  .pre { aspect-ratio: 16 / 10; padding: 0; border: 0; border-radius: 8px; box-shadow: inset 0 0 0 1px var(--line); cursor: pointer; transition: box-shadow 0.15s, transform 0.08s; }
  .pre:hover { box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px color-mix(in srgb, var(--ring) 45%, transparent); }
  .pre:active { transform: scale(0.95); }
  .pre[aria-checked='true'] { box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--ring); }
  .own { justify-content: flex-start; }
  .own .label { min-width: 104px; }
  .stops { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; flex: 1; }
  .stop { position: relative; display: inline-flex; }
  .stop input[type='color'] { width: 42px; height: 32px; padding: 0; border: 1px solid var(--line); border-radius: 8px; background: none; cursor: pointer; }
  .unstop { position: absolute; top: -6px; right: -6px; width: 18px; height: 18px; display: grid; place-items: center; padding: 0; border: 0; border-radius: 50%;
    background: var(--surface); color: var(--muted); box-shadow: 0 0 0 1px var(--line), 0 1px 3px rgb(0 0 0 / 0.2); cursor: pointer; opacity: 0; transition: opacity 0.12s; }
  .stop:hover .unstop, .unstop:focus-visible { opacity: 1; }
  .unstop:hover { color: var(--danger, #c62f2f); }
  .stops input[type='range'] { flex: 1; min-width: 120px; accent-color: var(--ring); }
  .angle { width: 24px; height: 24px; border-radius: 50%; border: 1px solid var(--line); background: conic-gradient(from var(--a), var(--ring) 0 14deg, transparent 14deg); }
  .daily { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .dcard { position: relative; }
  .dpick { position: relative; display: block; width: 100%; aspect-ratio: 16 / 10; padding: 0; overflow: hidden; border: 2px solid transparent; border-radius: 12px;
    background: var(--tone); cursor: pointer; transition: border-color 0.15s, transform 0.08s; }
  .dpick:hover { border-color: color-mix(in srgb, var(--ring) 45%, transparent); }
  .dpick:active { transform: scale(0.98); }
  .dcard.on .dpick { border-color: var(--ring); }
  .dpick img { display: block; width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
  .dpick:hover img { transform: scale(1.04); }
  .dload { position: absolute; inset: 0; display: grid; place-items: center; color: var(--muted); font-size: 12.5px; }
  .dname { position: absolute; left: 0; right: 0; bottom: 0; padding: 16px 10px 6px; text-align: left; color: #fff; font-size: 12.5px; font-weight: 600;
    background: linear-gradient(transparent, rgb(0 0 0 / 0.6)); }
  .dnew { position: absolute; top: 8px; right: 8px; width: 30px; height: 30px; display: grid; place-items: center; padding: 0; border: 0; border-radius: 50%;
    background: rgb(0 0 0 / 0.5); color: #fff; cursor: pointer; backdrop-filter: blur(6px); }
  .dnew:hover { background: rgb(0 0 0 / 0.7); }
  .dpick.dadd { border: 2px dashed color-mix(in srgb, var(--text) 25%, transparent); background: none; color: var(--muted); }
  .dadd .dload { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: inherit; }
  .dadd .dload span { font-weight: 600; font-size: 13px; }
  .dadd .dload small { font-size: 11.5px; }
  .dpick.dadd:hover, .dpick.dadd.over { color: var(--text); border-color: var(--ring); background: color-mix(in srgb, var(--ring) 8%, transparent); }
  .credit { margin: -12px 0 0; font-size: 12px; color: var(--muted); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .credit a { color: inherit; }

  .about { display: flex; flex-direction: column; align-items: center; text-align: center; padding-top: 16px; }
  .about h2 { margin: 14px 0 4px; font-size: 22px; font-weight: 650; }
  .about .ver { margin-left: 8px; font-size: 14px; font-weight: 500; color: var(--muted); font-variant-numeric: tabular-nums; }
  .about p { margin: 0 0 22px; max-width: 46ch; color: var(--muted); }
  .links { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }

  :focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }

  /* Phones: the sheet takes the full width, tabs show icon over name, options wrap, the panel scrolls. */
  @media (max-width: 599px) {
    .sheet { width: 100vw; border-radius: 18px 18px 0 0; padding-bottom: env(safe-area-inset-bottom); }
    .tabs { margin: 0 10px; padding: 3px; }
    .tabs button { flex-direction: column; gap: 3px; min-height: 48px; padding: 4px 2px; font-size: 11px; }
    .panel { height: 64vh; padding: 16px 14px 20px; gap: 18px; }
    .five { grid-template-columns: repeat(3, 1fr); }
    .four, .pair { grid-template-columns: 1fr 1fr; }
    .pair { gap: 18px; grid-template-columns: 1fr; }
    .daily { grid-template-columns: 1fr 1fr; }
    .box { flex-wrap: wrap; }
    .features { grid-template-columns: 1fr; gap: 6px; }
    .feature { flex-direction: row; align-items: center; gap: 12px; }
    .feature > :global(svg) { flex: none; width: 104px; }
    .frow { flex: 1; }
  }
  @media (min-width: 600px) and (max-width: 799px) { .panel { height: min(440px, 60vh); } }
</style>
