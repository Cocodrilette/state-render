<script lang="ts">
  import { prefersReducedMotion } from '../motion';
  import type { Program } from '../core/types';

  interface Props {
    /** Una operación de lista o el programa de un escenario: al panel le da igual. */
    program: Program | null;
    activeLine: number;
    running: boolean;
  }

  let { program, activeLine, running }: Props = $props();

  let list: HTMLOListElement | undefined = $state();

  // La línea que se está ejecutando nunca debe quedar fuera de vista.
  $effect(() => {
    if (!running || !list) return;
    const line = list.children[activeLine] as HTMLElement | undefined;
    line?.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  });
</script>

<section class="code" aria-label="Pseudocódigo">
  <header>
    <h2 class="osd title">Pseudocódigo</h2>
    {#if program}
      <span class="cost mono">{program.complexity}</span>
    {/if}
  </header>

  {#if program}
    <ol bind:this={list}>
      {#each program.code as line, i (i)}
        <li class="line" class:current={running && i === activeLine}>
          <span class="num mono">{String(i).padStart(2, '0')}</span>
          <code class="mono">{line}</code>
        </li>
      {/each}
    </ol>

    <p class="note">{program.note}</p>
  {:else}
    <p class="note bare">Elige una operación en la consola para ver su pseudocódigo.</p>
  {/if}
</section>

<style>
  .code {
    padding: 14px 24px 18px;
    color: var(--glow);
  }

  header {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 10px;
  }

  .title {
    margin: 0;
    font-size: 9.5px;
    color: var(--glow-60);
    letter-spacing: 0.14em;
  }

  .cost {
    font-size: 11.5px;
    font-weight: 600;
    color: var(--glow);
    padding: 2px 7px;
    background: rgba(233, 234, 233, 0.09);
    border-radius: var(--r-chip);
  }

  ol {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .line {
    display: grid;
    grid-template-columns: 26px 1fr;
    gap: 10px;
    padding: 3px 8px 3px 6px;
    margin-left: -9px;
    border-left: 3px solid transparent;
    border-radius: 2px;
  }

  /*
   * El amarillo dice lo mismo aquí que en el visor: esto es lo que corre ahora.
   * El realce va en el filo y en el texto, no en un tinte de fondo: sobre el
   * monitor un amarillo translúcido se vuelve oliva y pierde el filo.
   */
  .line.current {
    background: rgba(233, 234, 233, 0.07);
    border-left-color: var(--play);
  }

  .num {
    font-size: 11px;
    color: var(--null);
    padding-top: 2px;
  }

  code {
    font-size: 14px;
    line-height: 1.6;
    white-space: pre-wrap;
    /* Sangría francesa: una línea que se parte se lee como continuación, no como
       una instrucción nueva. */
    padding-left: 2ch;
    text-indent: -2ch;
    color: var(--glow);
  }

  .line.current code {
    color: var(--play);
    font-weight: 600;
  }

  .line.current .num {
    color: var(--play);
  }

  .note {
    margin: 12px 0 0;
    padding-top: 11px;
    border-top: 1px solid var(--stage-line);
    font-size: 13px;
    line-height: 1.5;
    color: var(--glow-60);
    max-width: 84ch;
  }

  .note.bare {
    margin-top: 0;
    padding-top: 0;
    border-top: none;
  }

  @media (max-width: 720px) {
    .code {
      padding: 14px 14px 16px;
    }

    code {
      font-size: 13px;
    }
  }
</style>
