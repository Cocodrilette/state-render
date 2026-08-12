import { createNode, detach, headMark, mark, node, normalize, size, snapshot } from './list-state';
import { floyd } from './singly';
import type { Frame, ListState, NodeId, OperationDef } from './types';

/**
 * Operaciones de la lista simplemente ligada circular. El último nodo apunta a la
 * cabeza en vez de a ∅, así que aquí no existe el «final» de la lista: toda
 * operación que toque los extremos tiene que volver a cerrar el círculo, y todo
 * recorrido necesita una guarda para no dar vueltas para siempre.
 */

/** Recorre hasta el nodo cuyo siguiente es la cabeza, emitiendo un fotograma por paso. */
function* walkToLast(
  state: ListState,
  lines: { loop: number; step: number; label?: string },
  extra: () => ReturnType<typeof mark>[],
): Generator<Frame, NodeId> {
  const name = lines.label ?? 'ultimo';
  let lastId = state.head as NodeId;
  yield snapshot(state, {
    codeLine: lines.loop - 1,
    caption: 'Para cerrar el círculo hay que localizar el último nodo, el que apunta a la cabeza.',
    marks: [headMark(state), mark(name, lastId, 'aux'), ...extra()],
    activeNodes: [lastId],
  });

  while (node(state, lastId).next !== state.head) {
    yield snapshot(state, {
      codeLine: lines.loop,
      caption: `${node(state, lastId).value} no apunta a la cabeza, así que no es el último.`,
      marks: [headMark(state), mark(name, lastId, 'aux'), ...extra()],
      activeNodes: [lastId],
      activeLinks: [lastId],
    });
    lastId = node(state, lastId).next as NodeId;
    yield snapshot(state, {
      codeLine: lines.step,
      caption: `${name} avanza a ${node(state, lastId).value}.`,
      marks: [headMark(state), mark(name, lastId, 'aux'), ...extra()],
      activeNodes: [lastId],
    });
  }
  return lastId;
}

const insertHead: OperationDef = {
  id: 'insert-head',
  label: 'Insertar al inicio',
  group: 'insertar',
  complexity: 'O(n)',
  note: 'En la lista abierta esto era O(1). Aquí hay que buscar el último nodo para volver a cerrar el círculo.',
  args: [{ key: 'value', label: 'Valor', min: 0, max: 999, default: 42 }],
  code: [
    'insertarAlInicio(valor)',
    '  nuevo ← Nodo(valor)',
    '  si cabeza = ∅ entonces nuevo.siguiente ← nuevo;  cabeza ← nuevo;  terminar',
    '  ultimo ← cabeza',
    '  mientras ultimo.siguiente ≠ cabeza hacer',
    '    ultimo ← ultimo.siguiente',
    '  nuevo.siguiente ← cabeza',
    '  ultimo.siguiente ← nuevo',
    '  cabeza ← nuevo',
  ],
  *run(state, args): Generator<Frame, ListState> {
    const value = args.value;
    yield snapshot(state, { codeLine: 0, caption: `Insertar ${value} al inicio de la lista circular.` });

    const fresh = createNode(state, value);
    state.order.unshift(fresh.id);
    const newMark = () => [mark('nuevo', fresh.id, 'new')];
    yield snapshot(state, {
      codeLine: 1,
      caption: `Se crea el nodo ${value}, todavía fuera del círculo.`,
      marks: [headMark(state), ...newMark()],
      activeNodes: [fresh.id],
    });

    if (!state.head) {
      fresh.next = fresh.id;
      state.head = fresh.id;
      normalize(state);
      yield snapshot(state, {
        codeLine: 2,
        caption: `La lista estaba vacía: ${value} se apunta a sí mismo y ya forma un círculo de un solo nodo.`,
        activeNodes: [fresh.id],
        activeLinks: [fresh.id],
        tone: 'success',
      });
      return state;
    }

    const lastId = yield* walkToLast(state, { loop: 4, step: 5 }, newMark);

    fresh.next = state.head;
    yield snapshot(state, {
      codeLine: 6,
      caption: 'El nodo nuevo apunta a la cabeza actual.',
      marks: [headMark(state), mark('ultimo', lastId, 'aux'), ...newMark()],
      activeLinks: [fresh.id],
    });

    node(state, lastId).next = fresh.id;
    yield snapshot(state, {
      codeLine: 7,
      caption: `${node(state, lastId).value} deja de apuntar a la cabeza vieja y apunta a ${value}: el círculo vuelve a estar cerrado.`,
      marks: [headMark(state), mark('ultimo', lastId, 'aux'), ...newMark()],
      activeLinks: [lastId],
    });

    state.head = fresh.id;
    normalize(state);
    yield snapshot(state, {
      codeLine: 8,
      caption: `La cabeza pasa a ser ${value}. En un círculo la cabeza solo marca por dónde empezar a contar.`,
      activeNodes: [fresh.id],
      tone: 'success',
    });
    return state;
  },
};

