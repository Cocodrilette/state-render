<script lang="ts">
  import CodePanel from './lib/components/CodePanel.svelte';
  import Console from './lib/components/Console.svelte';
  import Deck from './lib/components/Deck.svelte';
  import MetroConsole from './lib/components/MetroConsole.svelte';
  import MetroViewport from './lib/components/MetroViewport.svelte';
  import StructureList from './lib/components/StructureList.svelte';
  import Viewport from './lib/components/Viewport.svelte';
  import { scenarios } from './lib/core/registry';
  import type { ScenarioDef, StructureDef } from './lib/core/types';
  import { MetroPlayer } from './lib/metro-player.svelte';
  import { Player } from './lib/player.svelte';

  /**
   * La aplicación monta una de dos cosas: un canal de estructura o un escenario.
   * Cada uno trae su reproductor, su visor y su consola; lo que comparten es el
   * chasis — rótulo, panel de pseudocódigo y controles de reproducción — porque
   * recorrer fotogramas se hace igual en los dos casos.
   */
  const player = new Player();
  player.selectOperation(player.structure.operations[0]);

  const metro = new MetroPlayer();

  let mode = $state<'structure' | 'scenario'>('structure');
  let scenario = $state<ScenarioDef>(scenarios[0]);

  let active = $derived(mode === 'structure' ? player : metro);
  let channel = $derived(mode === 'structure' ? player.structure.channel : scenario.channel);
  let label = $derived(mode === 'structure' ? player.structure.label : scenario.label);
  let color = $derived(mode === 'structure' ? player.structure.color : scenario.color);
  let program = $derived(mode === 'structure' ? player.operation : scenario.program);

  let readout = $derived.by(() => {
    if (mode === 'structure') {
      const count = player.frame.nodes.length;
      return `${count} ${count === 1 ? 'nodo' : 'nodos'}`;
    }
    const { cabezas, vagones } = metro.params;
    return `${cabezas} cabezas · ${vagones} vagones`;
  });

  function showStructure(next: StructureDef) {
    metro.pause();
    mode = 'structure';
    player.selectStructure(next);
  }

  function showScenario(next: ScenarioDef) {
    player.pause();
    mode = 'scenario';
    scenario = next;
  }

  function onKeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    if (target && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target.tagName)) return;

    if (event.key === ' ') {
      event.preventDefault();
      active.toggle();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      active.stepForward();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      active.stepBack();
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="app" style:--ch={color}>
  <header class="slate">
    <div class="brand">
      <svg class="glyph" viewBox="0 0 24 20" aria-hidden="true">
        <rect x="0" y="5" width="13" height="11" rx="2" fill="var(--ch-c)" />
        <rect x="17.5" y="1" width="2.5" height="18" rx="1.25" fill="var(--play)" />
      </svg>
      <span class="wordmark">State<b>Render</b></span>
    </div>

    <div class="readout">
      <span class="badge osd">{channel}</span>
      <h1 class="osd">{label}</h1>
      <span class="count mono">{readout}</span>
    </div>

    <p class="hints mono">espacio reproduce · ←/→ fotograma</p>
  </header>

  <aside class="structures-pane">
    <StructureList
      activeId={mode === 'structure' ? player.structure.id : scenario.id}
      onSelect={showStructure}
      onSelectScenario={showScenario}
    />
  </aside>

  <!--
    Visor y pseudocódigo comparten la columna central porque se leen juntos: el
    diagrama dice en qué estado quedó la lista y el código, qué instrucción la
    dejó así. Separarlos obliga a cruzar la pantalla en cada paso.
  -->
  <main class="stage-pane">
    <div class="viewport-slot">
      {#if mode === 'structure'}
        <Viewport frame={player.frame} />
      {:else}
        <MetroViewport frame={metro.frame} />
      {/if}
    </div>
    <div class="code-slot">
      <CodePanel {program} activeLine={active.frame.codeLine} running={active.hasRun} />
    </div>
  </main>

  <aside class="console-pane">
    {#if mode === 'structure'}
      <Console {player} />
    {:else}
      <MetroConsole player={metro} />
    {/if}
  </aside>

  <footer class="deck-pane">
    <Deck player={active} />
  </footer>
</div>

<style>
  /*
   * Dos superficies: el monitor (rótulo, visor y controles) y el escritorio (los dos
   * costados). Oscuro donde se mira un fotograma, claro donde se lee y se opera.
   */
  .app {
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr) 290px;
    grid-template-rows: auto minmax(0, 1fr) auto;
    grid-template-areas:
      'slate slate slate'
      'structures stage console'
      'deck deck deck';
    height: 100dvh;
  }

  .slate {
    grid-area: slate;
    display: flex;
    align-items: center;
    gap: 22px;
    padding: 0 20px;
    height: 56px;
    background: var(--stage);
    color: var(--glow);
    border-bottom: 1px solid var(--stage-line);
    --focus: var(--play);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-right: 22px;
    border-right: 1px solid var(--stage-line);
    align-self: stretch;
  }

  .glyph {
    flex: none;
    width: 24px;
    height: 20px;
  }

  /* El nombre es un compuesto y se lee como tal: «State» en voz baja, «Render» al frente. */
  .wordmark {
    font-family: var(--font-osd);
    font-size: 12.5px;
    font-weight: 500;
    font-stretch: 108%;
    letter-spacing: 0.01em;
    color: var(--glow-60);
    white-space: nowrap;
  }

  .wordmark b {
    font-weight: 700;
    color: var(--glow);
  }

  .readout {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .badge {
    display: grid;
    place-items: center;
    height: 20px;
    padding: 0 6px;
    font-size: 9.5px;
    letter-spacing: 0.08em;
    color: var(--stage);
    background: var(--ch);
    border-radius: var(--r-chip);
  }

  h1 {
    margin: 0;
    font-size: 12.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .count {
    font-size: 11.5px;
    color: var(--glow-60);
    white-space: nowrap;
  }

  .hints {
    margin: 0 0 0 auto;
    font-size: 11px;
    color: var(--glow-60);
    white-space: nowrap;
  }

  .structures-pane {
    grid-area: structures;
    background: var(--desk);
    border-right: 1px solid var(--rule);
    min-height: 0;
  }

  .stage-pane {
    grid-area: stage;
    display: grid;
    /* Sin columna explícita, la columna implícita se dimensiona por el contenido y
       un diagrama ancho empuja el visor por encima de la consola. */
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) auto;
    min-width: 0;
    min-height: 0;
    background: var(--stage);
    --focus: var(--play);
  }

  /* `overflow: hidden` es el cierre: ningún motor puede pintar el lienzo sobre la consola. */
  .viewport-slot {
    min-width: 0;
    min-height: 0;
    overflow: hidden;
  }

  /* El código no puede comerse el visor: se le pone techo y scrolla por dentro. */
  .code-slot {
    max-height: 44dvh;
    overflow-y: auto;
    border-top: 1px solid var(--stage-line);
    scrollbar-width: thin;
    scrollbar-color: var(--stage-line) transparent;
  }

  .console-pane {
    grid-area: console;
    background: var(--desk);
    border-left: 1px solid var(--rule);
    min-height: 0;
    overflow-y: auto;
  }

  .deck-pane {
    grid-area: deck;
  }

  @media (max-width: 1080px) {
    .app {
      grid-template-columns: 200px minmax(0, 1fr) 262px;
    }

    .hints {
      display: none;
    }
  }

  @media (max-width: 900px) {
    .app {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto auto auto auto auto;
      grid-template-areas:
        'slate'
        'stage'
        'deck'
        'console'
        'structures';
      height: auto;
      min-height: 100dvh;
    }

    .slate {
      height: auto;
      flex-wrap: wrap;
      gap: 10px 16px;
      padding: 10px 14px;
    }

    h1 {
      white-space: normal;
      overflow: visible;
    }

    .brand {
      border-right: none;
      padding-right: 0;
    }

    .stage-pane {
      grid-template-rows: 340px auto;
    }

    .code-slot {
      max-height: none;
    }

    .console-pane {
      border-left: none;
      border-top: 1px solid var(--rule);
      overflow: visible;
    }

    .structures-pane {
      border-right: none;
      border-top: 1px solid var(--rule);
    }
  }
</style>
