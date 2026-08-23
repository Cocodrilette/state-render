import { cloneState, createState, idleFrame, runOperation } from './core/list-state';
import { structures } from './core/registry';
import type { Frame, ListState, OpArgs, OperationDef, StructureDef, Tone } from './core/types';
import { Playback, type StripCell } from './playback.svelte';

export { SPEEDS } from './playback.svelte';

/**
 * Reproductor de un canal de estructura. El transporte lo aporta `Playback`; aquí
 * queda solo lo que sabe de listas: qué estructura está montada, qué operación se
 * va a ejecutar y con qué argumentos.
 */
export class Player extends Playback {
  structure = $state<StructureDef>(structures[0]);
  list = $state<ListState>(createState(structures[0].seed, structures[0].circular, structures[0].doubly));
  operation = $state<OperationDef | null>(null);
  args = $state<OpArgs>({});
  frames = $state<Frame[]>([]);

  frame = $derived<Frame>(this.frames.length ? this.frames[this.index] : idleFrame(this.list));

  get frameCount(): number {
    return this.frames.length;
  }

  get caption(): string {
    return this.frame.caption;
  }

  get tone(): Tone {
    return this.frame.tone;
  }

  /**
   * Cada fotograma se reduce a una columna de marcas, una por nodo, con la que el
   * paso está tocando en amarillo: la tira dibuja la forma de la operación antes de
   * reproducirla.
   */
  get stripCells(): StripCell[] {
    return this.frames.map((frame) => {
      const active = new Set(frame.activeNodes);
      const ghosts = new Set(frame.ghosts);
      return {
        tone: frame.tone,
        marks: frame.nodes.map((node) => (active.has(node.id) ? 'on' : ghosts.has(node.id) ? 'gone' : 'off')),
      };
    });
  }

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
    this.rewind();

    const working = cloneState($state.snapshot(this.list) as ListState);
    const { frames, state } = runOperation(operation.run(working, { ...this.args }));

    this.list = state;
    this.frames = frames;
    if (frames.length > 1) this.play();
  }

  reset() {
    this.rewind();
    this.list = createState(this.structure.seed, this.structure.circular, this.structure.doubly);
    this.frames = [];
  }

  clear() {
    this.rewind();
    this.list = createState([], this.structure.circular, this.structure.doubly);
    this.frames = [];
  }
}
