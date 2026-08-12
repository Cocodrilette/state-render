/**
 * Modelo de datos de StateRender.
 *
 * La idea central, y de donde viene el nombre: una operación no devuelve un
 * resultado, devuelve una *secuencia de fotogramas*. Cada fotograma es un estado
 * completo y autocontenido de la lista, así que reproducir, pausar, retroceder y
 * arrastrar la línea de tiempo son todos la misma operación: elegir un índice del
 * arreglo.
 */

export type NodeId = string;

export interface VizNode {
  id: NodeId;
  value: number;
  /** Id del siguiente nodo, o null para ∅. */
  next: NodeId | null;
  /**
   * Id del nodo anterior. Solo existe en estructuras doblemente ligadas: si es
   * `undefined`, el nodo tiene un único enlace y el lienzo dibuja un solo carril.
   */
  prev?: NodeId | null;
}

/** Punteros que el algoritmo mantiene mientras trabaja; se dibujan como etiquetas. */
export type MarkKind = 'head' | 'cursor' | 'aux' | 'new';

export interface Mark {
  /** Nombre que aparece en la etiqueta: «cabeza», «actual», «previo»… */
  label: string;
  /** Nodo señalado, o null si el puntero apunta a ∅. */
  at: NodeId | null;
  kind: MarkKind;
}

export type Tone = 'neutral' | 'success' | 'warning';

export interface Frame {
  /** Nodos en orden de disposición sobre el lienzo (posición física, no lógica). */
  nodes: VizNode[];
  head: NodeId | null;
  circular: boolean;
  marks: Mark[];
  /** Celdas resaltadas en este paso. */
  activeNodes: NodeId[];
  /** Nodos cuyo enlace `siguiente` se resalta en este paso. */
  activeLinks: NodeId[];
  /** Nodos cuyo enlace `previo` se resalta en este paso. */
  activePrevLinks: NodeId[];
  /** Nodos ya desenlazados que siguen visibles como fantasma. */
  ghosts: NodeId[];
  /** Línea de pseudocódigo que se está ejecutando. */
  codeLine: number;
  /** Narración del paso: explica el porqué, no el qué. */
  caption: string;
  tone: Tone;
}

/**
 * Estado vivo de una lista. `order` es la disposición sobre el lienzo y es
 * independiente del orden lógico: durante una inversión los nodos no se mueven,
 * son los enlaces los que cambian de sentido. Al terminar la operación se
 * normaliza para que ambos vuelvan a coincidir.
 */
export interface ListState {
  order: NodeId[];
  nodes: Record<NodeId, VizNode>;
  head: NodeId | null;
  circular: boolean;
  /**
   * Puntero al último nodo. Solo lo mantienen las estructuras que lo declaran; es
   * lo que vuelve O(1) insertar y eliminar al final. `undefined` significa que la
   * estructura no lo tiene.
   */
  tail?: NodeId | null;
  doubly?: boolean;
  /** Contador de ids; se conserva entre operaciones para que nunca se repitan. */
  seq: number;
}

export interface ArgDef {
  key: string;
  label: string;
  hint?: string;
  min: number;
  max: number;
  default: number;
}

export type OpArgs = Record<string, number>;

export interface OperationDef {
  id: string;
  label: string;
  /** Agrupa los botones en la consola. */
  group: 'insertar' | 'eliminar' | 'consultar';
  complexity: string;
  /** Por qué cuesta lo que cuesta. */
  note: string;
  code: string[];
  args: ArgDef[];
  run(state: ListState, args: OpArgs): Generator<Frame, ListState>;
}

export interface StructureDef {
  id: string;
  /** Distintivo de canal: «CH1», «CH2». */
  channel: string;
  label: string;
  tagline: string;
  /** Variable CSS con el color del canal. */
  color: string;
  circular: boolean;
  /** La estructura mantiene enlaces en los dos sentidos y un puntero a la cola. */
  doubly?: boolean;
  seed: number[];
  operations: OperationDef[];
}
