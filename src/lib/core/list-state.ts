import type { Frame, ListState, Mark, MarkKind, NodeId, Tone, VizNode } from './types';

export function createState(values: number[], circular: boolean, doubly = false): ListState {
  const state: ListState = { order: [], nodes: {}, head: null, circular, seq: 0 };
  if (doubly) {
    state.doubly = true;
    state.tail = null;
  }

  let prev: VizNode | null = null;
  for (const value of values) {
    const node = createNode(state, value);
    state.order.push(node.id);
    if (prev) prev.next = node.id;
    else state.head = node.id;
    if (doubly) node.prev = prev ? prev.id : null;
    prev = node;
  }
  if (prev) prev.next = circular ? state.head : null;
  if (doubly) state.tail = prev ? prev.id : null;
  return state;
}

export function createNode(state: ListState, value: number): VizNode {
  const id = `n${++state.seq}`;
  const node: VizNode = { id, value, next: null };
  if (state.doubly) node.prev = null;
  state.nodes[id] = node;
  return node;
}

export function cloneState(state: ListState): ListState {
  const nodes: Record<NodeId, VizNode> = {};
  for (const id of Object.keys(state.nodes)) nodes[id] = { ...state.nodes[id] };
  const clone: ListState = {
    order: [...state.order],
    nodes,
    head: state.head,
    circular: state.circular,
    seq: state.seq,
  };
  if (state.doubly) {
    clone.doubly = true;
    clone.tail = state.tail ?? null;
  }
  return clone;
}

export function node(state: ListState, id: NodeId): VizNode {
  const found = state.nodes[id];
  if (!found) throw new Error(`El nodo ${id} no existe`);
  return found;
}

/** Ids en orden lógico desde la cabeza, con guarda contra ciclos. */
export function walk(state: ListState): NodeId[] {
  const visited: NodeId[] = [];
  const seen = new Set<NodeId>();
  let current = state.head;
  while (current && !seen.has(current)) {
    seen.add(current);
    visited.push(current);
    current = state.nodes[current]?.next ?? null;
  }
  return visited;
}

export function toArray(state: ListState): number[] {
  return walk(state).map((id) => node(state, id).value);
}

export function size(state: ListState): number {
  return walk(state).length;
}

/** Último nodo: el que apunta a ∅ en una lista abierta, o a la cabeza en una circular. */
export function lastId(state: ListState): NodeId | null {
  const visited = walk(state);
  return visited.length ? visited[visited.length - 1] : null;
}

/** Saca un nodo del mapa y del lienzo. */
export function detach(state: ListState, id: NodeId): void {
  delete state.nodes[id];
  state.order = state.order.filter((other) => other !== id);
}

/** Devuelve la disposición al orden lógico y descarta lo que ya no es alcanzable. */
export function normalize(state: ListState): void {
  const reachable = walk(state);
  const seen = new Set(reachable);
  for (const id of Object.keys(state.nodes)) {
    if (!seen.has(id)) delete state.nodes[id];
  }
  state.order = reachable;
  // La cola se recalcula desde lo que quedó alcanzable: así nunca sobrevive
  // apuntando a un nodo liberado.
  if (state.doubly) state.tail = reachable.length ? reachable[reachable.length - 1] : null;
}

export function mark(label: string, at: NodeId | null, kind: MarkKind): Mark {
  return { label, at, kind };
}

export function headMark(state: ListState): Mark {
  return mark('cabeza', state.head, 'head');
}

export function tailMark(state: ListState): Mark {
  return mark('cola', state.tail ?? null, 'head');
}

/** Los punteros que la estructura mantiene por sí misma, sin que ningún algoritmo los mueva. */
export function endMarks(state: ListState): Mark[] {
  return state.tail === undefined ? [headMark(state)] : [headMark(state), tailMark(state)];
}

export interface SnapshotOptions {
  codeLine: number;
  caption: string;
  marks?: Mark[];
  activeNodes?: NodeId[];
  activeLinks?: NodeId[];
  activePrevLinks?: NodeId[];
  ghosts?: NodeId[];
  tone?: Tone;
}

export function snapshot(state: ListState, options: SnapshotOptions): Frame {
  return {
    nodes: state.order.filter((id) => state.nodes[id]).map((id) => ({ ...state.nodes[id] })),
    head: state.head,
    circular: state.circular,
    marks: options.marks ?? endMarks(state),
    activeNodes: options.activeNodes ?? [],
    activeLinks: options.activeLinks ?? [],
    activePrevLinks: options.activePrevLinks ?? [],
    ghosts: options.ghosts ?? [],
    codeLine: options.codeLine,
    caption: options.caption,
    tone: options.tone ?? 'neutral',
  };
}

/** Fotograma en reposo: la lista tal como está, sin operación en curso. */
export function idleFrame(state: ListState): Frame {
  return snapshot(state, {
    codeLine: -1,
    caption: state.head
      ? 'Estado listo. Elige una operación en la consola y pulsa Renderizar.'
      : 'Estado vacío. Inserta un nodo para empezar.',
  });
}

/** Ejecuta una operación completa y devuelve sus fotogramas y el estado resultante. */
export function runOperation(
  generator: Generator<Frame, ListState>,
): { frames: Frame[]; state: ListState } {
  const frames: Frame[] = [];
  let step = generator.next();
  while (!step.done) {
    frames.push(step.value);
    step = generator.next();
  }
  return { frames, state: step.value };
}