const insertTail: OperationDef = {
  id: 'insert-tail',
  label: 'Insertar al final',
  group: 'insertar',
  complexity: 'O(n)',
  note: 'Es el mismo trabajo que insertar al inicio; lo único que cambia es que la cabeza no se mueve.',
  args: [{ key: 'value', label: 'Valor', min: 0, max: 999, default: 8 }],
  code: [
    'insertarAlFinal(valor)',
    '  nuevo ← Nodo(valor)',
    '  si cabeza = ∅ entonces nuevo.siguiente ← nuevo;  cabeza ← nuevo;  terminar',
    '  ultimo ← cabeza',
    '  mientras ultimo.siguiente ≠ cabeza hacer',
    '    ultimo ← ultimo.siguiente',
    '  nuevo.siguiente ← cabeza',
    '  ultimo.siguiente ← nuevo',
  ],
  *run(state, args): Generator<Frame, ListState> {
    const value = args.value;
    yield snapshot(state, { codeLine: 0, caption: `Insertar ${value} al final de la lista circular.` });

    const fresh = createNode(state, value);
    state.order.push(fresh.id);
    const newMark = () => [mark('nuevo', fresh.id, 'new')];
    yield snapshot(state, {
      codeLine: 1,
      caption: `Se crea el nodo ${value}, todavía fuera del círculo.`,
      marks: [headMark(state), ...newMark()],
      activeNodes: [fresh.id],
    });

    if (!state.head) {
      fresh.next = fresh.id;
      state.head = fresh.id;
      normalize(state);
      yield snapshot(state, {
        codeLine: 2,
        caption: `La lista estaba vacía: ${value} se apunta a sí mismo.`,
        activeNodes: [fresh.id],
        activeLinks: [fresh.id],
        tone: 'success',
      });
      return state;
    }

    const lastId = yield* walkToLast(state, { loop: 4, step: 5 }, newMark);

    fresh.next = state.head;
    yield snapshot(state, {
      codeLine: 6,
      caption: 'El nodo nuevo apunta a la cabeza: será el que cierre el círculo.',
      marks: [headMark(state), mark('ultimo', lastId, 'aux'), ...newMark()],
      activeLinks: [fresh.id],
    });

    node(state, lastId).next = fresh.id;
    normalize(state);
    yield snapshot(state, {
      codeLine: 7,
      caption: `${node(state, lastId).value} ahora apunta a ${value}. La cabeza no se movió: solo cambió quién cierra el círculo.`,
      activeNodes: [fresh.id],
      activeLinks: [lastId],
      tone: 'success',
    });
    return state;
  },
};

