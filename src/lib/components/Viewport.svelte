<script lang="ts">
  import NodeCell from './NodeCell.svelte';
  import PointerTag from './PointerTag.svelte';
  import {
    CELL_W,
    HEIGHT,
    LINK_Y,
    STUB,
    backLinkPath,
    canvasWidth,
    cellX,
    laneY,
    linkPath,
    nullBackPath,
    nullPath,
    voidX,
  } from '../geometry';
  import { Slide } from '../slide.svelte';
  import type { Frame } from '../core/types';

  interface Props {
    frame: Frame;
  }

  let { frame }: Props = $props();

  let scroller: HTMLDivElement | undefined = $state();
  const slide = new Slide();

  let positions = $derived(new Map(frame.nodes.map((node, i) => [node.id, i])));
  let width = $derived(canvasWidth(frame.nodes.length));
  let activeNodes = $derived(new Set(frame.activeNodes));
  let activeLinks = $derived(new Set(frame.activeLinks));
  let activePrevLinks = $derived(new Set(frame.activePrevLinks));
  let ghosts = $derived(new Set(frame.ghosts));

  /** Si los nodos traen `previo`, el lienzo abre un segundo carril para el sentido de vuelta. */
  let doubly = $derived(frame.nodes.some((node) => node.prev !== undefined));
  let nextY = $derived(laneY(doubly));
  let prevY = $derived(laneY(doubly, true));

  /** Los punteros que coinciden en un mismo nodo se apilan en un poste. */
  let marks = $derived.by(() => {
    const rows = new Map<string, number>();
    return frame.marks
      .filter((mark) => mark.at === null || positions.has(mark.at))
      .map((mark) => {
        const column = mark.at ?? '∅';
        const row = rows.get(column) ?? 0;
        rows.set(column, row + 1);
        const index = mark.at === null ? -1 : (positions.get(mark.at) as number);
        const target = index < 0 ? voidX(frame.nodes.length) : cellX(index) + CELL_W / 2;
        return { ...mark, row, target };
      });
  });

  // Un solo destino por celda y por etiqueta: todos se deslizan al mismo ritmo.
  $effect(() => {
    const targets: Record<string, number> = {};
    frame.nodes.forEach((node, i) => (targets[`n:${node.id}`] = cellX(i)));
    for (const mark of marks) targets[`m:${mark.label}`] = mark.target;
    slide.set(targets);
  });

  $effect(() => () => slide.destroy());

  let nodeX = $derived((id: string, index: number) => slide.get(`n:${id}`, cellX(index)));

  let links = $derived(
    frame.nodes.flatMap((node, i) => {
      const fromX = nodeX(node.id, i);
      if (node.next === null) {
        return [
          {
            key: `${node.id}->void`,
            d: nullPath(fromX, nextY),
            nullish: true,
            back: false,
            from: node.id,
            tipX: fromX + CELL_W + STUB - 12,
            tipY: nextY,
          },
        ];
      }
      const target = positions.get(node.next);
      if (target === undefined) return [];
      return [
        {
          key: `${node.id}->${node.next}`,
          d: linkPath(fromX, nodeX(node.next, target), target === i + 1, nextY),
          nullish: false,
          back: false,
          from: node.id,
          tipX: 0,
          tipY: nextY,
        },
      ];
    }),
  );

  /** Enlaces de vuelta: el mismo trazado en espejo, por el carril de abajo. */
  let backLinks = $derived(
    frame.nodes.flatMap((node, i) => {
      if (node.prev === undefined) return [];
      const fromX = nodeX(node.id, i);
      if (node.prev === null) {
        return [
          {
            key: `${node.id}<-void`,
            d: nullBackPath(fromX, prevY),
            nullish: true,
            back: true,
            from: node.id,
            tipX: fromX - STUB + 12 - 6,
            tipY: prevY,
          },
        ];
      }
      const target = positions.get(node.prev);
      if (target === undefined) return [];
      return [
        {
          key: `${node.id}<-${node.prev}`,
          d: backLinkPath(fromX, nodeX(node.prev, target), target === i - 1, prevY),
          nullish: false,
          back: true,
          from: node.id,
          tipX: 0,
          tipY: prevY,
        },
      ];
    }),
  );

  let tags = $derived(marks.map((mark) => ({ ...mark, x: slide.get(`m:${mark.label}`, mark.target) })));

  /** La misma lista en notación de puntero, para atar el dibujo con el código. */
  let reading = $derived.by(() => {
    const byId = new Map(frame.nodes.map((node) => [node.id, node]));
    if (!frame.head || !byId.has(frame.head)) return 'cabeza → ∅';

    const values: number[] = [];
    const seen = new Set<string>();
    let cursor: string | null = frame.head;
    while (cursor && byId.has(cursor) && !seen.has(cursor)) {
      seen.add(cursor);
      values.push((byId.get(cursor) as { value: number }).value);
      cursor = (byId.get(cursor) as { next: string | null }).next;
    }

    const tail = cursor === null ? '∅' : cursor === frame.head ? '↩ cabeza' : `↩ ${byId.get(cursor)?.value}`;
    // Con dos sentidos el separador lo dice: cada vecino se conoce en ambas direcciones.
    const arrow = doubly ? ' ⇄ ' : ' → ';
    return `cabeza → ${values.join(arrow)}${arrow}${tail}`;
  });

  // Mantiene a la vista lo que el paso está señalando.
  $effect(() => {
    const focus = frame.activeNodes[0] ?? frame.head;
    const index = focus ? positions.get(focus) : undefined;
    if (!scroller || index === undefined) return;
    const left = cellX(index);
    const margin = 80;
    const viewLeft = scroller.scrollLeft;
    const viewRight = viewLeft + scroller.clientWidth;
    if (left - margin < viewLeft) scroller.scrollTo({ left: Math.max(0, left - margin), behavior: 'smooth' });
    else if (left + CELL_W + margin > viewRight)
      scroller.scrollTo({ left: left + CELL_W + margin - scroller.clientWidth, behavior: 'smooth' });
  });
