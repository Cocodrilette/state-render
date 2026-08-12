import { describe, expect, it } from 'vitest';
import { circularOperations } from './circular';
import { doublyOperations } from './doubly';
import { createState, runOperation, toArray } from './list-state';
import { structures } from './registry';
import { singlyOperations } from './singly';
import type { Frame, ListState, OpArgs, OperationDef } from './types';

function op(list: OperationDef[], id: string): OperationDef {
  const found = list.find((operation) => operation.id === id);
  if (!found) throw new Error(`Falta la operación ${id}`);
  return found;
}

function apply(state: ListState, operation: OperationDef, args: OpArgs = {}) {
  return runOperation(operation.run(state, args));
}

/** Toda la información que un fotograma promete tiene que ser cierta. */
function expectConsistent(frame: Frame) {
  const ids = new Set(frame.nodes.map((node) => node.id));
  expect(ids.size).toBe(frame.nodes.length);

  for (const node of frame.nodes) {
    if (node.next !== null) expect(ids.has(node.next)).toBe(true);
    if (node.prev != null) expect(ids.has(node.prev)).toBe(true);
  }
  if (frame.head !== null) expect(ids.has(frame.head)).toBe(true);
  for (const mark of frame.marks) {
    if (mark.at !== null) expect(ids.has(mark.at)).toBe(true);
  }
  for (const id of [...frame.activeNodes, ...frame.activeLinks, ...frame.activePrevLinks, ...frame.ghosts]) {
    expect(ids.has(id)).toBe(true);
  }
  expect(frame.caption.length).toBeGreaterThan(0);
}

function run(state: ListState, operation: OperationDef, args: OpArgs = {}) {
  const result = apply(state, operation, args);
  expect(result.frames.length).toBeGreaterThan(0);
  result.frames.forEach(expectConsistent);
  return result;
}