const deleteHead: OperationDef = {
  id: 'delete-head',
  label: 'Eliminar al inicio',
  group: 'eliminar',
  complexity: 'O(n)',
  note: 'En la lista abierta costaba O(1). Aquí el último nodo tiene que volver a apuntar a la nueva cabeza.',
  args: [],
  code: [
    'eliminarAlInicio()',
    '  si cabeza = ∅ entonces terminar',
    '  si cabeza.siguiente = cabeza entonces cabeza ← ∅;  terminar',
    '  ultimo ← cabeza',
    '  mientras ultimo.siguiente ≠ cabeza hacer',
    '    ultimo ← ultimo.siguiente',
    '  objetivo ← cabeza',
    '  cabeza ← cabeza.siguiente',
    '  ultimo.siguiente ← cabeza',
    '  liberar(objetivo)',
  ],
  *run(state): Generator<Frame, ListState> {
    yield snapshot(state, { codeLine: 0, caption: 'Eliminar la cabeza de la lista circular.' });

    if (!state.head) {
      yield snapshot(state, { codeLine: 1, caption: 'La lista está vacía: no hay nada que eliminar.', tone: 'warning' });
      return state;
    }

    const targetId = state.head;
    const targetValue = node(state, targetId).value;

    if (node(state, targetId).next === targetId) {
      state.head = null;
      yield snapshot(state, {
        codeLine: 2,
        caption: `${targetValue} se apuntaba a sí mismo: era el único nodo y la lista queda vacía.`,
        ghosts: [targetId],
      });
      detach(state, targetId);
      normalize(state);
      yield snapshot(state, { codeLine: 9, caption: `${targetValue} sale de servicio.`, tone: 'success' });
      return state;
    }

    const lastId = yield* walkToLast(state, { loop: 4, step: 5 }, () => [mark('objetivo', targetId, 'cursor')]);

    state.head = node(state, targetId).next;
    yield snapshot(state, {
      codeLine: 7,
      caption: `La cabeza salta a ${node(state, state.head as NodeId).value}, pero ${node(state, lastId).value} todavía apunta al nodo eliminado.`,
      marks: [headMark(state), mark('ultimo', lastId, 'aux'), mark('objetivo', targetId, 'cursor')],
      activeLinks: [lastId],
      ghosts: [targetId],
    });

    node(state, lastId).next = state.head;
    yield snapshot(state, {
      codeLine: 8,
      caption: `${node(state, lastId).value} se reengancha con la nueva cabeza: el círculo queda cerrado sin ${targetValue}.`,
      marks: [headMark(state), mark('ultimo', lastId, 'aux')],
      activeLinks: [lastId],
      ghosts: [targetId],
    });

    detach(state, targetId);
    normalize(state);
    yield snapshot(state, { codeLine: 9, caption: `${targetValue} sale de servicio.`, tone: 'success' });
    return state;
  },
};

