<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- The welcome: a short setup over the dial after a first install (background.ts sets the flag, Shell shows this),
     and again from Settings › About. One page at a time, mostly pictures: what Openmarks is, where your sites are
     kept, the look, search, how to add sites, and done. Each choice is saved as it's made, and the dial behind
     shows it at once (pick a theme and watch it change). Progress runs along the top: the points you've passed
     fill in, joined by a line that grows as you go. -->
<script lang="ts">
  import { prefs } from './prefs.svelte';
  import { builtIn, themeById } from './themes';
  import { builtInEngines, engineById } from './search';
  import { perm } from './bm';
  import { folderChoices, type FolderChoice } from './shared';
  import { icons } from './icons';
  import { ownThemes } from './ownthemes.svelte';
  import ThemePreview from './ThemePreview.svelte';
  import EngineIcon from './EngineIcon.svelte';
  import Choice from './Choice.svelte';
  import Segmented from './Segmented.svelte';
  import Art from './Art.svelte';

  let { onfolder, onclose }: { onfolder: (id: string | null) => void; onclose: () => void } = $props();

  type Rt = { runtime?: { getURL(p: string): string } };
  const g = globalThis as { browser?: Rt; chrome?: Rt };
  const firefox = ((g.browser ?? g.chrome)?.runtime?.getURL('/') ?? '').startsWith('moz-extension:');
  const browserName = firefox ? 'Firefox' : 'your browser';
  const mac = /Mac|iPhone|iPad/.test(navigator.platform);

  const steps = ['Welcome', 'Your sites', 'Look', 'Search', 'Add sites', 'Done'];
  const last = steps.length - 1;
  let step = $state(0);
  let heading = $state<HTMLElement>();
  function go(to: number) {
    step = Math.max(0, Math.min(last, to));
    // Where you are is read out, and the keys start from the top of the new page.
    queueMicrotask(() => heading?.focus({ preventScroll: true }));
  }

  let d = $state<HTMLDialogElement>();
  $effect(() => {
    d?.showModal();
    heading?.focus({ preventScroll: true }); // not the first point of the progress, which the dialog would pick
  });

  // Your sites: the dial's own folder, or one you already have (the dial behind switches to it).
  let useExisting = $state(prefs.dialFolder !== null);
  let folders = $state<FolderChoice[] | null>(null);
  $effect(() => {
    if (useExisting && !folders) folderChoices().then((f) => (folders = f)).catch(() => (folders = []));
  });
  function fresh() {
    useExisting = false;
    if (prefs.dialFolder !== null) onfolder(null);
  }

  // Site pictures: granted at install in most browsers; Firefox may hold it back until asked.
  let granted = $state(true);
  perm.has().then((v) => (granted = v)).catch(() => {});
  const allow = () => perm.request().then((v) => (granted = v)).catch(() => {});

  const theme = $derived(themeById(prefs.themeId, ownThemes.list));
  const modeDark = $derived(prefs.theme === 'auto' ? matchMedia('(prefers-color-scheme: dark)').matches : prefs.theme === 'dark');
  const engine = $derived(engineById(prefs.engine, prefs.engines));
</script>

