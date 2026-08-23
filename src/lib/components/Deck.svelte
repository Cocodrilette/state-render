<script lang="ts">
  import FrameStrip from './FrameStrip.svelte';
  import { SPEEDS, type Playback } from '../playback.svelte';

  interface Props {
    /** Cualquier reproductor: el transporte no sabe qué retrata el fotograma. */
    player: Playback;
  }

  let { player }: Props = $props();

  let step = $derived(player.hasRun ? player.index + 1 : 0);
</script>

<section class="deck" aria-label="Reproducción">
  <p class="caption" class:success={player.tone === 'success'} class:warning={player.tone === 'warning'}>
    <span class="pip" aria-hidden="true"></span>
    <span aria-live="polite">{player.caption}</span>
  </p>

  <div class="transport">
    <div class="keys">
      <button aria-label="Fotograma anterior" disabled={!player.hasRun || player.index === 0} onclick={() => player.stepBack()}>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13 3v10L6 8zM4 3h1.6v10H4z" /></svg>
      </button>

      <button
        class="play"
        aria-label={player.playing ? 'Pausar' : 'Reproducir'}
        disabled={!player.hasRun}
        onclick={() => player.toggle()}
      >
        {#if player.playing}
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 3h3v10H4zM9 3h3v10H9z" /></svg>
        {:else}
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5 13.5 8 4 13.5z" /></svg>
        {/if}
      </button>

      <button
        aria-label="Fotograma siguiente"
        disabled={!player.hasRun || player.atEnd}
        onclick={() => player.stepForward()}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3v10l7-5zM10.4 3H12v10h-1.6z" /></svg>
      </button>
    </div>

    <FrameStrip {player} />

    <p class="counter mono">
      {String(step).padStart(2, '0')}<span class="slash">/</span>{String(player.frameCount).padStart(2, '0')}
    </p>

    <div class="speeds" role="group" aria-label="Velocidad">
      {#each SPEEDS as speed (speed)}
        <button class="speed mono" class:on={player.speed === speed} onclick={() => player.setSpeed(speed)}>
          ×{speed}
        </button>
      {/each}
    </div>
  </div>
</section>

<style>
  .deck {
    background: var(--stage);
    color: var(--glow);
    padding: 13px 24px 18px;
    border-top: 1px solid var(--stage-line);
    /* Sobre el monitor el anillo de foco se invierte para seguir siendo visible. */
    --focus: var(--play);
  }

  .caption {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin: 0 0 13px;
    font-size: 16px;
    line-height: 1.4;
    min-height: 44px;
  }

  .pip {
    flex: none;
    width: 8px;
    height: 8px;
    border-radius: 2px;
    background: var(--ch);
    transform: translateY(-1px);
  }

  .caption.success .pip {
    background: var(--ok);
  }

  .caption.warning .pip {
    background: var(--bad);
  }

  .transport {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 18px;
  }

  .keys {
    display: flex;
    gap: 5px;
  }

  .keys button {
    display: grid;
    place-items: center;
    width: 34px;
    height: 30px;
    background: none;
    border: 1px solid var(--stage-line);
    border-radius: var(--r-chip);
  }

  .keys svg {
    width: 14px;
    height: 14px;
    fill: var(--glow);
  }

  .keys button:hover:not(:disabled) {
    background: var(--riser);
  }

  .keys button:disabled {
    opacity: 0.32;
    cursor: default;
  }

  .play {
    width: 42px !important;
  }

  .counter {
    margin: 0;
    font-size: 13px;
    letter-spacing: 0.04em;
  }

  .slash {
    opacity: 0.45;
    padding: 0 2px;
  }

  .speeds {
    display: flex;
    gap: 2px;
  }

  .speed {
    padding: 4px 7px;
    font-size: 11px;
    color: var(--glow-60);
    background: none;
    border: none;
    border-radius: var(--r-chip);
  }

  .speed:hover {
    color: var(--glow);
  }

  .speed.on {
    color: var(--ink);
    background: var(--play);
  }

  @media (max-width: 720px) {
    .deck {
      padding: 12px 14px 14px;
    }

    .transport {
      grid-template-columns: auto minmax(0, 1fr) auto;
      gap: 12px;
    }

    .speeds {
      display: none;
    }
  }
</style>