describe('lista simplemente ligada', () => {
  const seed = () => createState([12, 7, 41, 3], false);

  it('inserta al inicio', () => {
    const { state } = run(seed(), op(singlyOperations, 'insert-head'), { value: 42 });
    expect(toArray(state)).toEqual([42, 12, 7, 41, 3]);
  });

  it('inserta al inicio en una lista vacía', () => {
    const { state } = run(createState([], false), op(singlyOperations, 'insert-head'), { value: 5 });
    expect(toArray(state)).toEqual([5]);
  });

  it('inserta al final', () => {
    const { state } = run(seed(), op(singlyOperations, 'insert-tail'), { value: 8 });
    expect(toArray(state)).toEqual([12, 7, 41, 3, 8]);
  });

  it('inserta en una posición intermedia', () => {
    const { state } = run(seed(), op(singlyOperations, 'insert-at'), { index: 2, value: 55 });
    expect(toArray(state)).toEqual([12, 7, 55, 41, 3]);
  });

  it('inserta en la posición 0 como si fuera al inicio', () => {
    const { state } = run(seed(), op(singlyOperations, 'insert-at'), { index: 0, value: 1 });
    expect(toArray(state)).toEqual([1, 12, 7, 41, 3]);
  });

  it('inserta al final cuando la posición se pasa del largo', () => {
    const { state } = run(seed(), op(singlyOperations, 'insert-at'), { index: 9, value: 99 });
    expect(toArray(state)).toEqual([12, 7, 41, 3, 99]);
  });

  it('elimina al inicio', () => {
    const { state } = run(seed(), op(singlyOperations, 'delete-head'));
    expect(toArray(state)).toEqual([7, 41, 3]);
  });

  it('elimina al inicio dejando la lista vacía', () => {
    const { state } = run(createState([1], false), op(singlyOperations, 'delete-head'));
    expect(toArray(state)).toEqual([]);
    expect(state.head).toBeNull();
  });

  it('elimina por posición en el medio', () => {
    const { state } = run(seed(), op(singlyOperations, 'delete-at'), { index: 2 });
    expect(toArray(state)).toEqual([12, 7, 3]);
  });

  it('elimina la posición 0 como si fuera la cabeza', () => {
    const { state } = run(seed(), op(singlyOperations, 'delete-at'), { index: 0 });
    expect(toArray(state)).toEqual([7, 41, 3]);
  });

  it('elimina la última posición', () => {
    const { state } = run(seed(), op(singlyOperations, 'delete-at'), { index: 3 });
    expect(toArray(state)).toEqual([12, 7, 41]);
  });

  it('deja la lista igual si la posición no existe', () => {
    const { state, frames } = run(seed(), op(singlyOperations, 'delete-at'), { index: 9 });
    expect(toArray(state)).toEqual([12, 7, 41, 3]);
    expect(frames[frames.length - 1].tone).toBe('warning');
  });

  it('no elimina nada por posición en una lista vacía', () => {
    const { state, frames } = run(createState([], false), op(singlyOperations, 'delete-at'), { index: 0 });
    expect(toArray(state)).toEqual([]);
    expect(frames[frames.length - 1].tone).toBe('warning');
  });

  it('elimina por valor en el medio', () => {
    const { state } = run(seed(), op(singlyOperations, 'delete-value'), { value: 41 });
    expect(toArray(state)).toEqual([12, 7, 3]);
  });

  it('elimina por valor cuando es la cabeza', () => {
    const { state } = run(seed(), op(singlyOperations, 'delete-value'), { value: 12 });
    expect(toArray(state)).toEqual([7, 41, 3]);
  });

  it('deja la lista igual si el valor no está', () => {
    const { state, frames } = run(seed(), op(singlyOperations, 'delete-value'), { value: 404 });
    expect(toArray(state)).toEqual([12, 7, 41, 3]);
    expect(frames[frames.length - 1].tone).toBe('warning');
  });

  it('encuentra un valor presente', () => {
    const { frames } = run(seed(), op(singlyOperations, 'search'), { value: 41 });
    expect(frames[frames.length - 1].tone).toBe('success');
  });

  it('avisa cuando el valor no está', () => {
    const { frames } = run(seed(), op(singlyOperations, 'search'), { value: 404 });
    expect(frames[frames.length - 1].tone).toBe('warning');
  });

  it('recorre todos los nodos una vez', () => {
    const { frames } = run(seed(), op(singlyOperations, 'traverse'));
    expect(frames[frames.length - 1].caption).toContain('12 · 7 · 41 · 3');
  });

  it('invierte la lista', () => {
    const { state } = run(seed(), op(singlyOperations, 'reverse'));
    expect(toArray(state)).toEqual([3, 41, 7, 12]);
  });

  it('invertir dos veces devuelve la lista original', () => {
    const once = run(seed(), op(singlyOperations, 'reverse')).state;
    const twice = run(once, op(singlyOperations, 'reverse')).state;
    expect(toArray(twice)).toEqual([12, 7, 41, 3]);
  });

  it('no encuentra ciclo en una lista abierta', () => {
    const { frames } = run(seed(), op(singlyOperations, 'floyd'));
    expect(frames[frames.length - 1].caption).toContain('no tiene ciclo');
  });
});

