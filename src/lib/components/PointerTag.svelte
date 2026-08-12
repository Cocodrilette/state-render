<script lang="ts">
  import { CELL_TOP } from '../geometry';
  import type { MarkKind } from '../core/types';

  interface Props {
    label: string;
    kind: MarkKind;
    x: number;
    row: number;
  }

  let { label, kind, x, row }: Props = $props();

  const H = 22;
  let bottom = $derived(CELL_TOP - 12 - row * 28);
  let width = $derived(Math.max(54, label.length * 7.8 + 20));
</script>

<g class="tag {kind}" style:transform="translate({x}px, 0px)">
  <line class="post" x1="0" y1={bottom} x2="0" y2={CELL_TOP - 3} />
  <rect class="sign" x={-width / 2} y={bottom - H} width={width} height={H} rx="3" />
  <path class="notch" d="M-5,{bottom} L5,{bottom} L0,{bottom + 6} Z" />
  <text class="label" x="0" y={bottom - 7}>{label}</text>
</g>

<style>
  .post {
    stroke: var(--stage-line);
    stroke-width: 1.5;
  }

  .sign,
  .notch {
    fill: var(--stage-line);
  }

  .label {
    fill: var(--glow);
    font-family: var(--font-osd);
    font-size: 9.5px;
    font-weight: 600;
    letter-spacing: 0.02em;
    text-anchor: middle;
    text-transform: uppercase;
  }

  /* La cabeza lleva el color del canal; el cursor, el amarillo de emisión. */
  .head .sign,
  .head .notch {
    fill: var(--ch);
  }

  .head .label {
    fill: var(--stage);
  }

  .cursor .sign,
  .cursor .notch {
    fill: var(--play);
  }

  .cursor .label {
    fill: var(--ink);
  }

  .aux .sign,
  .aux .notch {
    fill: var(--glow-60);
  }

  .aux .label {
    fill: var(--stage);
  }
</style>