const deleteAt: OperationDef = {
  id: 'delete-at',
  label: 'Eliminar por posición',
  group: 'eliminar',
  complexity: 'O(n)',
  note: 'Sin ∅ al final, lo único que avisa de que la posición no existe es haber vuelto a la cabeza.',
  args: [{ key: 'index', label: 'Posición', hint: 'desde 0', min: 0, max: 20, default: 1 }],
  code: [
    'eliminarEn(posicion)',
    '  si cabeza = ∅ entonces terminar',
    '  si posicion = 0 entonces eliminarAlInicio(); terminar',
    '  previo ← cabeza;  i ← 0',
    '  mientras i < posicion − 1 y previo.siguiente ≠ cabeza hacer',
    '    previo ← previo.siguiente;  i ← i + 1',
    '  si previo.siguiente = cabeza entonces terminar',
    '  objetivo ← previo.siguiente',
    '  previo.siguiente ← objetivo.siguiente',
    '  liberar(objetivo)',
  ],
  *run(state, args): Generator<Frame, ListState> {
    const index = Math.trunc(args.index);
    yield snapshot(state, { codeLine: 0, caption: `Eliminar el nodo de la posición ${index}.` });

    if (!state.head) {
      yield snapshot(state, { codeLine: 1, caption: 'El estado está vacío: no hay nada que eliminar.', tone: 'warning' });
      return state;
    }

    if (index <= 0) {
      const targetId = state.head as NodeId;
      const targetValue = node(state, targetId).value;

      if (node(state, targetId).next === targetId) {
        state.head = null;
        yield snapshot(state, {
          codeLine: 2,
          caption: `${targetValue} se apuntaba a sí mismo: era el único nodo y el ciclo desaparece.`,
          ghosts: [targetId],
        });
        detach(state, targetId);
        normalize(state);
        yield snapshot(state, { codeLine: 9, caption: `${targetValue} sale de servicio.`, tone: 'success' });
        return state;
      }

      // La cabeza es el caso caro: hay que encontrar el último nodo para volver a
      // cerrar el ciclo. Todos estos pasos ocurren dentro de la línea 2.
      let lastId = targetId;
      yield snapshot(state, {
        codeLine: 2,
        caption: 'La posición 0 es la cabeza, y quitarla obliga a buscar el último nodo para volver a cerrar el ciclo.',
        marks: [headMark(state), mark('ultimo', lastId, 'aux'), mark('objetivo', targetId, 'cursor')],
        activeNodes: [lastId],
      });

      while (node(state, lastId).next !== state.head) {
        lastId = node(state, lastId).next as NodeId;
        yield snapshot(state, {
          codeLine: 2,
          caption: `ultimo avanza a ${node(state, lastId).value}.`,
          marks: [headMark(state), mark('ultimo', lastId, 'aux'), mark('objetivo', targetId, 'cursor')],
          activeNodes: [lastId],
        });
      }

      state.head = node(state, targetId).next;
      yield snapshot(state, {
        codeLine: 2,
        caption: `La cabeza pasa a ${node(state, state.head as NodeId).value}, pero ${node(state, lastId).value} todavía apunta al nodo eliminado.`,
        marks: [headMark(state), mark('ultimo', lastId, 'aux'), mark('objetivo', targetId, 'cursor')],
        activeLinks: [lastId],
        ghosts: [targetId],
      });

      node(state, lastId).next = state.head;
      yield snapshot(state, {
        codeLine: 2,
        caption: `${node(state, lastId).value} se reengancha con la nueva cabeza: el ciclo queda cerrado sin ${targetValue}.`,
        marks: [headMark(state), mark('ultimo', lastId, 'aux')],
        activeLinks: [lastId],
        ghosts: [targetId],
      });

      detach(state, targetId);
      normalize(state);
      yield snapshot(state, { codeLine: 9, caption: `${targetValue} sale de servicio.`, tone: 'success' });
      return state;
    }

    let prevId = state.head as NodeId;
    let i = 0;
    yield snapshot(state, {
      codeLine: 3,
      caption: 'previo empieza en la cabeza; hay que dejarlo justo antes de la posición pedida.',
      marks: [headMark(state), mark('previo', prevId, 'aux')],
      activeNodes: [prevId],
    });

    while (i < index - 1 && node(state, prevId).next !== state.head) {
      prevId = node(state, prevId).next as NodeId;
      i += 1;
      yield snapshot(state, {
        codeLine: 5,
        caption: `previo avanza a ${node(state, prevId).value} (posición ${i}).`,
        marks: [headMark(state), mark('previo', prevId, 'aux')],
        activeNodes: [prevId],
      });
    }

    if (i < index - 1 || node(state, prevId).next === state.head) {
      const total = size(state);
      yield snapshot(state, {
        codeLine: 6,
        caption: `previo volvió a la cabeza: el ciclo tiene ${total} ${total === 1 ? 'nodo' : 'nodos'} y la posición ${index} no existe.`,
        marks: [headMark(state), mark('previo', prevId, 'aux')],
        activeLinks: [prevId],
        tone: 'warning',
      });
      return state;
    }

    const targetId = node(state, prevId).next as NodeId;
    const targetValue = node(state, targetId).value;
    yield snapshot(state, {
      codeLine: 7,
      caption: `En la posición ${index} está ${targetValue}, justo después de previo.`,
      marks: [headMark(state), mark('previo', prevId, 'aux'), mark('objetivo', targetId, 'cursor')],
      activeNodes: [targetId],
    });

    node(state, prevId).next = node(state, targetId).next;
    yield snapshot(state, {
      codeLine: 8,
      caption: `${node(state, prevId).value} salta por encima de ${targetValue} y el ciclo se cierra otra vez.`,
      marks: [headMark(state), mark('previo', prevId, 'aux')],
      activeLinks: [prevId],
      ghosts: [targetId],
    });

    detach(state, targetId);
    normalize(state);
    yield snapshot(state, { codeLine: 9, caption: `${targetValue} sale de servicio.`, tone: 'success' });
    return state;
  },
};

