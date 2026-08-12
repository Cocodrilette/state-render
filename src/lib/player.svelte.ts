import { cloneState, createState, idleFrame, runOperation } from './core/list-state';
import { structures } from './core/registry';
import type { Frame, ListState, OpArgs, OperationDef, StructureDef } from './core/types';

export const SPEEDS = [0.5, 1, 2, 4];
const BASE_INTERVAL = 900;

/**
 * Reproductor de fotogramas. La operación ya se ejecutó entera antes de que empiece
 * la animación, así que avanzar, retroceder y arrastrar la línea de tiempo son lo
 * mismo: cambiar un índice.
 */
export class Player {
  structure = $state<StructureDef>(structures[0]);
  list = $state<ListState>(createState(structures[0].seed, structures[0].circular, structures[0].doubly));
  operation = $state<OperationDef | null>(null);
  args = $state<OpArgs>({});
  frames = $state<Frame[]>([]);
  index = $state(0);
  playing = $state(false);
  speed = $state(1);

  frame = $derived<Frame>(this.frames.length ? this.frames[this.index] : idleFrame(this.list));
  atEnd = $derived(this.index >= this.frames.length - 1);
  hasRun = $derived(this.frames.length > 0);

  #timer: ReturnType<typeof setTimeout> | null = null;

  selectStructure(structure: StructureDef) {
    if (structure.id === this.structure.id) return;
    this.pause();
    this.structure = structure;
    this.list = createState(structure.seed, structure.circular, structure.doubly);
    this.frames = [];
    this.index = 0;
    this.selectOperation(structure.operations[0]);
  }

  selectOperation(operation: OperationDef | null) {
    this.operation = operation;
    const args: OpArgs = {};
    for (const arg of operation?.args ?? []) args[arg.key] = arg.default;
    this.args = args;
  }

  setArg(key: string, value: number) {
    this.args = { ...this.args, [key]: value };
  }

  /** Ejecuta la operación seleccionada y empieza a reproducir sus fotogramas. */
  execute() {
    const operation = this.operation;
    if (!operation) return;
    this.pause();

    const working = cloneState($state.snapshot(this.list) as ListState);
    const { frames, state } = runOperation(operation.run(working, { ...this.args }));

    this.list = state;
    this.frames = frames;
    this.index = 0;
    if (frames.length > 1) this.play();
  }

  reset() {
    this.pause();
    this.list = createState(this.structure.seed, this.structure.circular, this.structure.doubly);
    this.frames = [];
    this.index = 0;
  }

  clear() {
    this.pause();
    this.list = createState([], this.structure.circular, this.structure.doubly);
    this.frames = [];
    this.index = 0;
  }

  play() {
    if (!this.frames.length) return;
    if (this.atEnd) this.index = 0;
    this.playing = true;
    this.#schedule();
  }

  pause() {
    this.playing = false;
    if (this.#timer !== null) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
  }

  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }

  stepForward() {
    this.pause();
    if (this.index < this.frames.length - 1) this.index += 1;
  }

  stepBack() {
    this.pause();
    if (this.index > 0) this.index -= 1;
  }

  seek(index: number) {
    this.pause();
    this.index = Math.min(Math.max(index, 0), Math.max(this.frames.length - 1, 0));
  }

  setSpeed(speed: number) {
    this.speed = speed;
    if (this.playing) this.#schedule();
  }

  #schedule() {
    if (this.#timer !== null) clearTimeout(this.#timer);
    this.#timer = setTimeout(() => {
      this.#timer = null;
      if (!this.playing) return;
      if (this.index >= this.frames.length - 1) {
        this.playing = false;
        return;
      }
      this.index += 1;
      this.#schedule();
    }, BASE_INTERVAL / this.speed);
  }
}
