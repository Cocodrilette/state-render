<script lang="ts">
  import { PHASES, type MetroFrame } from '../core/metro';

  interface Props {
    frame: MetroFrame;
  }

  let { frame }: Props = $props();

  let touched = $derived(new Set(frame.touched));
  let phase = $derived(PHASES.find((p) => p.id === frame.phase) ?? PHASES[0]);

  /**
   * Las cabezas se dibujan una por una porque son trece y son el recurso escaso: es
   * en ellas donde se ve el cuello de botella. Los vagones son cien y se dibujan como
   * un banco de marcas — se sigue viendo la migración sin que el lienzo se vuelva
   * ilegible.
   */
  let heads = $derived(
    Object.keys(frame.units)
      .filter((id) => frame.units[id].kind === 'cabeza')
      .sort(),
  );

  let counts = $derived.by(() => {
    let cabezaTren = 0;
    let cabezaGaraje = 0;
    let cabezaTaller = 0;
    let vagonTren = 0;
    let vagonGaraje = 0;
    let vagonTaller = 0;
    for (const id of Object.keys(frame.units)) {
      const unit = frame.units[id];
      const cabeza = unit.kind === 'cabeza';
      if (unit.place === 'tren') cabeza ? (cabezaTren += 1) : (vagonTren += 1);
      else if (unit.place === 'garaje') cabeza ? (cabezaGaraje += 1) : (vagonGaraje += 1);
      else cabeza ? (cabezaTaller += 1) : (vagonTaller += 1);
    }
    return { cabezaTren, cabezaGaraje, cabezaTaller, vagonTren, vagonGaraje, vagonTaller };
  });

  function headState(id: string): string {
    if (touched.has(id)) return 'lit';
    return frame.units[id].place;
  }
</script>

