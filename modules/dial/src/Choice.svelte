<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- One choice shown as a picture (Settings and the welcome): the picture, a name, maybe a line under it; the chosen
     one ringed in the accent. Part of a radiogroup. The picture is a drawing (`art`, Art.svelte) or anything passed in. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import Art from './Art.svelte';
  let { label, checked, onclick, art, view, sub, children }: {
    label: string; checked: boolean; onclick: () => void; art?: string; view?: string; sub?: string; children?: Snippet;
  } = $props();
</script>

<button class="choice" role="radio" aria-checked={checked} {onclick}>
  {#if children}{@render children()}{:else if art}<Art name={art} {view} />{/if}
  <span class="name">{label}</span>
  {#if sub}<span class="sub">{sub}</span>{/if}
</button>

<style>
  .choice { display: flex; flex-direction: column; align-items: stretch; gap: 6px; min-width: 0; padding: 6px 6px 9px; border: 2px solid transparent; border-radius: 14px;
    background: none; color: var(--muted); font: inherit; font-size: 13.5px; text-align: center; cursor: pointer;
    transition: border-color 0.15s, background 0.15s, color 0.15s, transform 0.08s; }
  .choice:hover { color: var(--text); border-color: color-mix(in srgb, var(--ring) 40%, transparent); }
  .choice:active { transform: scale(0.98); }
  .choice[aria-checked='true'] { color: var(--text); border-color: var(--ring); background: color-mix(in srgb, var(--ring) 6%, transparent); }
  .choice[aria-checked='true'] .name { font-weight: 600; }
  .choice:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
  .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sub { margin-top: -4px; color: var(--muted); font-size: 12.5px; font-weight: 400; }
  @media (prefers-reduced-motion: reduce) { .choice { transition: none; } }
</style>