<!-- Esc, or Skip: closed for good (Settings › About brings it back). -->
<dialog bind:this={d} class="welcome" aria-labelledby="welcome-title" onclose={onclose}>
  <ol class="stepper" style:--progress={step / last} aria-label="Setup progress">
    {#each steps as label, i (label)}
      <li class:done={i < step} class:now={i === step}>
        <button aria-current={i === step ? 'step' : undefined} aria-label="{label}{i < step ? ', done' : ''}" onclick={() => go(i)}>
          <span class="dot" aria-hidden="true">
            {#if i < step}<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path class="tick" d={icons.check} pathLength="1" /></svg>{/if}
          </span>
          <span class="label">{label}</span>
        </button>
      </li>
    {/each}
  </ol>

  {#key step}
  <section class="body" aria-labelledby="welcome-title">
    {#if step === 0}
      <div class="hero">
        <svg viewBox="0 0 128 128" width="72" height="72" aria-hidden="true">
          <g fill="#4263EB"><rect width="32" height="32" rx="8"/><rect x="48" width="32" height="32" rx="8"/><rect y="48" width="32" height="32" rx="8"/><rect x="48" y="48" width="32" height="32" rx="8"/><rect y="96" width="32" height="32" rx="8"/><rect x="48" y="96" width="32" height="32" rx="8"/><rect x="96" y="96" width="32" height="32" rx="8"/></g>
          <path d="M104 0h16a8 8 0 0 1 8 8v72l-16-14-16 14V8a8 8 0 0 1 8-8z" fill="#F59F00"/>
        </svg>
        <h2 id="welcome-title" tabindex="-1" bind:this={heading}>Welcome to Openmarks</h2>
        <p class="lead">Your favourite sites, one click away on every new tab.</p>
        <ul class="perks">
          <li><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/></svg>Sites as tiles</li>
          <li><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg>Saved in your bookmarks</li>
          <li><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/></svg>No account, no tracking</li>
        </ul>
      </div>

    {:else if step === 1}
      <h2 id="welcome-title" tabindex="-1" bind:this={heading}>Where should your sites live?</h2>
      <p class="lead">They’re saved as bookmarks, so they’re always yours.</p>
      <div class="pair" role="radiogroup" aria-label="Dial folder">
        <Choice label="Start fresh" sub="An empty folder, just for your dial" art="folder-new" view="-40 14 240 76" checked={!useExisting} onclick={fresh} />
        <Choice label="Use my bookmarks" sub="A folder you already have" art="folder-mine" view="-40 14 240 76" checked={useExisting} onclick={() => (useExisting = true)} />
      </div>
      {#if useExisting}
        {#if folders === null}
          <p class="note">Reading your bookmarks…</p>
        {:else if !folders.length}
          <p class="note">No bookmark folders yet, so Openmarks starts with its own.</p>
        {:else}
          <div class="flist" role="listbox" aria-label="Your bookmark folders">
            {#each folders as f (f.id)}
              <button role="option" aria-selected={prefs.dialFolder === f.id} class:on={prefs.dialFolder === f.id} onclick={() => onfolder(f.id)}>
                <span class="fpath">{f.path}{#if f.suggested}<em>suggested</em>{/if}</span>
                <small>{f.count === 1 ? '1 site' : `${f.count} sites`}</small>
              </button>
            {/each}
          </div>
        {/if}
      {/if}

    {:else if step === 2}
      <h2 id="welcome-title" tabindex="-1" bind:this={heading}>Pick a look</h2>
      <p class="lead">Your dial changes behind this window as you choose.</p>
      <div class="grid4" role="radiogroup" aria-label="Theme">
        {#each [...builtIn, ...ownThemes.list] as t (t.id)}
          <Choice label={t.name} checked={prefs.themeId === t.id} onclick={() => (prefs.themeId = t.id)}><ThemePreview theme={t} dark={modeDark} glass={false} /></Choice>
        {/each}
      </div>
      {#if theme.light && theme.dark}
        <div class="center">
          <Segmented label="Light or dark" value={prefs.theme} onchange={(v) => (prefs.theme = v)} options={[
            { value: 'auto', label: 'Auto', icon: 'M12 3a9 9 0 1 0 0 18zM12 3a9 9 0 0 1 0 18', filled: true },
            { value: 'light', label: 'Light', icon: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4' },
            { value: 'dark', label: 'Dark', icon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z' },
          ]} />
        </div>
      {/if}

    {:else if step === 3}
      <h2 id="welcome-title" tabindex="-1" bind:this={heading}>Search from your dial</h2>
      <p class="lead">Finds your sites first, then the web.</p>
      <div class="grid3" role="radiogroup" aria-label="Search">
        {#each ([['bar', 'Search bar'], ['icon', 'Search button'], ['off', 'No search']] as const) as [k, label] (k)}
          <Choice {label} art="search-{k}" checked={prefs.searchStyle === k} onclick={() => (prefs.searchStyle = k as typeof prefs.searchStyle)} />
        {/each}
      </div>
      {#if prefs.searchStyle !== 'off'}
        <div class="center">
          <Segmented label="Search engine" value={engine.id} onchange={(v) => (prefs.engine = v)} options={builtInEngines.map((e) => ({ value: e.id, label: e.name }))}>
            {#snippet item(o)}<EngineIcon engine={builtInEngines.find((e) => e.id === o.value)!} size={14} />{/snippet}
          </Segmented>
        </div>
      {/if}

    {:else if step === 4}
      <h2 id="welcome-title" tabindex="-1" bind:this={heading}>Adding sites is easy</h2>
      <p class="lead">Four ways. Use whichever you like.</p>
      <ul class="ways">
        {#each ([['add-plus', 'Click +', 'then type the address'], ['add-paste', 'Paste a link', 'anywhere on your dial'], ['add-menu', 'Right-click a page', 'Openmarks › Add to Home'], ['add-tabs', 'Add open tabs', 'right-click your dial']] as const) as [art, title, how] (art)}
          <li><Art name={art} {mac} /><strong>{title}</strong><span>{how}</span></li>
        {/each}
      </ul>

    {:else}
      <div class="hero">
        <svg class="bigtick" viewBox="0 0 72 72" width="72" height="72" aria-hidden="true">
          <circle cx="36" cy="36" r="34" />
          <path d="M22 37l9.5 9.5L51 27" class="tickdraw" pathLength="1" />
        </svg>
        <h2 id="welcome-title" tabindex="-1" bind:this={heading}>You’re all set!</h2>
        <p class="lead">Open a new tab any time to see your dial.</p>
        <div class="tips">
          <p class="tip">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>
            <span>If {browserName} asks about your new tab page, choose to <b>keep</b> it.</span>
          </p>
          {#if !granted}
            <p class="tip">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d={icons.image} /></svg>
              <span>Show logos and pictures for your sites?</span>
              <button class="small" onclick={allow}>Allow</button>
            </p>
          {/if}
        </div>
      </div>
    {/if}
  </section>
  {/key}

  <footer class="nav">
    {#if step === 0}
      <button class="textbtn" onclick={() => d?.close()}>Skip</button>
    {:else}
      <button class="textbtn" onclick={() => go(step - 1)}>Back</button>
    {/if}
    {#if step < last}
      <button class="primary" onclick={() => go(step + 1)}>{step === 0 ? 'Let’s go' : 'Next'}</button>
    {:else}
      <button class="primary" onclick={() => d?.close()}>Start using Openmarks</button>
    {/if}
  </footer>
</dialog>

<style>
  .welcome {
    --tone: color-mix(in srgb, var(--text) 6%, var(--surface));
    box-sizing: border-box; width: min(720px, calc(100vw - 24px)); height: min(600px, calc(100vh - 24px)); max-width: none; max-height: none; padding: 0;
    display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--line); border-radius: 18px;
    background: var(--surface); color: var(--text); font: 15px/1.45 var(--font-family);
    box-shadow: 0 30px 80px rgb(0 0 0 / 0.3), 0 6px 18px rgb(0 0 0 / 0.12); animation: rise 0.28s ease-out;
  }
  .welcome::backdrop { background: rgb(0 0 0 / 0.32); animation: fade 0.28s ease-out; }
  @keyframes rise { from { opacity: 0; transform: translateY(12px) scale(0.98); } }
  @keyframes fade { from { opacity: 0; } }

  /* Progress: a point per page on a line. The line fills to where you are; points you've passed turn solid, and
     their tick draws itself in. */
  .stepper { position: relative; list-style: none; margin: 0; padding: 22px 12px 14px; display: grid; grid-template-columns: repeat(6, 1fr); flex: none; }
  .stepper::before, .stepper::after { content: ''; position: absolute; top: 32px; left: calc(12px + (100% - 24px) / 12); height: 4px; border-radius: 2px; }
  .stepper::before { right: calc(12px + (100% - 24px) / 12); background: color-mix(in srgb, var(--text) 14%, transparent); }
  .stepper::after { width: calc((100% - 24px) * 5 / 6 * var(--progress)); background: var(--ring); transition: width 0.45s cubic-bezier(0.2, 0.8, 0.2, 1); }
  .stepper li { position: relative; z-index: 1; display: flex; justify-content: center; }
  .stepper button { display: flex; flex-direction: column; align-items: center; gap: 7px; padding: 0 4px; border: 0; background: none; color: var(--muted);
    font: inherit; font-size: 12.5px; cursor: pointer; }
  .stepper button:hover { color: var(--text); }
  .dot { width: 24px; height: 24px; box-sizing: border-box; display: grid; place-items: center; border-radius: 50%; color: var(--on-ring);
    background: var(--surface); border: 3px solid color-mix(in srgb, var(--text) 18%, var(--surface));
    transition: background 0.25s, border-color 0.25s; }
  .now .dot { border-color: var(--ring); box-shadow: 0 0 0 5px color-mix(in srgb, var(--ring) 18%, transparent); }
  .now .dot::after { content: ''; width: 8px; height: 8px; border-radius: 50%; background: var(--ring); }
  .done .dot { background: var(--ring); border-color: var(--ring); animation: pop 0.32s cubic-bezier(0.2, 0.8, 0.2, 1); }
  .tick { stroke-dasharray: 1; stroke-dashoffset: 0; animation: draw 0.32s 0.08s ease-out backwards; }
  .now button, .done button { color: var(--text); }
  .now .label { font-weight: 600; }
  @keyframes pop { from { transform: scale(0.6); } }
  @keyframes draw { from { stroke-dashoffset: 1; } }

  .body { flex: 1; min-height: 0; overflow: auto; padding: 18px 40px 8px; animation: arrive 0.24s ease-out; }
  @keyframes arrive { from { opacity: 0; transform: translateX(10px); } }
  h2 { margin: 0 0 4px; font-size: 24px; line-height: 1.2; font-weight: 650; letter-spacing: -0.01em; text-align: center; text-wrap: balance; outline: none; }
  .lead { margin: 0 0 22px; color: var(--muted); text-align: center; }
  .note { margin: 14px 0 0; color: var(--muted); font-size: 14px; text-align: center; }

  .hero { display: flex; flex-direction: column; align-items: center; padding-top: 18px; }
  .hero > svg { margin-bottom: 18px; }
  .perks { list-style: none; margin: 8px 0 0; padding: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; width: 100%; }
  .perks li { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 18px 10px; border-radius: 14px; background: var(--tone);
    font-weight: 600; font-size: 14px; text-align: center; }
  .perks svg { color: var(--ring); }

  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .center { display: flex; justify-content: center; margin-top: 18px; }
  .grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }


  .ways { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px 14px; }
  .ways li { display: flex; flex-direction: column; align-items: center; gap: 2px; text-align: center; }
  .ways :global(svg) { margin-bottom: 8px; }
  .ways strong { font-size: 15px; }
  .ways span { color: var(--muted); font-size: 13.5px; }


  .flist { margin-top: 12px; max-height: 150px; overflow: auto; border-radius: 12px; background: var(--tone);
    scrollbar-color: color-mix(in srgb, var(--text) 30%, transparent) transparent; }
  .flist button { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 42px; padding: 6px 14px; border: 0;
    background: none; color: var(--text); font: inherit; font-size: 14px; text-align: left; cursor: pointer; }
  .flist button:hover { background: color-mix(in srgb, var(--text) 6%, transparent); }
  .flist button.on { background: color-mix(in srgb, var(--ring) 18%, transparent); }
  .fpath { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .fpath em { margin-left: 8px; font-style: normal; font-size: 12px; color: var(--ring); }
  .flist small { flex: none; color: var(--muted); font-size: 13px; font-variant-numeric: tabular-nums; }

  .bigtick { animation: pop 0.4s cubic-bezier(0.2, 0.8, 0.2, 1); }
  .bigtick circle { fill: var(--ring); }
  .tickdraw { fill: none; stroke: var(--on-ring); stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1; animation: draw 0.45s 0.15s ease-out backwards; }
  .tips { display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 460px; margin-top: 4px; }
  .tip { display: flex; align-items: center; gap: 12px; margin: 0; padding: 12px 14px; border-radius: 12px; background: var(--tone); font-size: 14px; }
  .tip svg { flex: none; color: var(--ring); }
  .tip span { flex: 1; }
  .small { flex: none; min-height: 32px; padding: 0 14px; border: 1px solid var(--ring); border-radius: 999px; background: none; color: var(--text);
    font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
  .small:hover { background: color-mix(in srgb, var(--ring) 12%, transparent); }

  .nav { flex: none; display: flex; align-items: center; gap: 12px; padding: 14px 24px 18px; }
  .primary { margin-left: auto; min-height: 44px; padding: 0 26px; border: 0; border-radius: 999px; background: var(--ring); color: var(--on-ring);
    font: inherit; font-weight: 600; cursor: pointer; transition: filter 0.12s, transform 0.08s; }
  .primary:hover { filter: brightness(1.08); }
  .primary:active { transform: scale(0.97); }
  .textbtn { min-height: 44px; padding: 0 8px; border: 0; background: none; color: var(--muted); font: inherit; cursor: pointer; }
  .textbtn:hover { color: var(--text); }
  .welcome :focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
  .welcome h2:focus-visible { outline: none; }

  @media (prefers-reduced-motion: reduce) {
    .welcome, .welcome::backdrop, .body, .done .dot, .tick, .bigtick, .tickdraw { animation: none; }
    .stepper::after { transition: none; }
  }
  /* Phones: the dialog fills the screen; only the current page's name shows under the points. */
  @media (max-width: 599px) {
    .welcome { width: 100vw; height: 100dvh; border: 0; border-radius: 0; }
    .stepper { padding: 18px 4px 10px; }
    .stepper::before, .stepper::after { top: 28px; left: calc(4px + (100% - 8px) / 12); }
    .stepper::before { right: calc(4px + (100% - 8px) / 12); }
    .stepper::after { width: calc((100% - 8px) * 5 / 6 * var(--progress)); }
    .stepper .label { visibility: hidden; }
    .stepper .now .label { visibility: visible; white-space: nowrap; }
    .body { padding: 14px 18px 8px; }
    h2 { font-size: 21px; }
    .perks { grid-template-columns: 1fr; }
    .perks li { flex-direction: row; justify-content: flex-start; padding: 12px 14px; }
    .grid4 { grid-template-columns: repeat(2, 1fr); }
    .ways { grid-template-columns: 1fr 1fr; gap: 12px; }
    .nav { padding: 10px 16px 16px; }
  }
</style>
