<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- The small drawings on the choices in Settings and the welcome: what a setting does, drawn in the theme's own
     colours (a page, tiles, and the accent for the part the choice is about). One 160 × 100 canvas each; `view` crops
     or widens it for a wider card. -->
<script lang="ts">
  let { name, mac = false, view = '0 0 160 100' }: { name: string; mac?: boolean; view?: string } = $props();
  // Tiles in a row for a tile size: how many fit, and how big.
  const sizes: Record<string, number> = { S: 5, M: 4, L: 3, XL: 2 };
  const row = (n: number) => {
    const w = (136 - (n - 1) * 6) / n;
    return Array.from({ length: n }, (_, i) => ({ x: 12 + i * (w + 6), w, h: w * 0.66 }));
  };
  const six = [0, 1, 2].flatMap((c) => [0, 1].map((r) => ({ x: 26 + c * 38, y: 40 + r * 28 })));
</script>

<svg viewBox={view} aria-hidden="true" preserveAspectRatio="xMidYMid meet">
  {#if name.startsWith('search-')}
    {#if name === 'search-bar'}<rect x="46" y="12" width="68" height="13" rx="6.5" class="a" /><circle cx="54" cy="18.5" r="2.5" class="onf" />{/if}
    {#if name === 'search-icon'}<circle cx="144" cy="17" r="8" class="a" /><circle cx="144" cy="17" r="2.5" class="onf" />{/if}
    {#each six as p}<rect x={p.x} y={p.y} width="32" height="22" rx="3" class="t" />{/each}

  {:else if name === 'size-icon'}
    {#each [0, 1, 2, 3] as i}<rect x={26 + i * 30} y="32" width="20" height="20" rx="5" class="a" /><rect x={28 + i * 30} y="58" width="16" height="4" rx="2" class="t" />{/each}
  {:else if name.startsWith('size-')}
    {#each row(sizes[name.slice(5)] ?? 4) as t, i}<rect x={t.x} y={50 - t.h / 2} width={t.w} height={t.h} rx="3" class={i === 0 ? 'a' : 't'} />{/each}

  {:else if name.startsWith('titles-')}
    <rect x="44" y="18" width="72" height="46" rx="5" class="t" />
    {#if name === 'titles-show'}<rect x="54" y="72" width="52" height="7" rx="3.5" class="a" />{/if}
    {#if name === 'titles-hover'}<rect x="54" y="72" width="52" height="7" rx="3.5" class="a" opacity="0.35" /><path d="M110 50l10 17-5-1.5-3 6-3-1.5 3-6-5 0z" class="ink" />{/if}

  {:else if name.startsWith('pics-')}
    <rect x="40" y="16" width="80" height="58" rx="5" class="t" />
    {#if name === 'pics-cover'}<path d="M40 64l20-18 14 11 12-8 34 22v3a5 5 0 0 1-5 5H45a5 5 0 0 1-5-5z" class="a" /><circle cx="98" cy="31" r="6" class="a" />{/if}
    {#if name === 'pics-logo'}<rect x="66" y="31" width="28" height="28" rx="7" class="a" />{/if}
    {#if name === 'pics-shot'}<rect x="46" y="22" width="68" height="7" rx="2" class="a" /><rect x="46" y="34" width="30" height="34" rx="2" class="ink" opacity="0.5" />{#each [0, 1, 2] as i}<rect x="82" y={35 + i * 11} width={32 - i * 6} height="5" rx="2" class="ink" opacity="0.5" />{/each}{/if}

  {:else if name.startsWith('folder-')}
    <path d="M44 31a5 5 0 0 1 5-5h18l6 6h38a5 5 0 0 1 5 5v34a5 5 0 0 1-5 5H49a5 5 0 0 1-5-5z" class="fold" />
    {#if name === 'folder-new'}<circle cx="80" cy="54" r="12" class="a" /><path d="M80 48v12M74 54h12" class="on" />{/if}
    {#if name === 'folder-mine'}{#each [0, 1, 2] as i}<rect x={56 + i * 17} y="45" width="13" height="18" rx="3" class={i === 1 ? 'a' : 't'} />{/each}{/if}

  {:else if name === 'add-plus'}
    {#each [0, 1, 2] as i}<rect x={22 + i * 30} y="36" width="24" height="28" rx="4" class="t" />{/each}
    <rect x="112" y="36" width="24" height="28" rx="4" class="a" /><path d="M124 44v12M118 50h12" class="on" />
  {:else if name === 'add-paste'}
    <rect x="30" y="32" width="50" height="36" rx="6" class="k" /><text x="55" y="55" class="kt">{mac ? '⌘' : 'Ctrl'}</text>
    <text x="90" y="56" class="plus">+</text>
    <rect x="100" y="32" width="36" height="36" rx="6" class="a" /><text x="118" y="55" class="kt on-t">V</text>
  {:else if name === 'add-menu'}
    <rect x="30" y="20" width="100" height="62" rx="6" class="menu" />
    <rect x="40" y="29" width="56" height="5" rx="2.5" class="t" /><rect x="40" y="41" width="44" height="5" rx="2.5" class="t" />
    <rect x="34" y="53" width="92" height="22" rx="4" class="a" /><text x="42" y="68" class="mt">Openmarks ›</text>
  {:else if name === 'add-tabs'}
    {#each [0, 1, 2] as i}<path d="M{20 + i * 22} 40v-7a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v7" class={i === 0 ? 'tabon' : 'ln'} />{/each}
    <rect x="18" y="40" width="68" height="30" rx="3" class="t" />
    <path d="M94 55h14M102 49l6 6-6 6" class="arrow" />
    {#each [0, 1] as c}{#each [0, 1] as r}<rect x={116 + c * 16} y={38 + r * 18} width="12" height="14" rx="2.5" class="a" />{/each}{/each}

  {:else if name === 'feature-add'}
    {#each [0, 1] as i}<rect x={20 + i * 40} y="34" width="34" height="32" rx="4" class="t" />{/each}
    <rect x="100" y="38" width="40" height="24" rx="12" class="a" /><path d="M114 50h12M120 44v12" class="on" />
  {:else if name === 'feature-clock'}
    <rect x="14" y="14" width="40" height="12" rx="6" class="t" />
    <rect x="94" y="12" width="52" height="16" rx="8" class="a" /><text x="120" y="24" class="mt c">9:41</text>
    {#each [0, 1, 2] as i}<rect x={20 + i * 42} y="44" width="36" height="40" rx="4" class="t" />{/each}
  {:else if name === 'feature-vim'}
    {#each ['h', 'j', 'k', 'l'] as key, i}<rect x={18 + i * 32} y="34" width="28" height="30" rx="5" class={i === 3 ? 'a' : 'k'} /><text x={32 + i * 32} y="54" class="kt {i === 3 ? 'on-t' : ''}">{key}</text>{/each}
  {/if}
</svg>

<style>
  svg { display: block; width: 100%; height: auto; border-radius: 8px; background: color-mix(in srgb, var(--text) 6%, var(--surface)); }
  .t { fill: color-mix(in srgb, var(--text) 16%, var(--surface)); }
  .a { fill: var(--ring); }
  .on { fill: none; stroke: var(--on-ring); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
  .onf { fill: var(--on-ring); }
  .ink { fill: var(--muted); }
  .fold { fill: color-mix(in srgb, var(--text) 10%, var(--surface)); stroke: color-mix(in srgb, var(--text) 30%, transparent); stroke-width: 2; }
  .k { fill: var(--surface); stroke: color-mix(in srgb, var(--text) 25%, transparent); stroke-width: 2; }
  .kt { fill: var(--text); font: 600 14px var(--font-family); text-anchor: middle; }
  .on-t { fill: var(--on-ring); }
  .plus { fill: var(--muted); font: 600 16px var(--font-family); text-anchor: middle; }
  .menu { fill: var(--surface); stroke: color-mix(in srgb, var(--text) 18%, transparent); stroke-width: 1.5; }
  .mt { fill: var(--on-ring); font: 600 11px var(--font-family); }
  .mt.c { text-anchor: middle; font-size: 11px; font-variant-numeric: tabular-nums; }
  .ln { fill: none; stroke: color-mix(in srgb, var(--text) 30%, transparent); stroke-width: 2; }
  .tabon { fill: color-mix(in srgb, var(--text) 16%, var(--surface)); stroke: color-mix(in srgb, var(--text) 30%, transparent); stroke-width: 2; }
  .arrow { fill: none; stroke: var(--muted); stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
</style>
