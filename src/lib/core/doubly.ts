import { createNode, detach, endMarks, mark, node, normalize, size, snapshot } from './list-state';
import type { Frame, ListState, NodeId, OperationDef } from './types';

/**
 * Operaciones de la lista doblemente ligada. Cada nodo guarda `previo` además de
 * `siguiente`, y la estructura mantiene un puntero a la cola. Eso cambia tres cosas:
 * se puede recorrer hacia atrás, insertar y eliminar al final cuesta O(1), y
 * desenlazar un nodo ya encontrado también — a cambio, cada cambio hay que hacerlo
 * en los dos sentidos, que es donde se cometen los errores.
 */

/** El nodo anterior o `null`; en esta estructura `prev` siempre está definido. */
function prevOf(state: ListState, id: NodeId): NodeId | null {
  return node(state, id).prev ?? null;
}

/**
 * Desenlaza un nodo cosiendo a sus dos vecinos y emite un fotograma por costura.
 * Las cuatro ramas son las cuatro formas de equivocarse: olvidar la cabeza, olvidar
 * la cola, o dejar a medias uno de los dos sentidos.
 */
function* unlink(state: ListState, targetId: NodeId): Generator<Frame, void> {
  const targetValue = node(state, targetId).value;
  const before = prevOf(state, targetId);
  const after = node(state, targetId).next;

  if (before) {
    node(state, before).next = after;
    yield snapshot(state, {
      codeLine: 5,
      caption: `${node(state, before).value} salta por encima de ${targetValue} y se enlaza con lo que venía después.`,
      marks: [...endMarks(state), mark('objetivo', targetId, 'cursor')],
      activeLinks: [before],
      ghosts: [targetId],
    });
  } else {
    state.head = after;
    yield snapshot(state, {
      codeLine: 6,
      caption: `${targetValue} no tenía anterior: era la cabeza, así que la cabeza avanza.`,
      marks: [...endMarks(state), mark('objetivo', targetId, 'cursor')],
      ghosts: [targetId],
    });
  }

  if (after) {
    node(state, after).prev = before;
    yield snapshot(state, {
      codeLine: 7,
      caption: before
        ? `Y el enlace de vuelta: ${node(state, after).value} ahora apunta hacia atrás a ${node(state, before).value}.`
        : `Y el enlace de vuelta: ${node(state, after).value} pasa a ser el primero, así que su previo es ∅.`,
      marks: [...endMarks(state), mark('objetivo', targetId, 'cursor')],
      activePrevLinks: [after],
      ghosts: [targetId],
    });
  } else {
    state.tail = before;
    yield snapshot(state, {
      codeLine: 8,
      caption: `${targetValue} no tenía siguiente: era la cola, así que la cola retrocede.`,
      marks: [...endMarks(state), mark('objetivo', targetId, 'cursor')],
      ghosts: [targetId],
    });
  }

  detach(state, targetId);
  normalize(state);
  yield snapshot(state, { codeLine: 9, caption: `${targetValue} sale de servicio.`, tone: 'success' });
}