describe('lista circular', () => {
  const seed = () => createState([12, 7, 41, 3], true);

  /** El invariante que define la estructura: el último siempre vuelve a la cabeza. */
  function expectClosed(state: ListState) {
    const values = toArray(state);
    if (!values.length) {
      expect(state.head).toBeNull();
      return;
    }
    const ids = Object.keys(state.nodes);
    expect(ids.length).toBe(values.length);
    for (const id of ids) expect(state.nodes[id].next).not.toBeNull();
    const last = ids.find((id) => state.nodes[id].next === state.head);
    expect(last).toBeDefined();
  }

  it('inserta al inicio y vuelve a cerrar el círculo', () => {
    const { state } = run(seed(), op(circularOperations, 'insert-head'), { value: 42 });
    expect(toArray(state)).toEqual([42, 12, 7, 41, 3]);
    expectClosed(state);
  });

  it('inserta al final sin mover la cabeza', () => {
    const { state } = run(seed(), op(circularOperations, 'insert-tail'), { value: 8 });
    expect(toArray(state)).toEqual([12, 7, 41, 3, 8]);
    expectClosed(state);
  });

  it('abre la lista con el primer nodo apuntándose a sí mismo', () => {
    const { state } = run(createState([], true), op(circularOperations, 'insert-head'), { value: 5 });
    expect(toArray(state)).toEqual([5]);
    expect(state.nodes[state.head as string].next).toBe(state.head);
  });

  it('elimina la cabeza y reengancha el último nodo', () => {
    const { state } = run(seed(), op(circularOperations, 'delete-head'));
    expect(toArray(state)).toEqual([7, 41, 3]);
    expectClosed(state);
  });

  it('elimina el único nodo y deja la lista vacía', () => {
    const { state } = run(createState([9], true), op(circularOperations, 'delete-head'));
    expect(toArray(state)).toEqual([]);
    expect(state.head).toBeNull();
  });

  it('elimina por posición en el medio', () => {
    const { state } = run(seed(), op(circularOperations, 'delete-at'), { index: 2 });
    expect(toArray(state)).toEqual([12, 7, 3]);
    expectClosed(state);
  });

  it('elimina la posición 0 y reengancha el último nodo', () => {
    const { state } = run(seed(), op(circularOperations, 'delete-at'), { index: 0 });
    expect(toArray(state)).toEqual([7, 41, 3]);
    expectClosed(state);
  });

  it('elimina la última posición y mantiene el ciclo cerrado', () => {
    const { state } = run(seed(), op(circularOperations, 'delete-at'), { index: 3 });
    expect(toArray(state)).toEqual([12, 7, 41]);
    expectClosed(state);
  });

  it('elimina por posición el único nodo que queda', () => {
    const { state } = run(createState([9], true), op(circularOperations, 'delete-at'), { index: 0 });
    expect(toArray(state)).toEqual([]);
    expect(state.head).toBeNull();
  });

  it('avisa cuando la posición no existe, sin dar vueltas de más', () => {
    const { state, frames } = run(seed(), op(circularOperations, 'delete-at'), { index: 9 });
    expect(toArray(state)).toEqual([12, 7, 41, 3]);
    expect(frames[frames.length - 1].tone).toBe('warning');
    expect(frames.length).toBeLessThan(12);
  });

  it('elimina por valor en el medio', () => {
    const { state } = run(seed(), op(circularOperations, 'delete-value'), { value: 41 });
    expect(toArray(state)).toEqual([12, 7, 3]);
    expectClosed(state);
  });

  it('elimina por valor cuando es la cabeza', () => {
    const { state } = run(seed(), op(circularOperations, 'delete-value'), { value: 12 });
    expect(toArray(state)).toEqual([7, 41, 3]);
    expectClosed(state);
  });

  it('elimina por valor el último nodo que queda', () => {
    const { state } = run(createState([9], true), op(circularOperations, 'delete-value'), { value: 9 });
    expect(toArray(state)).toEqual([]);
    expect(state.head).toBeNull();
  });

  it('termina la búsqueda de un valor ausente tras una vuelta', () => {
    const { frames, state } = run(seed(), op(circularOperations, 'search'), { value: 404 });
    expect(frames[frames.length - 1].tone).toBe('warning');
    expect(toArray(state)).toEqual([12, 7, 41, 3]);
  });

  it('recorre el número de vueltas pedido', () => {
    const { frames } = run(seed(), op(circularOperations, 'traverse'), { laps: 2 });
    const hops = frames.filter((frame) => frame.caption.includes('salto')).length;
    expect(hops).toBeGreaterThanOrEqual(8);
  });

  it('encuentra ciclo con Floyd', () => {
    const { frames } = run(seed(), op(circularOperations, 'floyd'));
    expect(frames[frames.length - 1].caption).toContain('tiene ciclo');
  });
});

