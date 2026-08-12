<script lang="ts">
  import type { Player } from '../player.svelte';
  import type { OperationDef } from '../core/types';

  interface Props {
    player: Player;
  }

  let { player }: Props = $props();

  const GROUPS = [
    { id: 'insertar', label: 'Insertar' },
    { id: 'eliminar', label: 'Eliminar' },
    { id: 'consultar', label: 'Consultar' },
  ] as const;

  function grouped(group: string): OperationDef[] {
    return player.structure.operations.filter((operation) => operation.group === group);
  }
</script>

<section class="console" aria-label="Consola de operaciones">
  <h2 class="osd title">Consola</h2>

  {#each GROUPS as group (group.id)}
    {@const operations = grouped(group.id)}
    {#if operations.length}
      <p class="group osd">{group.label}</p>
      <div class="chips">
        {#each operations as operation (operation.id)}
          <button
            class="chip"
            class:selected={player.operation?.id === operation.id}
            onclick={() => player.selectOperation(operation)}
          >
            {operation.label}
          </button>
        {/each}
      </div>
    {/if}
  {/each}

  {#if player.operation}
    <div class="run">
      {#if player.operation.args.length}
        <div class="args">
          {#each player.operation.args as arg (arg.key)}
            <label class="arg">
              <span class="osd">{arg.label}{#if arg.hint}<em>{arg.hint}</em>{/if}</span>
              <input
                type="number"
                min={arg.min}
                max={arg.max}
                value={player.args[arg.key]}
                oninput={(event) => player.setArg(arg.key, Number(event.currentTarget.value))}
              />
            </label>
          {/each}
        </div>
      {/if}

      <button class="render osd" onclick={() => player.execute()}>Renderizar</button>

      <div class="secondary">
        <button onclick={() => player.reset()}>Restablecer estado</button>
        <button onclick={() => player.clear()}>Vaciar</button>
      </div>
    </div>
  {/if}
</section>

<style>
  .console {
    padding: 18px 16px 24px;
  }

  .title {
    margin: 0 0 14px;
    font-size: 9.5px;
    color: var(--ink-45);
    letter-spacing: 0.14em;
  }

  .group {
    margin: 15px 0 7px;
    font-size: 9.5px;
    letter-spacing: 0.1em;
    color: var(--ink-45);
  }

  .group:first-of-type {
    margin-top: 0;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }

  .chip {
    padding: 6px 10px;
    font-size: 12.5px;
    line-height: 1.2;
    background: var(--plate);
    border: 1px solid var(--rule);
    border-radius: var(--r-chip);
    transition: background 140ms var(--ease), border-color 140ms var(--ease);
  }

  .chip:hover {
    border-color: var(--ink-45);
  }

  .chip.selected {
    background: var(--ink);
    border-color: var(--ink);
    color: var(--desk);
  }

  .run {
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid var(--rule);
  }

  .args {
    display: flex;
    gap: 10px;
    margin-bottom: 12px;
  }

  .arg {
    flex: 1;
    display: grid;
    gap: 4px;
  }

  .arg span {
    font-size: 9.5px;
    letter-spacing: 0.09em;
    color: var(--ink-70);
  }

  .arg em {
    font-family: var(--font-ui);
    font-style: normal;
    font-size: 11.5px;
    color: var(--ink-45);
    text-transform: none;
    letter-spacing: 0;
  }

  .arg em::before {
    content: ' · ';
  }

  input {
    width: 100%;
    padding: 7px 9px;
    font-family: var(--font-code);
    font-variant-numeric: tabular-nums;
    font-size: 15px;
    background: var(--plate);
    border: 1px solid var(--rule);
    border-radius: var(--r-chip);
  }

  input:focus {
    border-color: var(--ink);
  }

  /* El botón lleva el filo del canal activo: el mismo color que tomará el trazo. */
  .render {
    width: 100%;
    padding: 11px;
    font-size: 11.5px;
    letter-spacing: 0.1em;
    color: var(--desk);
    background: var(--ink);
    border: none;
    border-left: 3px solid var(--ch);
    border-radius: var(--r-chip);
    transition: background 140ms var(--ease);
  }

  .render:hover {
    background: #1d2427;
  }

  .render:active {
    background: #0a0d0e;
  }

  .secondary {
    display: flex;
    gap: 14px;
    margin-top: 10px;
  }

  .secondary button {
    padding: 0;
    font-size: 12px;
    color: var(--ink-70);
    background: none;
    border: none;
    border-bottom: 1px solid var(--rule);
  }

  .secondary button:hover {
    color: var(--ink);
    border-color: var(--ink);
  }
</style>
