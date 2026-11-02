<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- A few choices side by side in one pill, the chosen one raised (Settings and the welcome): light or dark, the
     search engine, how many tiles in a row. Each choice can bring an icon path, or its own drawing via `item`. -->
<script lang="ts" generics="T extends string | number">
  import type { Snippet } from 'svelte';
  type Option = { value: T; label: string; icon?: string; filled?: boolean };
  let { options, value, onchange, label, item }: { options: Option[]; value: T; onchange: (v: T) => void; label: string; item?: Snippet<[Option]> } = $props();
</script>

<div class="seg" role="radiogroup" aria-label={label}>
  {#each options as o (o.value)}
    <button role="radio" aria-checked={value === o.value} onclick={() => onchange(o.value)}>
      {#if item}{@render item(o)}{:else if o.icon}<svg viewBox="0 0 24 24" width="15" height="15" fill={o.filled ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={o.icon} /></svg>{/if}
      {o.label}
    </button>
  {/each}
</div>

<style>
  .seg { display: inline-flex; flex-wrap: wrap; max-width: 100%; box-sizing: border-box; padding: 3px; gap: 2px; border-radius: 20px;
    background: color-mix(in srgb, var(--text) 7%, var(--surface)); }
  button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 34px; padding: 0 14px; border: 0; border-radius: 999px;
    background: none; color: var(--muted); font: inherit; font-size: 13.5px; white-space: nowrap; cursor: pointer; transition: background 0.15s, color 0.15s; }
  button:hover { color: var(--text); }
  button[aria-checked='true'] { background: var(--surface); color: var(--text); font-weight: 600; box-shadow: 0 1px 3px rgb(0 0 0 / 0.16); }
  button:focus-visible { outline: 2px solid var(--ring); outline-offset: 1px; }
</style>
