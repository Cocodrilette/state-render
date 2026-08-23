<script lang="ts">
  import { CABEZAS_REQUERIDAS, DIAS, VAGONES_REQUERIDOS } from '../core/metro';
  import type { MetroPlayer } from '../metro-player.svelte';

  interface Props {
    player: MetroPlayer;
  }

  let { player }: Props = $props();

  let f = $derived(player.feasibility);
</script>

<section class="console" aria-label="Consola del escenario">
  <h2 class="osd title">Flota</h2>

  <div class="args">
    {#each player.definitions as arg (arg.key)}
      <label class="arg">
        <span class="osd">{arg.label}{#if arg.hint}<em>{arg.hint}</em>{/if}</span>
        <input
          type="number"
          min={arg.min}
          max={arg.max}
          value={player.params[arg.key as keyof typeof player.params]}
          oninput={(event) => player.setParam(arg.key, Number(event.currentTarget.value))}
        />
      </label>
    {/each}
  </div>

  <button class="render osd" onclick={() => player.render()}>Renderizar la semana</button>
  <button class="secondary" onclick={() => player.reset()}>Volver al enunciado</button>

  <h2 class="osd title spaced">Cota por conteo</h2>
  <p class="lead">
    Antes de simular, contar «días-equipo» acota el problema. Cada día exigen
    {CABEZAS_REQUERIDAS} cabezas y {VAGONES_REQUERIDOS} vagones durante {DIAS} días.
  </p>

  <dl class="ledger">
    <div class="line">
      <dt>Días-cabeza disponibles</dt>
      <dd class="mono">{f.diasCabezaDisponibles}</dd>
    </div>
    <div class="line">
      <dt>Días-cabeza requeridos</dt>
      <dd class="mono">{f.diasCabezaRequeridos}</dd>
    </div>
    <div class="line strong" class:bad={f.deficitCabeza > 0}>
      <dt>{f.deficitCabeza > 0 ? 'Déficit' : 'Margen'}</dt>
      <dd class="mono">{Math.abs(f.deficitCabeza)}</dd>
    </div>
    <div class="line muted">
      <dt>Holgura de vagones</dt>
      <dd class="mono">{f.holguraVagon}</dd>
    </div>
  </dl>

  {#if f.deficitCabeza > 0}
    <p class="call bad">
      Imposible sin importar cómo se programe: faltan <b class="mono">{f.deficitCabeza}</b> días-cabeza.
      Harían falta al menos <b class="mono">{f.cabezasMinimas}</b> cabezas.
    </p>
  {:else if !f.vagonesSuficientes}
    <p class="call bad">
      No alcanzan los vagones: hacen falta <b class="mono">{VAGONES_REQUERIDOS}</b> por día.
    </p>
  {:else}
    <p class="call">
      El conteo ya no lo descarta. Pero es una <b>cota inferior</b>: cumplirla no garantiza la
      semana, porque el reparto por días y las averías del plan también gastan cabezas. Súbelas
      de a una y mira dónde se cae.
    </p>
  {/if}
</section>

<style>
  .console {
    padding: 18px 16px 24px;
  }

  .title {
    margin: 0 0 12px;
    font-size: 9.5px;
    color: var(--ink-45);
    letter-spacing: 0.14em;
  }

  .spaced {
    margin-top: 24px;
    padding-top: 18px;
    border-top: 1px solid var(--rule);
  }

  .args {
    display: flex;
    flex-direction: column;
    gap: 7px;
    margin-bottom: 12px;
  }

  .arg {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 66px;
    align-items: center;
    gap: 8px;
  }

  .arg span {
    font-size: 9px;
    letter-spacing: 0.08em;
    color: var(--ink-70);
    line-height: 1.3;
  }

  /* La pista va debajo del rótulo, no al lado: así la columna no se descuadra. */
  .arg em {
    display: block;
    font-family: var(--font-ui);
    font-style: normal;
    font-size: 10.5px;
    letter-spacing: 0;
    text-transform: none;
    color: var(--ink-45);
  }

  input {
    width: 100%;
    padding: 5px 7px;
    font-family: var(--font-code);
    font-variant-numeric: tabular-nums;
    font-size: 13px;
    text-align: right;
    background: var(--plate);
    border: 1px solid var(--rule);
    border-radius: var(--r-chip);
  }

  .render {
    width: 100%;
    padding: 9px;
    font-size: 10.5px;
    color: var(--desk);
    background: var(--ink);
    border: none;
    border-radius: var(--r-chip);
  }

  .render:hover {
    background: #000;
  }

  .secondary {
    width: 100%;
    margin-top: 6px;
    padding: 6px;
    font-size: 12px;
    color: var(--ink-70);
    background: none;
    border: 1px solid var(--rule);
    border-radius: var(--r-chip);
  }

  .secondary:hover {
    color: var(--ink);
    border-color: var(--ink-45);
  }

  .lead {
    margin: 0 0 11px;
    font-size: 12.5px;
    line-height: 1.45;
    color: var(--ink-70);
  }

  .ledger {
    margin: 0;
  }

  .line {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    padding: 4px 0;
    border-bottom: 1px solid var(--rule);
  }

  dt {
    font-size: 12px;
    color: var(--ink-70);
  }

  dd {
    margin: 0;
    font-size: 13px;
    color: var(--ink);
  }

  .line.strong dt,
  .line.strong dd {
    font-weight: 600;
    color: var(--ink);
  }

  .line.strong.bad dt,
  .line.strong.bad dd {
    color: var(--bad);
  }

  .line.muted dt,
  .line.muted dd {
    color: var(--ink-45);
  }

  .call {
    margin: 12px 0 0;
    padding: 10px 11px;
    font-size: 12.5px;
    line-height: 1.45;
    color: var(--ink-70);
    background: var(--recess);
    border-left: 3px solid var(--ink-45);
    border-radius: 0 var(--r-chip) var(--r-chip) 0;
  }

  .call.bad {
    border-left-color: var(--bad);
  }

  .call b {
    color: var(--ink);
  }
</style>