<div class="board">
  <header class="rail">
    <span class="day osd">{frame.day > 0 ? `Día ${frame.day} de 5` : 'Sin renderizar'}</span>
    <ol class="phases" aria-label="Fase de la jornada">
      {#each PHASES as p (p.id)}
        <li class="osd" class:on={frame.day > 0 && p.id === frame.phase}>
          <span class="n">{p.n}</span>{p.label}
        </li>
      {/each}
    </ol>
    <span class="integrity mono" class:bad={!frame.conserva}>
      {frame.conserva ? 'conservación ✓' : 'conservación ✗'}
    </span>
  </header>

  <div class="bands">
    <!--
      En servicio a la izquierda porque es el resultado: la meta del día son diez
      trenes armados. Garaje y taller a la derecha, uno encima del otro, porque entre
      ellos es donde los nodos van y vienen.
    -->
    <section class="band service" aria-label="Trenes en servicio">
      <h3 class="osd label">
        En servicio
        <em>lista doble de trenes · {frame.trains.length} de 10</em>
      </h3>

      <ol class="trains">
        {#each frame.trains as train (train.id)}
          <li class="train">
            <span class="tid mono">{train.id}</span>
            {#if train.cabeza}
              <span class="head {headState(train.cabeza)} inline">
                <span class="hid mono">{train.cabeza}</span>
                <span class="life" aria-label="vida útil restante">
                  {#each { length: Math.max(frame.units[train.cabeza].vidaUtil, 0) } as _, i (i)}
                    <i></i>
                  {/each}
                </span>
              </span>
            {/if}
            <span class="cars" aria-label="{train.vagones.length} vagones">
              {#each train.vagones as vagon (vagon)}
                <span class="pip tren" class:lit={touched.has(vagon)}></span>
              {/each}
            </span>
            <span class="cap mono">{train.capacidad}v</span>
          </li>
        {/each}

        {#each { length: 10 - frame.trains.length } as _, i (i)}
          <li class="train empty">
            <span class="tid mono">T{String(frame.trains.length + i + 1).padStart(2, '0')}</span>
            <span class="void osd">sin conformar</span>
          </li>
        {/each}
      </ol>
    </section>

    <div class="side">
      <section class="band" aria-label="Garaje">
        <h3 class="osd label">
          Garaje
          <em>listas dobles · disponibles</em>
        </h3>

        <div class="row">
          <span class="tag osd">cabezas <b class="mono">{counts.cabezaGaraje}</b></span>
          <span class="heads">
            {#each frame.garajeCabezas as id (id)}
              <span class="head {headState(id)}">
                <span class="hid mono">{id}</span>
                <span class="life">
                  {#each { length: Math.max(frame.units[id].vidaUtil, 0) } as _, i (i)}
                    <i></i>
                  {/each}
                </span>
              </span>
            {/each}
            {#if !frame.garajeCabezas.length}<span class="void osd">vacío</span>{/if}
          </span>
        </div>

        <div class="row">
          <span class="tag osd">vagones <b class="mono">{counts.vagonGaraje}</b></span>
          <span class="bank">
            {#each frame.garajeVagones as id (id)}
              <span class="pip garaje" class:lit={touched.has(id)}></span>
            {/each}
            {#if !frame.garajeVagones.length}<span class="void osd">vacío</span>{/if}
          </span>
        </div>
      </section>

      <section class="band shop" aria-label="Taller">
        <h3 class="osd label">
          Taller
          <em>listas simples · FIFO</em>
        </h3>

        <div class="row">
          <span class="tag osd">cabezas <b class="mono">{counts.cabezaTaller}</b></span>
          <span class="heads">
            {#each frame.tallerCabezas as id (id)}
              <span class="head {headState(id)}">
                <span class="hid mono">{id}</span>
                <span class="wait mono">{frame.units[id].diasReparacion}d</span>
              </span>
            {/each}
            {#if !frame.tallerCabezas.length}<span class="void osd">vacío</span>{/if}
          </span>
        </div>

        <div class="row">
          <span class="tag osd">vagones <b class="mono">{counts.vagonTaller}</b></span>
          <span class="bank">
            {#each frame.tallerVagones as id (id)}
              <span class="pip taller" class:lit={touched.has(id)}></span>
            {/each}
            {#if !frame.tallerVagones.length}<span class="void osd">vacío</span>{/if}
          </span>
        </div>
      </section>

      {#if frame.verdict}
        <p class="verdict" class:ok={frame.verdict.ok}>
          <b class="osd">{frame.verdict.ok ? 'Meta cumplida' : 'Meta no cumplida'}</b>
          <span class="mono">{frame.verdict.armados} / {frame.verdict.requeridos} trenes</span>
          {#if frame.verdict.faltanCabezas > 0}
            <em>{frame.verdict.faltanCabezas === 1 ? 'faltó 1 cabeza' : `faltaron ${frame.verdict.faltanCabezas} cabezas`}</em>
          {/if}
          {#if frame.verdict.faltanVagones > 0}
            <em>{frame.verdict.faltanVagones === 1 ? 'faltó 1 vagón' : `faltaron ${frame.verdict.faltanVagones} vagones`}</em>
          {/if}
        </p>
      {/if}
    </div>
  </div>

  <footer class="legend mono">
    <span><i class="pip tren"></i> en servicio</span>
    <span><i class="pip garaje"></i> en el garaje</span>
    <span><i class="pip taller"></i> en el taller</span>
    <span><i class="pip lit"></i> lo que toca este paso</span>
  </footer>
</div>

<style>
  .board {
    display: flex;
    flex-direction: column;
    gap: 9px;
    height: 100%;
    min-height: 0;
    padding: 12px 20px 10px;
    color: var(--glow);
  }

  /* Rótulo de instrumento: en qué día va y qué fase corre. */
  .rail {
    display: flex;
    align-items: center;
    gap: 16px;
    flex: none;
  }

  .day {
    font-size: 10.5px;
    color: var(--glow);
    padding: 3px 7px;
    background: var(--ch);
    color: var(--stage);
    border-radius: var(--r-chip);
    white-space: nowrap;
  }

  .phases {
    display: flex;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
    min-width: 0;
    overflow: hidden;
  }

  .phases li {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 9px;
    letter-spacing: 0.08em;
    color: var(--glow-60);
    padding: 3px 7px;
    border: 1px solid var(--stage-line);
    border-radius: var(--r-chip);
    white-space: nowrap;
    opacity: 0.55;
  }

  .phases .n {
    font-variant-numeric: tabular-nums;
    opacity: 0.6;
  }

  /* El amarillo dice lo mismo aquí que en todas partes: esto es lo que corre ahora. */
  .phases li.on {
    opacity: 1;
    color: var(--play);
    border-color: var(--play);
  }

  .integrity {
    margin-left: auto;
    font-size: 10.5px;
    color: var(--ok);
    white-space: nowrap;
  }

  .integrity.bad {
    color: var(--bad);
  }

  .bands {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 0.92fr);
    gap: 12px;
    min-height: 0;
    flex: 1 1 auto;
  }

  .side {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
  }

  .band {
    padding: 9px 12px 10px;
    background: rgba(233, 234, 233, 0.03);
    border: 1px solid var(--stage-line);
    border-radius: var(--r-panel);
    min-height: 0;
    overflow: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--stage-line) transparent;
  }

  .service {
    display: flex;
    flex-direction: column;
  }

  .label {
    display: flex;
    align-items: baseline;
    gap: 9px;
    margin: 0 0 7px;
    font-size: 9.5px;
    letter-spacing: 0.14em;
    color: var(--glow);
  }

  .label em {
    font-family: var(--font-code);
    font-style: normal;
    font-size: 10.5px;
    letter-spacing: 0;
    text-transform: none;
    color: var(--glow-60);
  }

  /* Diez filas tienen que caber sin scroll: la fila que falta es la información. */
  .trains {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
    min-height: 0;
  }

  .train {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 20px;
    padding: 0 6px;
    background: rgba(233, 234, 233, 0.04);
    border-radius: 3px;
  }

  .train.empty {
    background: none;
    border: 1px dashed var(--stage-line);
  }

  .tid {
    flex: none;
    width: 26px;
    font-size: 10px;
    color: var(--glow-60);
  }

  .cap {
    flex: none;
    margin-left: auto;
    font-size: 9.5px;
    color: var(--glow-60);
  }

  /*
   * Una cabeza es un nodo con estado: su identificador y lo que le queda de vida
   * útil. Los puntos son jornadas, no un adorno: cuando se apagan, la cabeza se va
   * al taller y el tren no sale.
   */
  .head {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    flex: none;
    padding: 1px 5px;
    border: 1px solid var(--stage-line);
    border-radius: 3px;
    background: var(--riser);
    transition:
      background 200ms var(--ease),
      border-color 200ms var(--ease);
  }

  .head.tren {
    border-color: var(--ch);
  }

  .head.taller {
    border-color: color-mix(in srgb, var(--bad) 60%, var(--stage-line));
    background: color-mix(in srgb, var(--bad) 12%, var(--riser));
  }

  .head.lit {
    border-color: var(--play);
    background: color-mix(in srgb, var(--play) 20%, var(--riser));
  }

  .hid {
    font-size: 9.5px;
    color: var(--glow);
  }

  .life {
    display: inline-flex;
    gap: 1.5px;
  }

  .life i {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--ok);
  }

  .wait {
    font-size: 9px;
    color: var(--bad);
  }

  .cars {
    display: flex;
    gap: 1.5px;
    min-width: 0;
    flex-wrap: nowrap;
    overflow: hidden;
  }

  .row {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    padding: 4px 0;
  }

  .row + .row {
    border-top: 1px solid var(--stage-line);
  }

  .tag {
    flex: none;
    width: 74px;
    padding-top: 2px;
    font-size: 9px;
    letter-spacing: 0.1em;
    color: var(--glow-60);
  }

  .tag b {
    font-size: 11px;
    font-weight: 600;
    color: var(--glow);
  }

  .heads {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    min-width: 0;
  }

  .bank {
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: 2px;
    min-width: 0;
    padding-top: 3px;
  }

  /* Un vagón es una marca. Cien caben en el lienzo y su color dice dónde está. */
  .pip {
    width: 8px;
    height: 8px;
    border-radius: 1.5px;
    flex: none;
    background: var(--null);
    transition: background 200ms var(--ease);
  }

  .pip.garaje {
    background: var(--glow-60);
    opacity: 0.55;
  }

  .pip.tren {
    background: var(--ch);
  }

  .pip.taller {
    background: var(--bad);
    opacity: 0.75;
  }

  .pip.lit {
    background: var(--play);
    opacity: 1;
  }

  .void {
    font-size: 9px;
    letter-spacing: 0.1em;
    color: var(--null);
    padding-top: 3px;
  }

  .verdict {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 4px 11px;
    margin: 0;
    flex: none;
    padding: 9px 12px;
    border-radius: var(--r-panel);
    border: 1px solid color-mix(in srgb, var(--bad) 45%, var(--stage-line));
    background: color-mix(in srgb, var(--bad) 10%, transparent);
  }

  .verdict.ok {
    border-color: color-mix(in srgb, var(--ok) 45%, var(--stage-line));
    background: color-mix(in srgb, var(--ok) 10%, transparent);
  }

  .verdict b {
    font-size: 10px;
    letter-spacing: 0.1em;
    color: var(--bad);
  }

  .verdict.ok b {
    color: var(--ok);
  }

  .verdict span {
    font-size: 12px;
    color: var(--glow);
  }

  .verdict em {
    font-style: normal;
    font-size: 11.5px;
    color: var(--glow-60);
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    flex: none;
    font-size: 10px;
    color: var(--glow-60);
  }

  .legend span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .legend i {
    display: inline-block;
  }

  /*
   * En una sola columna las cuatro bandas no caben en la altura del visor, y
   * repartírsela deja garaje y taller reducidos a su rótulo. Se prefiere que el
   * tablero entero scrollee: ver una banda a medias no informa de nada.
   */
  @media (max-width: 1080px) {
    /*
     * `min-content` en las filas es la pieza clave: sin ella la rejilla reparte la
     * altura disponible entre las bandas y las deja en su rótulo. Con ella cada
     * banda toma la que necesita y el desborde lo absorbe el tablero.
     */
    .bands {
      grid-template-columns: minmax(0, 1fr);
      grid-auto-rows: min-content;
      flex: 0 0 auto;
    }

    .board {
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: var(--stage-line) transparent;
    }

    .side {
      min-height: auto;
    }

    .band {
      overflow: visible;
    }

    .phases li:not(.on) {
      display: none;
    }
  }

  @media (max-width: 720px) {
    .board {
      padding: 12px 14px;
    }
  }
</style>
