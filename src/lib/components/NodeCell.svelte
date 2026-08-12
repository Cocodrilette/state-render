<script lang="ts">
  import { CELL_H, CELL_TOP, CELL_W, LINK_Y } from '../geometry';
  import { dur } from '../motion';
  import type { VizNode } from '../core/types';

  interface Props {
    node: VizNode;
    x: number;
    isHead: boolean;
    isActive: boolean;
    isGhost: boolean;
    portActive: boolean;
    /** Coordenada del carril de salida; con dos sentidos, cada puerto va en el suyo. */
    nextY: number;
    prevY: number;
    prevPortActive: boolean;
  }

  let { node, x, isHead, isActive, isGhost, portActive, nextY, prevY, prevPortActive }: Props = $props();

  let doubly = $derived(node.prev !== undefined);

  const barPath = `M0,${CELL_TOP + 8} A8,8 0 0 1 8,${CELL_TOP} H${CELL_W - 8} A8,8 0 0 1 ${CELL_W},${CELL_TOP + 8} Z`;

  function arrive(_element: Element, { delay = 0 } = {}) {
    return {
      delay,
      duration: dur(340),
      css: (t: number, u: number) => `opacity:${t}; transform: translateY(${u * -22}px) scale(${0.94 + t * 0.06})`,
    };
  }
</script>

<g class="column" style:transform="translate({x}px, 0px)">
  <g
    class="cell"
    class:ghost={isGhost}
    class:active={isActive}
    class:head={isHead}
    style:transform-origin="{CELL_W / 2}px {LINK_Y}px"
    in:arrive
  >
    {#if isActive}
      <rect class="halo" x={-5} y={CELL_TOP - 5} width={CELL_W + 10} height={CELL_H + 10} rx={12} />
    {/if}

    <rect class="body" x="0" y={CELL_TOP} width={CELL_W} height={CELL_H} rx="8" />
    <path class="bar" d={barPath} />

    <text class="value" x={CELL_W / 2} y={LINK_Y + 11}>{node.value}</text>
    <text class="id mono" x="9" y={CELL_TOP + CELL_H - 9}>{node.id}</text>

    <rect class="port" class:lit={portActive} x={CELL_W - 8} y={nextY - 7} width="8" height="14" rx="1.5" />
    {#if doubly}
      <rect class="port" class:lit={prevPortActive} x="0" y={prevY - 7} width="8" height="14" rx="1.5" />
    {/if}
  </g>
</g>

<style>
  .body {
    fill: var(--riser);
    stroke: var(--stage-line);
    stroke-width: 1.5;
  }

  .bar {
    fill: var(--ch);
  }

  /* La lectura de la celda es un dígito de instrumento: mono ancho, tabular. */
  .value {
    fill: var(--glow);
    font-family: var(--font-osd);
    font-size: 30px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    text-anchor: middle;
  }

  .id {
    fill: var(--null);
    font-size: 10.5px;
    letter-spacing: 0.06em;
  }

  .port {
    fill: var(--stage-line);
    transition: fill 180ms var(--ease);
  }

  .port.lit {
    fill: var(--play);
  }

  .halo {
    fill: none;
    stroke: var(--play);
    stroke-width: 2;
    opacity: 0.85;
  }

  .active .body {
    stroke: var(--play);
    stroke-width: 2;
  }

  .ghost .body {
    fill: none;
    stroke: var(--null);
    stroke-dasharray: 5 5;
    stroke-width: 1.5;
  }

  .ghost .bar,
  .ghost .port {
    fill: var(--null);
    opacity: 0.4;
  }

  .ghost .value {
    fill: var(--null);
  }

  .ghost {
    opacity: 0.6;
  }
</style>