const deleteValue: OperationDef = {
  id: 'delete-value',
  label: 'Eliminar por valor',
  group: 'eliminar',
  complexity: 'O(n)',
  note: 'La vuelta completa es la condición de parada: sin ella, buscar un valor ausente no terminaría nunca.',
  args: [{ key: 'value', label: 'Valor', min: 0, max: 999, default: 41 }],
  code: [
    'eliminarPorValor(valor)',
    '  si cabeza = ∅ entonces terminar',
    '  previo ← cabeza',
    '  mientras previo.siguiente ≠ cabeza hacer',
    '    previo ← previo.siguiente',
    '  actual ← cabeza',
    '  repetir',
    '    si actual.valor = valor entonces salir',
    '    previo ← actual;  actual ← actual.siguiente',
    '  hasta actual = cabeza',
    '  si actual.valor ≠ valor entonces terminar',
    '  si actual.siguiente = actual entonces cabeza ← ∅;  terminar',
    '  si actual = cabeza entonces cabeza ← actual.siguiente',
    '  previo.siguiente ← actual.siguiente',
  ],
  *run(state, args): Generator<Frame, ListState> {
    const value = args.value;
    yield snapshot(state, { codeLine: 0, caption: `Eliminar el primer nodo con valor ${value}.` });

    if (!state.head) {
      yield snapshot(state, { codeLine: 1, caption: 'La lista está vacía: no hay nada que eliminar.', tone: 'warning' });
      return state;
    }

    let prevId = yield* walkToLast(state, { loop: 3, step: 4, label: 'previo' }, () => []);
    let currentId = state.head as NodeId;
    yield snapshot(state, {
      codeLine: 5,
      caption: 'La búsqueda arranca en la cabeza, con previo colocado en el último nodo.',
      marks: [headMark(state), mark('previo', prevId, 'aux'), mark('actual', currentId, 'cursor')],
      activeNodes: [currentId],
    });

    let found = false;
    for (;;) {
      if (node(state, currentId).value === value) {
        found = true;
        yield snapshot(state, {
          codeLine: 7,
          caption: `Encontrado: ${value}.`,
          marks: [headMark(state), mark('previo', prevId, 'aux'), mark('actual', currentId, 'cursor')],
          activeNodes: [currentId],
        });
        break;
      }
      yield snapshot(state, {
        codeLine: 7,
        caption: `${node(state, currentId).value} no es ${value}.`,
        marks: [headMark(state), mark('previo', prevId, 'aux'), mark('actual', currentId, 'cursor')],
        activeNodes: [currentId],
      });
      prevId = currentId;
      currentId = node(state, currentId).next as NodeId;
      if (currentId === state.head) {
        yield snapshot(state, {
          codeLine: 9,
          caption: `actual volvió a la cabeza: se dio la vuelta completa y ${value} no está.`,
          marks: [headMark(state), mark('previo', prevId, 'aux'), mark('actual', currentId, 'cursor')],
          tone: 'warning',
        });
        break;
      }
      yield snapshot(state, {
        codeLine: 8,
        caption: `actual avanza a ${node(state, currentId).value}.`,
        marks: [headMark(state), mark('previo', prevId, 'aux'), mark('actual', currentId, 'cursor')],
        activeNodes: [currentId],
      });
    }

    if (!found) {
      yield snapshot(state, {
        codeLine: 10,
        caption: 'La lista queda igual.',
        tone: 'warning',
      });
      return state;
    }

    if (node(state, currentId).next === currentId) {
      state.head = null;
      yield snapshot(state, {
        codeLine: 11,
        caption: `${value} era el único nodo: la lista queda vacía.`,
        ghosts: [currentId],
      });
      detach(state, currentId);
      normalize(state);
      yield snapshot(state, { codeLine: 13, caption: `${value} sale de servicio.`, tone: 'success' });
      return state;
    }

    if (currentId === state.head) {
      state.head = node(state, currentId).next;
      yield snapshot(state, {
        codeLine: 12,
        caption: `${value} era la cabeza: la cabeza pasa a ${node(state, state.head as NodeId).value}.`,
        marks: [headMark(state), mark('previo', prevId, 'aux'), mark('objetivo', currentId, 'cursor')],
        ghosts: [currentId],
      });
    }

    node(state, prevId).next = node(state, currentId).next;
    yield snapshot(state, {
      codeLine: 13,
      caption: `${node(state, prevId).value} salta por encima de ${value} y el círculo se cierra otra vez.`,
      marks: [headMark(state), mark('previo', prevId, 'aux')],
      activeLinks: [prevId],
      ghosts: [currentId],
    });

    detach(state, currentId);
    normalize(state);
    yield snapshot(state, { codeLine: 13, caption: `${value} sale de servicio.`, tone: 'success' });
    return state;
  },
};

