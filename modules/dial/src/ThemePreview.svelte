<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- A small picture of a theme: its page, folder tabs and six tiles, drawn in its own colours, shape and font
     (Settings › Theme, and the welcome tab). -->
<script lang="ts">
  import { themeVars, isDark, type Theme } from './themes';
  let { theme, dark, glass }: { theme: Theme; dark: boolean; glass: boolean } = $props();
  const v = $derived(themeVars(theme, isDark(theme, dark), glass));
</script>

<span class="tp" style:background={v['--bg']} style:font-family={v['--font-family']}>
  <span class="tpbar" style:text-transform="uppercase"><b style:color={v['--text']}>Home</b><i style:color={v['--muted']}>Work</i></span>
  <span class="tpgrid">
    {#each [0, 1, 2, 3, 4, 5] as i (i)}
      <span style:background={v['--pane']} style:backdrop-filter={v['--backdrop']} style:border-radius="calc({v['--radius']} / 2.5)" style:clip-path={(v['--notch'] ?? 'none').replace(/\d+px/g, '4px')} style:box-shadow={v['--shadow']} style:border="1px solid {v['--line']}"></span>
    {/each}
  </span>
</span>

<style>
  .tp { display: flex; flex-direction: column; gap: 6px; width: 100%; aspect-ratio: 4 / 3; box-sizing: border-box; padding: 8px; border-radius: 6px;
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--text) 12%, transparent); overflow: hidden; }
  .tpbar { display: flex; gap: 6px; font-size: 9px; letter-spacing: 0.04em; }
  .tpbar i { font-style: normal; }
  .tpgrid { flex: 1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; }
</style>