</script>

<div class="stage">
  <!-- Guías de encuadre: marcan los límites del fotograma que se está mirando. -->
  <span class="guide tl" aria-hidden="true"></span>
  <span class="guide tr" aria-hidden="true"></span>
  <span class="guide bl" aria-hidden="true"></span>
  <span class="guide br" aria-hidden="true"></span>

  <div class="scroller" bind:this={scroller}>
    <svg
      class="canvas"
      width={width}
      height={HEIGHT}
      viewBox="0 0 {width} {HEIGHT}"
      role="img"
      aria-label="Diagrama de la lista: {frame.nodes.map((n) => n.value).join(', ') || 'vacía'}"
    >
      <defs>
        <marker id="punta-canal" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto">
          <path d="M0,1 L12,6 L0,11 Z" fill="var(--ch)" />
        </marker>
        <marker id="punta-play" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto">
          <path d="M0,1 L12,6 L0,11 Z" fill="var(--play)" />
        </marker>
        <marker id="punta-nulo" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto">
          <path d="M0,1 L12,6 L0,11 Z" fill="var(--null)" />
        </marker>
      </defs>

      <g class="links">
        {#each [...links, ...backLinks] as link (link.key)}
          {@const lit = link.back ? activePrevLinks.has(link.from) : activeLinks.has(link.from)}
          <path
            class="link"
            class:nullish={link.nullish}
            class:active={lit}
            class:muted={ghosts.has(link.from)}
            d={link.d}
            pathLength="1"
            marker-end="url(#{lit ? 'punta-play' : link.nullish ? 'punta-nulo' : 'punta-canal'})"
          />
          {#if link.nullish}
            <g class="terminus">
              <line x1={link.tipX + 6} y1={link.tipY - 13} x2={link.tipX + 6} y2={link.tipY + 13} />
              <text class="mono" x={link.tipX + 6} y={link.tipY + 30}>∅</text>
            </g>
          {/if}
        {/each}
      </g>

      <g class="cells">
        {#each frame.nodes as node, i (node.id)}
          <NodeCell
            {node}
            {nextY}
            {prevY}
            x={nodeX(node.id, i)}
            isHead={frame.head === node.id}
            isActive={activeNodes.has(node.id)}
            isGhost={ghosts.has(node.id)}
            portActive={activeLinks.has(node.id)}
            prevPortActive={activePrevLinks.has(node.id)}
          />
        {/each}
      </g>

      <g class="tags">
        {#each tags as tag (tag.label)}
          <PointerTag label={tag.label} kind={tag.kind} x={tag.x} row={tag.row} />
        {/each}
      </g>

      {#if frame.nodes.length === 0}
        <text class="empty" x={cellX(0) + 10} y={LINK_Y + 6}>sin nodos</text>
      {/if}
    </svg>
  </div>

  <p class="reading mono">{reading}</p>
</div>

<style>
  .stage {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    height: 100%;
    min-width: 0;
    min-height: 0;
    /* Sobre el monitor el anillo de foco se invierte para seguir siendo visible. */
    --focus: var(--play);
  }

  .guide {
    position: absolute;
    width: 15px;
    height: 15px;
    border: 1px solid var(--stage-line);
    pointer-events: none;
  }

  .tl {
    top: 12px;
    left: 12px;
    border-right: none;
    border-bottom: none;
  }

  .tr {
    top: 12px;
    right: 12px;
    border-left: none;
    border-bottom: none;
  }

  .bl {
    bottom: 12px;
    left: 12px;
    border-right: none;
    border-top: none;
  }

  .br {
    bottom: 12px;
    right: 12px;
    border-left: none;
    border-top: none;
  }

  .reading {
    margin: 0;
    padding: 18px 34px 0;
    font-size: 12.5px;
    letter-spacing: 0.06em;
    color: var(--glow-60);
    text-align: center;
    overflow-wrap: anywhere;
  }

  /* `safe center` centra cuando cabe y respeta el borde cuando no: en pantallas
     bajas el diagrama se puede recorrer en vez de quedar recortado.

     El desvanecido de los costados es el borde del encuadre: cuando la lista es más
     larga que el visor, el corte se lee como «sigue fuera de cuadro» y no como un nodo
     estrellado contra la consola. Los 44px de margen del lienzo hacen que, cuando todo
     cabe, la máscara no toque ningún nodo. */
  .scroller {
    overflow: auto;
    display: flex;
    align-items: safe center;
    justify-content: safe center;
    flex: 0 1 auto;
    min-width: 0;
    padding: 0 8px;
    scrollbar-width: thin;
    scrollbar-color: var(--stage-line) transparent;
    -webkit-mask-image: linear-gradient(90deg, transparent, #000 var(--fade), #000 calc(100% - var(--fade)), transparent);
    mask-image: linear-gradient(90deg, transparent, #000 var(--fade), #000 calc(100% - var(--fade)), transparent);
    --fade: 40px;
  }

  .canvas {
    flex: none;
  }

  .link {
    fill: none;
    stroke: var(--ch);
    stroke-width: 3.5;
    stroke-linecap: round;
    stroke-dasharray: 1;
    animation: draw var(--dur-link) var(--ease) both;
  }

  .link.nullish {
    stroke: var(--null);
    stroke-width: 2.5;
  }

  .link.active {
    stroke: var(--play);
    stroke-width: 5;
  }

  .link.muted {
    opacity: 0.35;
  }

  @keyframes draw {
    from {
      stroke-dashoffset: 1;
    }
    to {
      stroke-dashoffset: 0;
    }
  }

  .terminus line {
    stroke: var(--null);
    stroke-width: 3;
    stroke-linecap: round;
  }

  .terminus text {
    fill: var(--null);
    font-size: 14px;
    text-anchor: middle;
  }

  .empty {
    fill: var(--null);
    font-family: var(--font-osd);
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }
</style>
