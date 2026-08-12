<script lang="ts">
  import type { Player } from '../player.svelte';

  interface Props {
    player: Player;
  }

  let { player }: Props = $props();

  let strip: HTMLDivElement | undefined = $state();
  let head = $state(0);

  /**
   * Cada fotograma se reduce a una columna de marcas, una por nodo, con la que el
   * paso está tocando en amarillo. Leída de corrido, la tira dibuja la forma de la
   * operación: un recorrido baja en diagonal, una inserción abre una marca nueva,
   * un fallo enciende el filo rojo. Se ve la operación entera antes de reproducirla.
   *
   * Las celdas miden lo mismo siempre y la tira crece hacia la derecha, así que su
   * largo dice cuántos pasos cuesta la operación: eso también es información.
   */
  let cells = $derived(
    player.frames.map((frame) => {
      const active = new Set(frame.activeNodes);
      const ghosts = new Set(frame.ghosts);
      return {
        tone: frame.tone,
        marks: frame.nodes.map((node) => (active.has(node.id) ? 'on' : ghosts.has(node.id) ? 'gone' : 'off')),
      };
    }),
  );

  // El cabezal se mide sobre las celdas ya dispuestas, no se estima: así cae
  // centrado en el fotograma actual aunque la tira se comprima.
  $effect(() => {
    const cell = strip?.children[player.index] as HTMLElement | undefined;
    if (!cell || !cells.length) return;
    head = cell.offsetLeft + cell.offsetWidth / 2;
  });

  function focusCell(index: number) {
    const cell = strip?.children[index] as HTMLElement | undefined;
    cell?.focus();
  }

  function onKeydown(event: KeyboardEvent) {
    const last = player.frames.length - 1;
    let next: number | null = null;

    if (event.key === 'ArrowRight') next = Math.min(player.index + 1, last);
    else if (event.key === 'ArrowLeft') next = Math.max(player.index - 1, 0);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    if (next === null) return;

    event.preventDefault();
    player.seek(next);
    focusCell(next);
  }
</script>

{#if player.hasRun}
  <div class="strip" role="group" aria-label="Fotogramas de la operación" bind:this={strip}>
    {#each cells as cell, i (i)}
      <button
        class="cell {cell.tone}"
        class:current={i === player.index}
        aria-label="Fotograma {i + 1} de {cells.length}"
        aria-current={i === player.index ? 'true' : undefined}
        tabindex={i === player.index ? 0 : -1}
        onclick={() => player.seek(i)}
        onkeydown={onKeydown}
      >
        <span class="marks" aria-hidden="true">
          {#each cell.marks as mark, m (m)}
            <span class="mark {mark}"></span>
          {/each}
        </span>
      </button>
    {/each}

    <span class="playhead" style:left="{head}px" aria-hidden="true"></span>
  </div>
{:else}
  <div class="strip leader" aria-label="Sin fotogramas todavía" role="img"></div>
{/if}

<style>
  /* La pista ocupa todo el ancho; los fotogramas la van llenando desde la izquierda. */
  .strip {
    position: relative;
    display: flex;
    gap: 1.5px;
    height: 34px;
    padding: 3px;
    background: rgba(233, 234, 233, 0.04);
    border: 1px solid var(--stage-line);
    border-radius: 2px;
  }

  /* Sin operación renderizada la pista está en blanco, como una cola de película. */
  .leader {
    background:
      repeating-linear-gradient(-45deg, transparent 0 5px, rgba(233, 234, 233, 0.13) 5px 6px),
      rgba(233, 234, 233, 0.04);
  }

  .cell {
    position: relative;
    flex: 0 1 16px;
    min-width: 4px;
    padding: 0;
    background: rgba(233, 234, 233, 0.07);
    border: none;
    border-bottom: 2px solid transparent;
    border-radius: 1px;
    transition: background 140ms var(--ease);
  }

  .cell:hover {
    background: rgba(233, 234, 233, 0.18);
  }

  .cell.current {
    background: rgba(232, 196, 0, 0.22);
  }

  /* El filo inferior es la columna de anotaciones: marca en qué paso algo cerró o falló. */
  .cell.warning {
    border-bottom-color: var(--bad);
  }

  .cell.success {
    border-bottom-color: var(--ok);
  }

  .marks {
    display: flex;
    flex-direction: column;
    gap: 1px;
    height: 100%;
    padding: 3px 2px;
  }

  .mark {
    flex: 1 1 0;
    min-height: 1px;
    background: var(--glow-60);
    opacity: 0.45;
  }

  .mark.on {
    background: var(--play);
    opacity: 1;
  }

  .mark.gone {
    opacity: 0.18;
  }

  .playhead {
    position: absolute;
    top: -4px;
    bottom: -4px;
    width: 1.5px;
    margin-left: -0.75px;
    background: var(--play);
    pointer-events: none;
    transition: left 180ms var(--ease);
  }

  @media (prefers-reduced-motion: reduce) {
    .playhead {
      transition: none;
    }
  }
</style>