const insertHead: OperationDef = {
  id: 'insert-head',
  label: 'Insertar al inicio',
  group: 'insertar',
  complexity: 'O(1)',
  note: 'Dos enlaces en vez de uno: el nodo nuevo apunta a la vieja cabeza y ella le devuelve el apunte.',
  args: [{ key: 'value', label: 'Valor', min: 0, max: 999, default: 42 }],
  code: [
    'insertarAlInicio(valor)',
    '  nuevo ← Nodo(valor)',
    '  nuevo.siguiente ← cabeza',
    '  si cabeza ≠ ∅ entonces cabeza.previo ← nuevo',
    '  si no cola ← nuevo',
    '  cabeza ← nuevo',
  ],
  *run(state, args): Generator<Frame, ListState> {
    const value = args.value;
    yield snapshot(state, { codeLine: 0, caption: `Insertar ${value} al inicio, enlazando en los dos sentidos.` });

    const fresh = createNode(state, value);
    state.order.unshift(fresh.id);
    const newMark = mark('nuevo', fresh.id, 'new');
    yield snapshot(state, {
      codeLine: 1,
      caption: `Se crea el nodo ${value}, con los dos enlaces todavía en ∅.`,
      marks: [...endMarks(state), newMark],
      activeNodes: [fresh.id],
    });

    const oldHead = state.head;
    fresh.next = oldHead;
    yield snapshot(state, {
      codeLine: 2,
      caption: oldHead
        ? `Hacia adelante: ${value} apunta a la cabeza actual.`
        : 'La lista estaba vacía, así que el siguiente del nodo nuevo es ∅.',
      marks: [...endMarks(state), newMark],
      activeLinks: [fresh.id],
    });

    if (oldHead) {
      node(state, oldHead).prev = fresh.id;
      yield snapshot(state, {
        codeLine: 3,
        caption: `Hacia atrás: ${node(state, oldHead).value} ahora sabe quién la precede. Este es el paso que no existe en una lista simple, y el que más se olvida.`,
        marks: [...endMarks(state), newMark],
        activePrevLinks: [oldHead],
      });
    } else {
      state.tail = fresh.id;
      yield snapshot(state, {
        codeLine: 4,
        caption: `${value} es el único nodo: es a la vez cabeza y cola.`,
        marks: [...endMarks(state), newMark],
        activeNodes: [fresh.id],
      });
    }

    state.head = fresh.id;
    normalize(state);
    yield snapshot(state, {
      codeLine: 5,
      caption: `La cabeza pasa a ser ${value}.`,
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
  complexity: 'O(1)',
  note: 'Aquí está la ganancia: con puntero a la cola no hay que recorrer nada. En la lista simple esto costaba O(n).',
  args: [{ key: 'value', label: 'Valor', min: 0, max: 999, default: 8 }],
  code: [
    'insertarAlFinal(valor)',
    '  nuevo ← Nodo(valor)',
    '  si cola = ∅ entonces cabeza ← nuevo;  cola ← nuevo;  terminar',
    '  nuevo.previo ← cola',
    '  cola.siguiente ← nuevo',
    '  cola ← nuevo',
  ],
  *run(state, args): Generator<Frame, ListState> {
    const value = args.value;
    yield snapshot(state, {
      codeLine: 0,
      caption: `Insertar ${value} al final. La cola dice dónde está el último sin recorrer nada.`,
    });

    const fresh = createNode(state, value);
    state.order.push(fresh.id);
    const newMark = mark('nuevo', fresh.id, 'new');
    yield snapshot(state, {
      codeLine: 1,
      caption: `Se crea el nodo ${value}, con los dos enlaces todavía en ∅.`,
      marks: [...endMarks(state), newMark],
      activeNodes: [fresh.id],
    });

    const oldTail = state.tail ?? null;
    if (!oldTail) {
      state.head = fresh.id;
      state.tail = fresh.id;
      normalize(state);
      yield snapshot(state, {
        codeLine: 2,
        caption: `La lista estaba vacía: ${value} es a la vez cabeza y cola.`,
        activeNodes: [fresh.id],
        tone: 'success',
      });
      return state;
    }

    fresh.prev = oldTail;
    yield snapshot(state, {
      codeLine: 3,
      caption: `Hacia atrás: ${value} apunta a ${node(state, oldTail).value}, que hasta ahora era el último.`,
      marks: [...endMarks(state), newMark],
      activePrevLinks: [fresh.id],
    });

    node(state, oldTail).next = fresh.id;
    yield snapshot(state, {
      codeLine: 4,
      caption: `Hacia adelante: ${node(state, oldTail).value} deja de apuntar a ∅ y apunta a ${value}.`,
      marks: [...endMarks(state), newMark],
      activeLinks: [oldTail],
    });

    state.tail = fresh.id;
    normalize(state);
    yield snapshot(state, {
      codeLine: 5,
      caption: `La cola pasa a ser ${value}. Tres asignaciones y ni un solo paso de recorrido.`,
      activeNodes: [fresh.id],
      tone: 'success',
    });
    return state;
  },
};

const insertAt: OperationDef = {
  id: 'insert-at',
  label: 'Insertar en posición',
  group: 'insertar',
  complexity: 'O(n)',
  note: 'Llegar cuesta O(n); una vez ahí, coser el nodo entre sus dos vecinos son cuatro asignaciones.',
  args: [
    { key: 'index', label: 'Posición', hint: 'desde 0', min: 0, max: 20, default: 2 },
    { key: 'value', label: 'Valor', min: 0, max: 999, default: 55 },
  ],
  code: [
    'insertarEn(posicion, valor)',
    '  si posicion = 0 entonces insertarAlInicio(valor); terminar',
    '  actual ← cabeza;  i ← 0',
    '  mientras i < posicion y actual ≠ ∅ hacer',
    '    actual ← actual.siguiente;  i ← i + 1',
    '  si actual = ∅ entonces insertarAlFinal(valor); terminar',
    '  nuevo ← Nodo(valor)',
    '  nuevo.previo ← actual.previo;  nuevo.siguiente ← actual',
    '  actual.previo.siguiente ← nuevo',
    '  actual.previo ← nuevo',
  ],
  *run(state, args): Generator<Frame, ListState> {
    const index = Math.trunc(args.index);
    const value = args.value;
    yield snapshot(state, { codeLine: 0, caption: `Insertar ${value} en la posición ${index}.` });

    if (index <= 0 || !state.head) {
      const fresh = createNode(state, value);
      state.order.unshift(fresh.id);
      fresh.next = state.head;
      if (state.head) node(state, state.head).prev = fresh.id;
      else state.tail = fresh.id;
      state.head = fresh.id;
      normalize(state);
      yield snapshot(state, {
        codeLine: 1,
        caption: state.order.length === 1
          ? `La lista estaba vacía: ${value} es cabeza y cola.`
          : 'La posición 0 es el caso de insertar al inicio.',
        activeNodes: [fresh.id],
        tone: 'success',
      });
      return state;
    }

    let currentId: NodeId | null = state.head;
    let i = 0;
    yield snapshot(state, {
      codeLine: 2,
      caption: 'actual empieza en la cabeza y avanza hasta la posición pedida: el nodo nuevo se pondrá justo antes.',
      marks: [...endMarks(state), mark('actual', currentId, 'cursor')],
      activeNodes: [currentId],
    });

    while (i < index && currentId) {
      currentId = node(state, currentId).next;
      i += 1;
      yield snapshot(state, {
        codeLine: 4,
        caption: currentId
          ? `actual avanza a ${node(state, currentId).value} (posición ${i}).`
          : 'actual llega a ∅: la posición pedida está más allá del final.',
        marks: [...endMarks(state), mark('actual', currentId, 'cursor')],
        activeNodes: currentId ? [currentId] : [],
      });
    }

    if (!currentId) {
      const oldTail = state.tail as NodeId;
      const fresh = createNode(state, value);
      state.order.push(fresh.id);
      fresh.prev = oldTail;
      node(state, oldTail).next = fresh.id;
      state.tail = fresh.id;
      normalize(state);
      yield snapshot(state, {
        codeLine: 5,
        caption: `La lista se acabó antes de la posición ${index}: ${value} se inserta al final.`,
        activeNodes: [fresh.id],
        activeLinks: [oldTail],
        tone: 'warning',
      });
      return state;
    }

    const beforeId = prevOf(state, currentId) as NodeId;
    const fresh = createNode(state, value);
    state.order.splice(state.order.indexOf(currentId), 0, fresh.id);
    const newMark = mark('nuevo', fresh.id, 'new');
    yield snapshot(state, {
      codeLine: 6,
      caption: `Se crea el nodo ${value} entre ${node(state, beforeId).value} y ${node(state, currentId).value}.`,
      marks: [...endMarks(state), mark('actual', currentId, 'cursor'), newMark],
      activeNodes: [fresh.id],
    });

    fresh.prev = beforeId;
    fresh.next = currentId;
    yield snapshot(state, {
      codeLine: 7,
      caption: 'Primero el nodo nuevo mira a sus dos vecinos. Ellos todavía no lo conocen.',
      marks: [...endMarks(state), mark('actual', currentId, 'cursor'), newMark],
      activeLinks: [fresh.id],
      activePrevLinks: [fresh.id],
    });

    node(state, beforeId).next = fresh.id;
    yield snapshot(state, {
      codeLine: 8,
      caption: `${node(state, beforeId).value} deja de apuntar a ${node(state, currentId).value} y apunta a ${value}.`,
      marks: [...endMarks(state), mark('actual', currentId, 'cursor'), newMark],
      activeLinks: [beforeId],
    });

    node(state, currentId).prev = fresh.id;
    normalize(state);
    yield snapshot(state, {
      codeLine: 9,
      caption: `Y el enlace de vuelta: ${node(state, currentId).value} ahora apunta hacia atrás a ${value}. Cuatro asignaciones para un solo nodo.`,
      activeNodes: [fresh.id],
      activePrevLinks: [currentId],
      tone: 'success',
    });
    return state;
  },
};

const deleteHead: OperationDef = {
  id: 'delete-head',
  label: 'Eliminar al inicio',
  group: 'eliminar',
  complexity: 'O(1)',
  note: 'La cabeza avanza y el nuevo primero se queda sin anterior.',
  args: [],
  code: [
    'eliminarAlInicio()',
    '  si cabeza = ∅ entonces terminar',
    '  objetivo ← cabeza',
    '  cabeza ← cabeza.siguiente',
    '  si cabeza ≠ ∅ entonces cabeza.previo ← ∅',
    '  si no cola ← ∅',
    '  liberar(objetivo)',
  ],
  *run(state): Generator<Frame, ListState> {
    yield snapshot(state, { codeLine: 0, caption: 'Eliminar el primer nodo.' });

    if (!state.head) {
      yield snapshot(state, { codeLine: 1, caption: 'La lista está vacía: no hay nada que eliminar.', tone: 'warning' });
      return state;
    }

    const targetId = state.head;
    const targetValue = node(state, targetId).value;
    yield snapshot(state, {
      codeLine: 2,
      caption: `Se guarda una referencia a ${targetValue} antes de mover la cabeza.`,
      marks: [...endMarks(state), mark('objetivo', targetId, 'cursor')],
      activeNodes: [targetId],
    });

    state.head = node(state, targetId).next;
    yield snapshot(state, {
      codeLine: 3,
      caption: state.head
        ? `La cabeza salta a ${node(state, state.head).value}.`
        : `La cabeza pasa a ∅: ${targetValue} era el único nodo.`,
      marks: [...endMarks(state), mark('objetivo', targetId, 'cursor')],
      ghosts: [targetId],
    });

    if (state.head) {
      node(state, state.head).prev = null;
      yield snapshot(state, {
        codeLine: 4,
        caption: `${node(state, state.head).value} ya no tiene anterior: su previo pasa a ∅. Sin este paso quedaría apuntando a un nodo liberado.`,
        marks: [...endMarks(state), mark('objetivo', targetId, 'cursor')],
        activePrevLinks: [state.head],
        ghosts: [targetId],
      });
    } else {
      state.tail = null;
      yield snapshot(state, {
        codeLine: 5,
        caption: 'La cola también pasa a ∅: la lista queda vacía.',
        ghosts: [targetId],
      });
    }

    detach(state, targetId);
    normalize(state);
    yield snapshot(state, { codeLine: 6, caption: `${targetValue} sale de servicio.`, tone: 'success' });
    return state;
  },
};

const deleteTail: OperationDef = {
  id: 'delete-tail',
  label: 'Eliminar al final',
  group: 'eliminar',
  complexity: 'O(1)',
  note: 'La cola da el último nodo y el nodo da su anterior. En la lista simple había que recorrerla entera.',
  args: [],
  code: [
    'eliminarAlFinal()',
    '  si cola = ∅ entonces terminar',
    '  objetivo ← cola',
    '  cola ← cola.previo',
    '  si cola ≠ ∅ entonces cola.siguiente ← ∅',
    '  si no cabeza ← ∅',
    '  liberar(objetivo)',
  ],
  *run(state): Generator<Frame, ListState> {
    yield snapshot(state, { codeLine: 0, caption: 'Eliminar el último nodo.' });

    if (!state.tail) {
      yield snapshot(state, { codeLine: 1, caption: 'La lista está vacía: no hay nada que eliminar.', tone: 'warning' });
      return state;
    }

    const targetId = state.tail;
    const targetValue = node(state, targetId).value;
    yield snapshot(state, {
      codeLine: 2,
      caption: `La cola señala a ${targetValue} directamente: no hubo que recorrer nada para llegar.`,
      marks: [...endMarks(state), mark('objetivo', targetId, 'cursor')],
      activeNodes: [targetId],
    });

    state.tail = prevOf(state, targetId);
    yield snapshot(state, {
      codeLine: 3,
      caption: state.tail
        ? `La cola retrocede a ${node(state, state.tail).value}, que el propio nodo sabía quién era.`
        : `La cola pasa a ∅: ${targetValue} era el único nodo.`,
      marks: [...endMarks(state), mark('objetivo', targetId, 'cursor')],
      ghosts: [targetId],
    });

    if (state.tail) {
      node(state, state.tail).next = null;
      yield snapshot(state, {
        codeLine: 4,
        caption: `${node(state, state.tail).value} pasa a ser el último: su siguiente es ∅.`,
        marks: [...endMarks(state), mark('objetivo', targetId, 'cursor')],
        activeLinks: [state.tail],
        ghosts: [targetId],
      });
    } else {
      state.head = null;
      yield snapshot(state, {
        codeLine: 5,
        caption: 'La cabeza también pasa a ∅: la lista queda vacía.',
        ghosts: [targetId],
      });
    }

    detach(state, targetId);
    normalize(state);
    yield snapshot(state, { codeLine: 6, caption: `${targetValue} sale de servicio.`, tone: 'success' });
    return state;
  },
};

const deleteAt: OperationDef = {
  id: 'delete-at',
  label: 'Eliminar por posición',
  group: 'eliminar',
  complexity: 'O(n)',
  note: 'Llegar cuesta O(n), pero desenlazar es O(1): el nodo ya sabe quién va antes y quién después.',
  args: [{ key: 'index', label: 'Posición', hint: 'desde 0', min: 0, max: 20, default: 1 }],
  code: [
    'eliminarEn(posicion)',
    '  actual ← cabeza;  i ← 0',
    '  mientras i < posicion y actual ≠ ∅ hacer',
    '    actual ← actual.siguiente;  i ← i + 1',
    '  si actual = ∅ entonces terminar',
    '  si actual.previo ≠ ∅ entonces actual.previo.siguiente ← actual.siguiente',
    '  si no cabeza ← actual.siguiente',
    '  si actual.siguiente ≠ ∅ entonces actual.siguiente.previo ← actual.previo',
    '  si no cola ← actual.previo',
    '  liberar(actual)',
  ],
  *run(state, args): Generator<Frame, ListState> {
    const index = Math.trunc(args.index);
    yield snapshot(state, { codeLine: 0, caption: `Eliminar el nodo de la posición ${index}.` });

    let currentId: NodeId | null = state.head;
    let i = 0;
    yield snapshot(state, {
      codeLine: 1,
      caption: 'actual empieza en la cabeza.',
      marks: [...endMarks(state), mark('actual', currentId, 'cursor')],
      activeNodes: currentId ? [currentId] : [],
    });

    while (i < index && currentId) {
      currentId = node(state, currentId).next;
      i += 1;
      yield snapshot(state, {
        codeLine: 3,
        caption: currentId
          ? `actual avanza a ${node(state, currentId).value} (posición ${i}).`
          : 'actual llega a ∅.',
        marks: [...endMarks(state), mark('actual', currentId, 'cursor')],
        activeNodes: currentId ? [currentId] : [],
      });
    }

    if (!currentId) {
      const total = size(state);
      yield snapshot(state, {
        codeLine: 4,
        caption: `La lista tiene ${total} ${total === 1 ? 'nodo' : 'nodos'}: la posición ${index} no existe.`,
        tone: 'warning',
      });
      return state;
    }

    yield snapshot(state, {
      codeLine: 4,
      caption: `En la posición ${index} está ${node(state, currentId).value}. Desde aquí no hace falta volver a recorrer: el nodo conoce a sus dos vecinos.`,
      marks: [...endMarks(state), mark('actual', currentId, 'cursor')],
      activeNodes: [currentId],
    });

    yield* unlink(state, currentId);
    return state;
  },
};

const deleteValue: OperationDef = {
  id: 'delete-value',
  label: 'Eliminar por valor',
  group: 'eliminar',
  complexity: 'O(n)',
  note: 'No hace falta arrastrar un puntero al anterior: el propio nodo lo lleva encima.',
  args: [{ key: 'value', label: 'Valor', min: 0, max: 999, default: 41 }],
  code: [
    'eliminarPorValor(valor)',
    '  actual ← cabeza',
    '  mientras actual ≠ ∅ y actual.valor ≠ valor hacer',
    '    actual ← actual.siguiente',
    '  si actual = ∅ entonces terminar',
    '  si actual.previo ≠ ∅ entonces actual.previo.siguiente ← actual.siguiente',
    '  si no cabeza ← actual.siguiente',
    '  si actual.siguiente ≠ ∅ entonces actual.siguiente.previo ← actual.previo',
    '  si no cola ← actual.previo',
    '  liberar(actual)',
  ],
  *run(state, args): Generator<Frame, ListState> {
    const value = args.value;
    yield snapshot(state, { codeLine: 0, caption: `Eliminar el primer nodo con valor ${value}.` });

    let currentId: NodeId | null = state.head;
    yield snapshot(state, {
      codeLine: 1,
      caption: 'actual empieza en la cabeza.',
      marks: [...endMarks(state), mark('actual', currentId, 'cursor')],
      activeNodes: currentId ? [currentId] : [],
    });

    while (currentId && node(state, currentId).value !== value) {
      yield snapshot(state, {
        codeLine: 2,
        caption: `${node(state, currentId).value} no es ${value}.`,
        marks: [...endMarks(state), mark('actual', currentId, 'cursor')],
        activeNodes: [currentId],
      });
      currentId = node(state, currentId).next;
      yield snapshot(state, {
        codeLine: 3,
        caption: currentId ? `actual avanza a ${node(state, currentId).value}.` : 'actual llega a ∅.',
        marks: [...endMarks(state), mark('actual', currentId, 'cursor')],
        activeNodes: currentId ? [currentId] : [],
      });
    }

    if (!currentId) {
      yield snapshot(state, {
        codeLine: 4,
        caption: `${value} no está en la lista: la lista queda igual.`,
        tone: 'warning',
      });
      return state;
    }

    yield snapshot(state, {
      codeLine: 4,
      caption: `Encontrado ${value}. Aquí se ve la diferencia: no hubo que arrastrar un puntero al anterior, el nodo ya lo tiene.`,
      marks: [...endMarks(state), mark('actual', currentId, 'cursor')],
      activeNodes: [currentId],
    });

    yield* unlink(state, currentId);
    return state;
  },
};

const search: OperationDef = {
  id: 'search',
  label: 'Buscar',
  group: 'consultar',
  complexity: 'O(n)',
  note: 'Tener dos enlaces no da acceso directo: sigue habiendo que pasar por todos los anteriores.',
  args: [{ key: 'value', label: 'Valor', min: 0, max: 999, default: 41 }],
  code: [
    'buscar(valor)',
    '  actual ← cabeza;  i ← 0',
    '  mientras actual ≠ ∅ hacer',
    '    si actual.valor = valor entonces devolver i',
    '    actual ← actual.siguiente;  i ← i + 1',
    '  devolver −1',
  ],
  *run(state, args): Generator<Frame, ListState> {
    const value = args.value;
    yield snapshot(state, { codeLine: 0, caption: `Buscar ${value} desde la cabeza.` });

    let currentId: NodeId | null = state.head;
    let i = 0;
    yield snapshot(state, {
      codeLine: 1,
      caption: 'actual empieza en la cabeza.',
      marks: [...endMarks(state), mark('actual', currentId, 'cursor')],
      activeNodes: currentId ? [currentId] : [],
    });

    while (currentId) {
      const current = node(state, currentId);
      if (current.value === value) {
        yield snapshot(state, {
          codeLine: 3,
          caption: `Encontrado: ${value} está en la posición ${i}.`,
          marks: [...endMarks(state), mark('actual', currentId, 'cursor')],
          activeNodes: [currentId],
          tone: 'success',
        });
        return state;
      }
      yield snapshot(state, {
        codeLine: 3,
        caption: `${current.value} no es ${value}.`,
        marks: [...endMarks(state), mark('actual', currentId, 'cursor')],
        activeNodes: [currentId],
      });
      currentId = current.next;
      i += 1;
      yield snapshot(state, {
        codeLine: 4,
        caption: currentId ? `actual avanza a ${node(state, currentId).value}.` : 'actual llega a ∅.',
        marks: [...endMarks(state), mark('actual', currentId, 'cursor')],
        activeNodes: currentId ? [currentId] : [],
        activeLinks: [current.id],
      });
    }

    yield snapshot(state, {
      codeLine: 5,
      caption: `${value} no está en la lista: se recorrieron todos los nodos hasta ∅.`,
      marks: [...endMarks(state), mark('actual', null, 'cursor')],
      tone: 'warning',
    });
    return state;
  },
};

const traverse: OperationDef = {
  id: 'traverse',
  label: 'Recorrer',
  group: 'consultar',
  complexity: 'O(n)',
  note: 'El recorrido de siempre, siguiendo el carril de arriba.',
  args: [],
  code: [
    'recorrer()',
    '  actual ← cabeza',
    '  mientras actual ≠ ∅ hacer',
    '    visitar(actual.valor)',
    '    actual ← actual.siguiente',
  ],
  *run(state): Generator<Frame, ListState> {
    yield snapshot(state, { codeLine: 0, caption: 'Recorrer la lista de la cabeza a la cola.' });

    let currentId: NodeId | null = state.head;
    const visited: number[] = [];
    yield snapshot(state, {
      codeLine: 1,
      caption: 'actual empieza en la cabeza.',
      marks: [...endMarks(state), mark('actual', currentId, 'cursor')],
      activeNodes: currentId ? [currentId] : [],
    });

    while (currentId) {
      const current = node(state, currentId);
      visited.push(current.value);
      yield snapshot(state, {
        codeLine: 3,
        caption: `Visitados: ${visited.join(' · ')}`,
        marks: [...endMarks(state), mark('actual', currentId, 'cursor')],
        activeNodes: [currentId],
      });
      currentId = current.next;
      yield snapshot(state, {
        codeLine: 4,
        caption: currentId ? `actual avanza a ${node(state, currentId).value}.` : 'actual llega a ∅: se acabó la lista.',
        marks: [...endMarks(state), mark('actual', currentId, 'cursor')],
        activeNodes: currentId ? [currentId] : [],
        activeLinks: [current.id],
      });
    }

    yield snapshot(state, {
      codeLine: 2,
      caption: visited.length
        ? `Recorrido completo: ${visited.join(' · ')}.`
        : 'La lista está vacía: el recorrido termina antes de empezar.',
      marks: [...endMarks(state), mark('actual', null, 'cursor')],
      tone: visited.length ? 'success' : 'warning',
    });
    return state;
  },
};

const traverseBack: OperationDef = {
  id: 'traverse-back',
  label: 'Recorrer al revés',
  group: 'consultar',
  complexity: 'O(n)',
  note: 'Esta es la razón de ser de la lista doble: sin enlaces de vuelta habría que empezar desde la cabeza en cada paso.',
  args: [],
  code: [
    'recorrerAlReves()',
    '  actual ← cola',
    '  mientras actual ≠ ∅ hacer',
    '    visitar(actual.valor)',
    '    actual ← actual.previo',
  ],
  *run(state): Generator<Frame, ListState> {
    yield snapshot(state, { codeLine: 0, caption: 'Recorrer la lista de la cola a la cabeza, por el carril de abajo.' });

    let currentId: NodeId | null = state.tail ?? null;
    const visited: number[] = [];
    yield snapshot(state, {
      codeLine: 1,
      caption: 'actual empieza en la cola. Llegar aquí no costó nada: la estructura mantiene el puntero.',
      marks: [...endMarks(state), mark('actual', currentId, 'cursor')],
      activeNodes: currentId ? [currentId] : [],
    });

    while (currentId) {
      const current = node(state, currentId);
      visited.push(current.value);
      yield snapshot(state, {
        codeLine: 3,
        caption: `Visitados: ${visited.join(' · ')}`,
        marks: [...endMarks(state), mark('actual', currentId, 'cursor')],
        activeNodes: [currentId],
      });
      const previous: NodeId | null = current.prev ?? null;
      yield snapshot(state, {
        codeLine: 4,
        caption: previous
          ? `actual retrocede a ${node(state, previous).value}.`
          : 'actual llega a ∅: se acabó la lista por el otro extremo.',
        marks: [...endMarks(state), mark('actual', previous, 'cursor')],
        activeNodes: previous ? [previous] : [],
        activePrevLinks: [current.id],
      });
      currentId = previous;
    }

    yield snapshot(state, {
      codeLine: 2,
      caption: visited.length
        ? `Recorrido al revés completo: ${visited.join(' · ')}.`
        : 'La lista está vacía.',
      marks: [...endMarks(state), mark('actual', null, 'cursor')],
      tone: visited.length ? 'success' : 'warning',
    });
    return state;
  },
};

const reverse: OperationDef = {
  id: 'reverse',
  label: 'Invertir',
  group: 'consultar',
  complexity: 'O(n)',
  note: 'No hay que rehacer enlaces: basta con intercambiar los dos que cada nodo ya tiene.',
  args: [],
  code: [
    'invertir()',
    '  actual ← cabeza',
    '  mientras actual ≠ ∅ hacer',
    '    intercambiar(actual.previo, actual.siguiente)',
    '    actual ← actual.previo',
    '  intercambiar(cabeza, cola)',
  ],
  *run(state): Generator<Frame, ListState> {
    yield snapshot(state, {
      codeLine: 0,
      caption: 'Invertir la lista intercambiando los dos enlaces de cada nodo.',
    });

    let currentId: NodeId | null = state.head;
    yield snapshot(state, {
      codeLine: 1,
      caption: 'actual empieza en la cabeza.',
      marks: [...endMarks(state), mark('actual', currentId, 'cursor')],
      activeNodes: currentId ? [currentId] : [],
    });

    while (currentId) {
      const current = node(state, currentId);
      const forward = current.next;
      current.next = current.prev ?? null;
      current.prev = forward;
      yield snapshot(state, {
        codeLine: 3,
        caption: `${current.value} intercambia sus dos enlaces: lo que miraba adelante ahora mira atrás.`,
        marks: [...endMarks(state), mark('actual', currentId, 'cursor')],
        activeNodes: [currentId],
        activeLinks: [currentId],
        activePrevLinks: [currentId],
      });

      currentId = current.prev ?? null;
      yield snapshot(state, {
        codeLine: 4,
        caption: currentId
          ? `actual sigue por el enlace que antes era el siguiente, hasta ${node(state, currentId).value}.`
          : 'actual llega a ∅: no queda nada por intercambiar.',
        marks: [...endMarks(state), mark('actual', currentId, 'cursor')],
        activeNodes: currentId ? [currentId] : [],
      });
    }

    const oldHead = state.head;
    state.head = state.tail ?? null;
    state.tail = oldHead;
    yield snapshot(state, {
      codeLine: 5,
      caption: state.head
        ? `Cabeza y cola se intercambian: ahora la lista empieza en ${node(state, state.head).value}.`
        : 'La lista estaba vacía: no hay nada que invertir.',
      activeNodes: state.head ? [state.head] : [],
    });

    normalize(state);
    yield snapshot(state, {
      codeLine: 5,
      caption: size(state) ? 'La lista se reacomoda: mismos nodos, recorrido al revés.' : 'La lista sigue vacía.',
      tone: 'success',
    });
    return state;
  },
};

export const doublyOperations: OperationDef[] = [
  insertHead,
  insertTail,
  insertAt,
  deleteHead,
  deleteTail,
  deleteAt,
  deleteValue,
  search,
  traverse,
  traverseBack,
  reverse,
];