describe('lista doblemente ligada', () => {
  const seed = () => createState([12, 7, 41, 3], false, true);

  /**
   * El invariante que define la estructura: los dos sentidos tienen que contar la
   * misma historia, y los extremos tienen que cerrar en ∅.
   */
  function expectLinked(state: ListState) {
    const values = toArray(state);
    if (!values.length) {
      expect(state.head).toBeNull();
      expect(state.tail).toBeNull();
      return;
    }

    for (const id of Object.keys(state.nodes)) {
      const current = state.nodes[id];
      if (current.next) expect(state.nodes[current.next].prev).toBe(id);
      if (current.prev) expect(state.nodes[current.prev].next).toBe(id);
    }

    expect(state.nodes[state.head as string].prev ?? null).toBeNull();
    expect(state.nodes[state.tail as string].next).toBeNull();

    // La cola es de verdad el último, y desde ella se vuelve a la cabeza.
    const backwards: number[] = [];
    let cursor: string | null = state.tail as string;
    while (cursor) {
      backwards.push(state.nodes[cursor].value);
      cursor = state.nodes[cursor].prev ?? null;
    }
    expect(backwards).toEqual([...values].reverse());
  }

  it('inserta al inicio', () => {
    const { state } = run(seed(), op(doublyOperations, 'insert-head'), { value: 42 });
    expect(toArray(state)).toEqual([42, 12, 7, 41, 3]);
    expectLinked(state);
  });

  it('inserta al final sin recorrer, usando la cola', () => {
    const { state, frames } = run(seed(), op(doublyOperations, 'insert-tail'), { value: 8 });
    expect(toArray(state)).toEqual([12, 7, 41, 3, 8]);
    expectLinked(state);
    // O(1) de verdad: el número de pasos no depende del largo de la lista.
    const largo = apply(createState([1, 2, 3, 4, 5, 6, 7, 8], false, true), op(doublyOperations, 'insert-tail'), {
      value: 9,
    });
    expect(largo.frames.length).toBe(frames.length);
  });

  it('abre la lista con un nodo que es cabeza y cola a la vez', () => {
    const { state } = run(createState([], false, true), op(doublyOperations, 'insert-head'), { value: 5 });
    expect(toArray(state)).toEqual([5]);
    expect(state.head).toBe(state.tail);
    expectLinked(state);
  });

  it('inserta en una posición intermedia cosiendo los cuatro enlaces', () => {
    const { state } = run(seed(), op(doublyOperations, 'insert-at'), { index: 2, value: 55 });
    expect(toArray(state)).toEqual([12, 7, 55, 41, 3]);
    expectLinked(state);
  });

  it('inserta al final cuando la posición se pasa del largo', () => {
    const { state } = run(seed(), op(doublyOperations, 'insert-at'), { index: 9, value: 99 });
    expect(toArray(state)).toEqual([12, 7, 41, 3, 99]);
    expectLinked(state);
  });

  it('elimina al inicio', () => {
    const { state } = run(seed(), op(doublyOperations, 'delete-head'));
    expect(toArray(state)).toEqual([7, 41, 3]);
    expectLinked(state);
  });

  it('elimina al final sin recorrer', () => {
    const { state, frames } = run(seed(), op(doublyOperations, 'delete-tail'));
    expect(toArray(state)).toEqual([12, 7, 41]);
    expectLinked(state);
    const largo = apply(createState([1, 2, 3, 4, 5, 6, 7, 8], false, true), op(doublyOperations, 'delete-tail'));
    expect(largo.frames.length).toBe(frames.length);
  });

  it('elimina el único nodo por los dos extremos', () => {
    for (const id of ['delete-head', 'delete-tail']) {
      const { state } = run(createState([9], false, true), op(doublyOperations, id));
      expect(toArray(state)).toEqual([]);
      expect(state.head).toBeNull();
      expect(state.tail).toBeNull();
    }
  });

  it('elimina por posición en el medio', () => {
    const { state } = run(seed(), op(doublyOperations, 'delete-at'), { index: 2 });
    expect(toArray(state)).toEqual([12, 7, 3]);
    expectLinked(state);
  });

  it('elimina por posición la cabeza y la cola', () => {
    const first = run(seed(), op(doublyOperations, 'delete-at'), { index: 0 }).state;
    expect(toArray(first)).toEqual([7, 41, 3]);
    expectLinked(first);

    const last = run(seed(), op(doublyOperations, 'delete-at'), { index: 3 }).state;
    expect(toArray(last)).toEqual([12, 7, 41]);
    expectLinked(last);
  });

  it('avisa cuando la posición no existe', () => {
    const { state, frames } = run(seed(), op(doublyOperations, 'delete-at'), { index: 9 });
    expect(toArray(state)).toEqual([12, 7, 41, 3]);
    expect(frames[frames.length - 1].tone).toBe('warning');
  });

  it('elimina por valor', () => {
    const { state } = run(seed(), op(doublyOperations, 'delete-value'), { value: 41 });
    expect(toArray(state)).toEqual([12, 7, 3]);
    expectLinked(state);
  });

  it('deja la lista igual si el valor no está', () => {
    const { state, frames } = run(seed(), op(doublyOperations, 'delete-value'), { value: 404 });
    expect(toArray(state)).toEqual([12, 7, 41, 3]);
    expect(frames[frames.length - 1].tone).toBe('warning');
    expectLinked(state);
  });

  it('recorre al revés desde la cola', () => {
    const { frames } = run(seed(), op(doublyOperations, 'traverse-back'));
    expect(frames[frames.length - 1].caption).toContain('3 · 41 · 7 · 12');
  });

  it('invierte intercambiando los enlaces de cada nodo', () => {
    const { state } = run(seed(), op(doublyOperations, 'reverse'));
    expect(toArray(state)).toEqual([3, 41, 7, 12]);
    expectLinked(state);
  });

  it('invertir dos veces devuelve la lista original', () => {
    const once = run(seed(), op(doublyOperations, 'reverse')).state;
    const twice = run(once, op(doublyOperations, 'reverse')).state;
    expect(toArray(twice)).toEqual([12, 7, 41, 3]);
    expectLinked(twice);
  });

  it('encadena operaciones manteniendo los dos sentidos coherentes', () => {
    let state = seed();
    state = run(state, op(doublyOperations, 'insert-head'), { value: 1 }).state;
    state = run(state, op(doublyOperations, 'insert-tail'), { value: 2 }).state;
    state = run(state, op(doublyOperations, 'delete-at'), { index: 3 }).state;
    state = run(state, op(doublyOperations, 'delete-value'), { value: 1 }).state;
    state = run(state, op(doublyOperations, 'reverse')).state;
    state = run(state, op(doublyOperations, 'delete-tail')).state;
    expectLinked(state);
    expect(toArray(state)).toEqual([2, 3, 7]);
  });
});

describe('catálogo', () => {
  it('cada operación declara pseudocódigo, complejidad y nota', () => {
    for (const structure of structures) {
      expect(structure.operations.length).toBeGreaterThan(0);
      for (const operation of structure.operations) {
        expect(operation.code.length).toBeGreaterThan(1);
        expect(operation.complexity).toMatch(/^O\(/);
        expect(operation.note.length).toBeGreaterThan(0);
      }
    }
  });

  it('ningún fotograma señala una línea de código inexistente', () => {
    for (const structure of structures) {
      for (const operation of structure.operations) {
        const args: OpArgs = {};
        for (const arg of operation.args) args[arg.key] = arg.default;
        const { frames } = apply(
          createState(structure.seed, structure.circular, structure.doubly),
          operation,
          args,
        );
        for (const frame of frames) {
          expect(frame.codeLine).toBeGreaterThanOrEqual(0);
          expect(frame.codeLine).toBeLessThan(operation.code.length);
        }
      }
    }
  });
});