const search: OperationDef = {
  id: 'search',
  label: 'Buscar',
  group: 'consultar',
  complexity: 'O(n)',
  note: 'Sin la guarda «hasta actual = cabeza», buscar un valor ausente daría vueltas para siempre.',
  args: [{ key: 'value', label: 'Valor', min: 0, max: 999, default: 41 }],
  code: [
    'buscar(valor)',
    '  si cabeza = ∅ entonces devolver −1',
    '  actual ← cabeza;  i ← 0',
    '  repetir',
    '    si actual.valor = valor entonces devolver i',
    '    actual ← actual.siguiente;  i ← i + 1',
    '  hasta actual = cabeza',
    '  devolver −1',
  ],
  *run(state, args): Generator<Frame, ListState> {
    const value = args.value;
    yield snapshot(state, { codeLine: 0, caption: `Buscar ${value} dando como máximo una vuelta.` });

    if (!state.head) {
      yield snapshot(state, { codeLine: 1, caption: 'La lista está vacía.', tone: 'warning' });
      return state;
    }

    let currentId = state.head as NodeId;
    let i = 0;
    yield snapshot(state, {
      codeLine: 2,
      caption: 'actual empieza en la cabeza.',
      marks: [headMark(state), mark('actual', currentId, 'cursor')],
      activeNodes: [currentId],
    });

    for (;;) {
      if (node(state, currentId).value === value) {
        yield snapshot(state, {
          codeLine: 4,
          caption: `Encontrado: ${value} está a ${i} ${i === 1 ? 'salto' : 'saltos'} de la cabeza.`,
          marks: [headMark(state), mark('actual', currentId, 'cursor')],
          activeNodes: [currentId],
          tone: 'success',
        });
        return state;
      }
      yield snapshot(state, {
        codeLine: 4,
        caption: `${node(state, currentId).value} no es ${value}.`,
        marks: [headMark(state), mark('actual', currentId, 'cursor')],
        activeNodes: [currentId],
      });

      const prevId = currentId;
      currentId = node(state, currentId).next as NodeId;
      i += 1;

      if (currentId === state.head) {
        yield snapshot(state, {
          codeLine: 6,
          caption: `actual volvió a la cabeza tras ${i} ${i === 1 ? 'salto' : 'saltos'}: la vuelta está completa y ${value} no está en la lista.`,
          marks: [headMark(state), mark('actual', currentId, 'cursor')],
          activeLinks: [prevId],
          tone: 'warning',
        });
        return state;
      }

      yield snapshot(state, {
        codeLine: 5,
        caption: `actual avanza a ${node(state, currentId).value}.`,
        marks: [headMark(state), mark('actual', currentId, 'cursor')],
        activeNodes: [currentId],
        activeLinks: [prevId],
      });
    }
  },
};

