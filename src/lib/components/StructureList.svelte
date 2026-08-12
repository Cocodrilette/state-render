<script lang="ts">
  import { structures, upcoming } from '../core/registry';
  import type { StructureDef } from '../core/types';

  interface Props {
    active: StructureDef;
    onSelect: (structure: StructureDef) => void;
  }

  let { active, onSelect }: Props = $props();
</script>

<nav class="structures" aria-label="Estructuras">
  <h2 class="osd title">Estructuras</h2>

  <ul>
    {#each structures as structure (structure.id)}
      <li>
        <button
          class="entry"
          class:current={structure.id === active.id}
          style:--swatch={structure.color}
          aria-current={structure.id === active.id ? 'true' : undefined}
          onclick={() => onSelect(structure)}
        >
          <span class="swatch" aria-hidden="true"></span>
          <span class="code osd">{structure.channel}</span>
          <span class="name">{structure.label}</span>
          <span class="tagline">{structure.tagline}</span>
        </button>
      </li>
    {/each}
  </ul>

  <h2 class="osd title queued">En cola</h2>
  <ul class="pending">
    {#each upcoming as channel (channel.channel)}
      <li>
        <span class="swatch" aria-hidden="true"></span>
        <span class="code osd">{channel.channel}</span>
        <span class="name">{channel.label}</span>
      </li>
    {/each}
  </ul>
</nav>

<style>
  .structures {
    padding: 18px 16px 24px;
    height: 100%;
    overflow-y: auto;
  }

  .title {
    margin: 0 0 10px;
    font-size: 9.5px;
    color: var(--ink-45);
    letter-spacing: 0.14em;
  }

  .queued {
    margin-top: 26px;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .entry {
    display: grid;
    grid-template-columns: 17px auto 1fr;
    grid-template-areas: 'swatch code name' '. tagline tagline';
    gap: 3px 8px;
    align-items: center;
    width: 100%;
    padding: 9px 10px 10px;
    border: 1px solid transparent;
    border-left: 3px solid transparent;
    border-radius: var(--r-panel);
    background: none;
    text-align: left;
  }

  .entry:hover {
    background: rgba(15, 18, 20, 0.045);
  }

  .entry.current {
    background: var(--plate);
    border-color: var(--rule);
    border-left-color: var(--swatch);
    box-shadow: var(--shadow-panel);
  }

  .swatch {
    width: 11px;
    height: 11px;
    border-radius: 2px;
    background: var(--swatch, var(--null));
  }

  .code {
    font-size: 9.5px;
    color: var(--ink-45);
    letter-spacing: 0.06em;
  }

  .entry.current .code {
    color: var(--ink);
  }

  .name {
    font-size: 12.5px;
    line-height: 1.3;
  }

  .entry .swatch {
    grid-area: swatch;
  }

  .entry .code {
    grid-area: code;
  }

  .entry .name {
    grid-area: name;
  }

  .entry.current .name {
    font-weight: 600;
  }

  .tagline {
    grid-area: tagline;
    padding-top: 3px;
    font-size: 12px;
    line-height: 1.4;
    color: var(--ink-70);
  }

  .entry:not(.current) .tagline {
    display: none;
  }

  .pending li {
    display: grid;
    grid-template-columns: 17px auto 1fr;
    gap: 8px;
    align-items: center;
    padding: 6px 10px 6px 13px;
    color: var(--ink-45);
  }

  .pending .swatch {
    background: none;
    border: 1px solid var(--rule);
  }

  .pending .name {
    font-size: 12.5px;
  }
</style>