const traverse: OperationDef = {
  id: 'traverse',
  label: 'Recorrer vueltas',
  group: 'consultar',
  complexity: 'O(n · vueltas)',
  note: 'El recorrido no termina solo: se detiene cuando se cuentan las vueltas pedidas.',
  args: [{ key: 'laps', label: 'Vueltas', min: 1, max: 5, default: 2 }],
  code: [
    'recorrer(vueltas)',
    '  si cabeza = ∅ entonces terminar',
    '  actual ← cabeza;  v ← 0',
    '  mientras v < vueltas hacer',
    '    visitar(actual.valor)',
    '    actual ← actual.siguiente',
    '    si actual = cabeza entonces v ← v + 1',
  ],
  *run(state, args): Generator<Frame, ListState> {
    const laps = Math.max(1, Math.round(args.laps));
    yield snapshot(state, { codeLine: 0, caption: `Recorrer ${laps} ${laps === 1 ? 'vuelta' : 'vueltas'} completas.` });

    if (!state.head) {
      yield snapshot(state, { codeLine: 1, caption: 'La lista está vacía.', tone: 'warning' });
      return state;
    }

    let currentId = state.head as NodeId;
    let lap = 0;
    let visits = 0;
    yield snapshot(state, {
      codeLine: 2,
      caption: 'El recorrido arranca en la cabeza.',
      marks: [headMark(state), mark('actual', currentId, 'cursor')],
      activeNodes: [currentId],
    });

    while (lap < laps) {
      visits += 1;
      yield snapshot(state, {
        codeLine: 4,
        caption: `Vuelta ${lap + 1} · salto ${visits}: ${node(state, currentId).value}.`,
        marks: [headMark(state), mark('actual', currentId, 'cursor')],
        activeNodes: [currentId],
      });

      const prevId = currentId;
      currentId = node(state, currentId).next as NodeId;
      if (currentId === state.head) {
        lap += 1;
        yield snapshot(state, {
          codeLine: 6,
          caption: lap < laps
            ? `De vuelta en la cabeza: van ${lap} ${lap === 1 ? 'vuelta' : 'vueltas'}. El recorrido sigue.`
            : `De vuelta en la cabeza: ${lap} ${lap === 1 ? 'vuelta' : 'vueltas'} completas.`,
          marks: [headMark(state), mark('actual', currentId, 'cursor')],
          activeNodes: [currentId],
          activeLinks: [prevId],
        });
      } else {
        yield snapshot(state, {
          codeLine: 5,
          caption: `actual avanza a ${node(state, currentId).value}.`,
          marks: [headMark(state), mark('actual', currentId, 'cursor')],
          activeNodes: [currentId],
          activeLinks: [prevId],
        });
      }
    }

    yield snapshot(state, {
      codeLine: 3,
      caption: `Recorrido terminado: ${visits} saltos en ${laps} ${laps === 1 ? 'vuelta' : 'vueltas'}. Sin el contador, el recorrido no terminaría nunca.`,
      marks: [headMark(state), mark('actual', currentId, 'cursor')],
      tone: 'success',
    });
    return state;
  },
};

export const circularOperations: OperationDef[] = [
  insertHead,
  insertTail,
  deleteHead,
  deleteAt,
  deleteValue,
  search,
  traverse,
  floyd,
];
