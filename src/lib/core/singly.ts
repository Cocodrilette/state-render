import { createNode, detach, headMark, mark, node, normalize, size, snapshot, walk } from './list-state';
import type { Frame, ListState, OperationDef } from './types';

/** Operaciones de la lista simplemente ligada: un solo enlace por nodo y ∅ al final. */

const insertHead: OperationDef = {
  id: 'insert-head',
  label: 'Insertar al inicio',
  group: 'insertar',
  complexity: 'O(1)',
  note: 'No se recorre nada: basta con mover la cabeza.',
  args: [{ key: 'value', label: 'Valor', min: 0, max: 999, default: 42 }],
  code: [
    'insertarAlInicio(valor)',
    '  nuevo ← Nodo(valor)',
    '  nuevo.siguiente ← cabeza',
    '  cabeza ← nuevo',
  ],
  *run(state, args): Generator<Frame, ListState> {
    const value = args.value;
    yield snapshot(state, {
      codeLine: 0,
      caption: `Insertar ${value} al inicio. La cabeza es lo único que hay que mover.`,
    });

    const fresh = createNode(state, value);
    state.order.unshift(fresh.id);
    yield snapshot(state, {
      codeLine: 1,
      caption: `Se crea el nodo ${value}. Todavía no está enlazado a nada.`,
      marks: [headMark(state), mark('nuevo', fresh.id, 'new')],
      activeNodes: [fresh.id],
    });

    fresh.next = state.head;
    yield snapshot(state, {
      codeLine: 2,
      caption: state.head
        ? 'El nodo nuevo apunta a la cabeza actual. El orden importa: al revés se perdería el resto de la lista.'
        : 'La lista estaba vacía, así que el nodo nuevo apunta a ∅.',
      marks: [headMark(state), mark('nuevo', fresh.id, 'new')],
      activeLinks: [fresh.id],
    });

    state.head = fresh.id;
    normalize(state);
    yield snapshot(state, {
      codeLine: 3,
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
  complexity: 'O(n)',
  note: 'No hay puntero al último nodo, así que hay que caminar hasta ∅.',
  args: [{ key: 'value', label: 'Valor', min: 0, max: 999, default: 8 }],
  code: [
    'insertarAlFinal(valor)',
    '  nuevo ← Nodo(valor)',
    '  si cabeza = ∅ entonces cabeza ← nuevo; terminar',
    '  actual ← cabeza',
    '  mientras actual.siguiente ≠ ∅ hacer',
    '    actual ← actual.siguiente',
    '  actual.siguiente ← nuevo',
  ],
  *run(state, args): Generator<Frame, ListState> {
    const value = args.value;
    yield snapshot(state, {
      codeLine: 0,
      caption: `Insertar ${value} al final. Primero hay que llegar hasta el último nodo.`,
    });

    const fresh = createNode(state, value);
    state.order.push(fresh.id);
    const newMark = mark('nuevo', fresh.id, 'new');
    yield snapshot(state, {
      codeLine: 1,
      caption: `Se crea el nodo ${value}, todavía suelto al final de la lista.`,
      marks: [headMark(state), newMark],
      activeNodes: [fresh.id],
    });

    if (!state.head) {
      state.head = fresh.id;
      normalize(state);
      yield snapshot(state, {
        codeLine: 2,
        caption: `La lista estaba vacía: ${value} se convierte en la cabeza.`,
        activeNodes: [fresh.id],
        tone: 'success',
      });
      return state;
    }

    let currentId = state.head;
    yield snapshot(state, {
      codeLine: 3,
      caption: 'El recorrido arranca en la cabeza.',
      marks: [headMark(state), mark('actual', currentId, 'cursor'), newMark],
      activeNodes: [currentId],
    });

    while (node(state, currentId).next !== null) {
      const nextId = node(state, currentId).next as string;
      yield snapshot(state, {
        codeLine: 4,
        caption: `${node(state, currentId).value} todavía apunta a alguien, así que no es el último.`,
        marks: [headMark(state), mark('actual', currentId, 'cursor'), newMark],
        activeNodes: [currentId],
        activeLinks: [currentId],
      });
      currentId = nextId;
      yield snapshot(state, {
        codeLine: 5,
        caption: `actual avanza a ${node(state, currentId).value}.`,
        marks: [headMark(state), mark('actual', currentId, 'cursor'), newMark],
        activeNodes: [currentId],
      });
    }

    node(state, currentId).next = fresh.id;
    normalize(state);
    yield snapshot(state, {
      codeLine: 6,
      caption: `${node(state, currentId).value} apuntaba a ∅: ahora apunta a ${value}, que pasa a cerrar la lista.`,
      activeNodes: [fresh.id],
      activeLinks: [currentId],
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
  note: 'Hay que llegar caminando al nodo anterior; el enlace se hace en dos pasos.',
  args: [
    { key: 'index', label: 'Posición', hint: 'desde 0', min: 0, max: 20, default: 2 },
    { key: 'value', label: 'Valor', min: 0, max: 999, default: 55 },
  ],
  code: [
    'insertarEn(posicion, valor)',
    '  si posicion = 0 entonces insertarAlInicio(valor); terminar',
    '  previo ← cabeza;  i ← 0',
    '  mientras i < posicion − 1 y previo.siguiente ≠ ∅ hacer',
    '    previo ← previo.siguiente;  i ← i + 1',
    '  nuevo ← Nodo(valor)',
    '  nuevo.siguiente ← previo.siguiente',
    '  previo.siguiente ← nuevo',
  ],
  *run(state, args): Generator<Frame, ListState> {
    const { index, value } = args;
    yield snapshot(state, {
      codeLine: 0,
      caption: `Insertar ${value} en la posición ${index}.`,
    });

    if (index <= 0 || !state.head) {
      const fresh = createNode(state, value);
      state.order.unshift(fresh.id);
      fresh.next = state.head;
      state.head = fresh.id;
      normalize(state);
      yield snapshot(state, {
        codeLine: 1,
        caption: state.order.length === 1
          ? `La lista estaba vacía: ${value} se convierte en la cabeza.`
          : 'La posición 0 es el caso de insertar al inicio.',
        activeNodes: [fresh.id],
        tone: 'success',
      });
      return state;
    }

    let prevId = state.head;
    let i = 0;
    yield snapshot(state, {
      codeLine: 2,
      caption: 'previo empieza en la cabeza; hay que dejarlo justo antes de la posición pedida.',
      marks: [headMark(state), mark('previo', prevId, 'aux')],
      activeNodes: [prevId],
    });

    while (i < index - 1 && node(state, prevId).next !== null) {
      prevId = node(state, prevId).next as string;
      i += 1;
      yield snapshot(state, {
        codeLine: 4,
        caption: `previo avanza a ${node(state, prevId).value} (posición ${i}).`,
        marks: [headMark(state), mark('previo', prevId, 'aux')],
        activeNodes: [prevId],
      });
    }

    if (i < index - 1) {
      yield snapshot(state, {
        codeLine: 3,
        caption: `La lista se acabó antes de llegar a la posición ${index}: el nodo se inserta al final.`,
        marks: [headMark(state), mark('previo', prevId, 'aux')],
        activeNodes: [prevId],
        tone: 'warning',
      });
    }

    const fresh = createNode(state, value);
    state.order.splice(state.order.indexOf(prevId) + 1, 0, fresh.id);
    const newMark = mark('nuevo', fresh.id, 'new');
    yield snapshot(state, {
      codeLine: 5,
      caption: `Se crea el nodo ${value} entre los dos nodos.`,
      marks: [headMark(state), mark('previo', prevId, 'aux'), newMark],
      activeNodes: [fresh.id],
    });

    fresh.next = node(state, prevId).next;
    yield snapshot(state, {
      codeLine: 6,
      caption: 'El nodo nuevo se engancha primero a la cola de la lista. Si se hiciera al revés, ese tramo quedaría inalcanzable.',
      marks: [headMark(state), mark('previo', prevId, 'aux'), newMark],
      activeLinks: [fresh.id],
    });

    node(state, prevId).next = fresh.id;
    normalize(state);
    yield snapshot(state, {
      codeLine: 7,
      caption: `${node(state, prevId).value} ahora apunta a ${value}: la lista queda enlazada.`,
      activeNodes: [fresh.id],
      activeLinks: [prevId],
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
  note: 'La cabeza salta al segundo nodo y el primero queda sin referencias.',
  args: [],
  code: [
    'eliminarAlInicio()',
    '  si cabeza = ∅ entonces terminar',
    '  objetivo ← cabeza',
    '  cabeza ← cabeza.siguiente',
    '  liberar(objetivo)',
  ],
  *run(state): Generator<Frame, ListState> {
    yield snapshot(state, { codeLine: 0, caption: 'Eliminar el primer nodo de la lista.' });

    if (!state.head) {
      yield snapshot(state, {
        codeLine: 1,
        caption: 'La lista está vacía: no hay nada que eliminar.',
        tone: 'warning',
      });
      return state;
    }

    const targetId = state.head;
    const targetValue = node(state, targetId).value;
    yield snapshot(state, {
      codeLine: 2,
      caption: `Se guarda una referencia a ${targetValue} antes de mover la cabeza.`,
      marks: [headMark(state), mark('objetivo', targetId, 'cursor')],
      activeNodes: [targetId],
    });

    state.head = node(state, targetId).next;
    yield snapshot(state, {
      codeLine: 3,
      caption: state.head
        ? `La cabeza salta a ${node(state, state.head).value}. ${targetValue} ya no es alcanzable desde la lista.`
        : `La cabeza pasa a ∅: ${targetValue} era el único nodo.`,
      marks: [headMark(state), mark('objetivo', targetId, 'cursor')],
      ghosts: [targetId],
    });

    detach(state, targetId);
    normalize(state);
    yield snapshot(state, {
      codeLine: 4,
      caption: `${targetValue} sale de servicio.`,
      tone: 'success',
    });
    return state;
  },
};

const deleteAt: OperationDef = {
  id: 'delete-at',
  label: 'Eliminar por posición',
  group: 'eliminar',
  complexity: 'O(n)',
  note: 'Saber la posición no ahorra el recorrido: a un nodo solo se llega pasando por todos los anteriores.',
  args: [{ key: 'index', label: 'Posición', hint: 'desde 0', min: 0, max: 20, default: 1 }],
  code: [
    'eliminarEn(posicion)',
    '  si cabeza = ∅ entonces terminar',
    '  si posicion = 0 entonces eliminarAlInicio(); terminar',
    '  previo ← cabeza;  i ← 0',
    '  mientras i < posicion − 1 y previo.siguiente ≠ ∅ hacer',
    '    previo ← previo.siguiente;  i ← i + 1',
    '  si previo.siguiente = ∅ entonces terminar',
    '  objetivo ← previo.siguiente',
    '  previo.siguiente ← objetivo.siguiente',
    '  liberar(objetivo)',
  ],
  *run(state, args): Generator<Frame, ListState> {
    const index = Math.trunc(args.index);
    yield snapshot(state, { codeLine: 0, caption: `Eliminar el nodo de la posición ${index}.` });

    if (!state.head) {
      yield snapshot(state, {
        codeLine: 1,
        caption: 'La lista está vacía: no hay nada que eliminar.',
        tone: 'warning',
      });
      return state;
    }

    if (index <= 0) {
      const targetId = state.head;
      const targetValue = node(state, targetId).value;
      state.head = node(state, targetId).next;
      yield snapshot(state, {
        codeLine: 2,
        caption: `La posición 0 es la cabeza: se elimina moviéndola al siguiente nodo, sin recorrer nada.`,
        marks: [headMark(state), mark('objetivo', targetId, 'cursor')],
        ghosts: [targetId],
      });
      detach(state, targetId);
      normalize(state);
      yield snapshot(state, { codeLine: 9, caption: `${targetValue} sale de servicio.`, tone: 'success' });
      return state;
    }

    let prevId = state.head;
    let i = 0;
    yield snapshot(state, {
      codeLine: 3,
      caption: 'previo empieza en la cabeza; hay que dejarlo justo antes de la posición pedida.',
      marks: [headMark(state), mark('previo', prevId, 'aux')],
      activeNodes: [prevId],
    });

    while (i < index - 1 && node(state, prevId).next !== null) {
      prevId = node(state, prevId).next as string;
      i += 1;
      yield snapshot(state, {
        codeLine: 5,
        caption: `previo avanza a ${node(state, prevId).value} (posición ${i}).`,
        marks: [headMark(state), mark('previo', prevId, 'aux')],
        activeNodes: [prevId],
      });
    }

    if (i < index - 1 || node(state, prevId).next === null) {
      const total = size(state);
      yield snapshot(state, {
        codeLine: 6,
        caption: `Se llegó a ∅: la lista tiene ${total} ${total === 1 ? 'nodo' : 'nodos'} y la posición ${index} no existe.`,
        marks: [headMark(state), mark('previo', prevId, 'aux')],
        tone: 'warning',
      });
      return state;
    }

    const targetId = node(state, prevId).next as string;
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
      caption: `${node(state, prevId).value} salta por encima de ${targetValue} y se enlaza con lo que venía después.`,
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
  note: 'Se camina con el nodo anterior a la vista: sin él no se puede volver a enlazar.',
  args: [{ key: 'value', label: 'Valor', min: 0, max: 999, default: 41 }],
  code: [
    'eliminarPorValor(valor)',
    '  si cabeza = ∅ entonces terminar',
    '  si cabeza.valor = valor entonces eliminarAlInicio(); terminar',
    '  previo ← cabeza',
    '  mientras previo.siguiente ≠ ∅ y previo.siguiente.valor ≠ valor hacer',
    '    previo ← previo.siguiente',
    '  si previo.siguiente = ∅ entonces terminar',
    '  objetivo ← previo.siguiente',
    '  previo.siguiente ← objetivo.siguiente',
    '  liberar(objetivo)',
  ],
  *run(state, args): Generator<Frame, ListState> {
    const value = args.value;
    yield snapshot(state, { codeLine: 0, caption: `Eliminar el primer nodo con valor ${value}.` });

    if (!state.head) {
      yield snapshot(state, {
        codeLine: 1,
        caption: 'La lista está vacía: no hay nada que eliminar.',
        tone: 'warning',
      });
      return state;
    }

    if (node(state, state.head).value === value) {
      const targetId = state.head;
      state.head = node(state, targetId).next;
      yield snapshot(state, {
        codeLine: 2,
        caption: `${value} es la cabeza: se elimina moviendo la cabeza al siguiente nodo.`,
        marks: [headMark(state), mark('objetivo', targetId, 'cursor')],
        ghosts: [targetId],
      });
      detach(state, targetId);
      normalize(state);
      yield snapshot(state, { codeLine: 9, caption: `${value} sale de servicio.`, tone: 'success' });
      return state;
    }

    let prevId = state.head;
    yield snapshot(state, {
      codeLine: 3,
      caption: 'previo empieza en la cabeza y va mirando siempre al nodo siguiente.',
      marks: [headMark(state), mark('previo', prevId, 'aux')],
      activeNodes: [prevId],
    });

    while (node(state, prevId).next !== null && node(state, node(state, prevId).next as string).value !== value) {
      yield snapshot(state, {
        codeLine: 4,
        caption: `${node(state, node(state, prevId).next as string).value} no es ${value}: se sigue caminando.`,
        marks: [headMark(state), mark('previo', prevId, 'aux')],
        activeNodes: [node(state, prevId).next as string],
        activeLinks: [prevId],
      });
      prevId = node(state, prevId).next as string;
      yield snapshot(state, {
        codeLine: 5,
        caption: `previo avanza a ${node(state, prevId).value}.`,
        marks: [headMark(state), mark('previo', prevId, 'aux')],
        activeNodes: [prevId],
      });
    }

    if (node(state, prevId).next === null) {
      yield snapshot(state, {
        codeLine: 6,
        caption: `Se llegó a ∅ sin encontrar ${value}: la lista queda igual.`,
        marks: [headMark(state), mark('previo', prevId, 'aux')],
        tone: 'warning',
      });
      return state;
    }

    const targetId = node(state, prevId).next as string;
    yield snapshot(state, {
      codeLine: 7,
      caption: `Encontrado: ${value} está justo después de ${node(state, prevId).value}.`,
      marks: [headMark(state), mark('previo', prevId, 'aux'), mark('objetivo', targetId, 'cursor')],
      activeNodes: [targetId],
    });

    node(state, prevId).next = node(state, targetId).next;
    yield snapshot(state, {
      codeLine: 8,
      caption: `${node(state, prevId).value} salta por encima de ${value} y se enlaza con lo que venía después.`,
      marks: [headMark(state), mark('previo', prevId, 'aux')],
      activeLinks: [prevId],
      ghosts: [targetId],
    });

    detach(state, targetId);
    normalize(state);
    yield snapshot(state, { codeLine: 9, caption: `${value} sale de servicio.`, tone: 'success' });
    return state;
  },
};

const search: OperationDef = {
  id: 'search',
  label: 'Buscar',
  group: 'consultar',
  complexity: 'O(n)',
  note: 'No hay acceso directo: la única forma de llegar a un nodo es pasar por todos los anteriores.',
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
    yield snapshot(state, { codeLine: 0, caption: `Buscar ${value} recorriendo la lista desde la cabeza.` });

    let currentId = state.head;
    let i = 0;
    yield snapshot(state, {
      codeLine: 1,
      caption: 'actual empieza en la cabeza.',
      marks: [headMark(state), mark('actual', currentId, 'cursor')],
      activeNodes: currentId ? [currentId] : [],
    });

    while (currentId) {
      const current = node(state, currentId);
      if (current.value === value) {
        yield snapshot(state, {
          codeLine: 3,
          caption: `Encontrado: ${value} está en la posición ${i}. Costó ${i + 1} ${i === 0 ? 'salto' : 'saltos'}.`,
          marks: [headMark(state), mark('actual', currentId, 'cursor')],
          activeNodes: [currentId],
          tone: 'success',
        });
        return state;
      }
      yield snapshot(state, {
        codeLine: 3,
        caption: `${current.value} no es ${value}.`,
        marks: [headMark(state), mark('actual', currentId, 'cursor')],
        activeNodes: [currentId],
      });
      currentId = current.next;
      i += 1;
      yield snapshot(state, {
        codeLine: 4,
        caption: currentId ? `actual avanza a ${node(state, currentId).value}.` : 'actual llega a ∅.',
        marks: [headMark(state), mark('actual', currentId, 'cursor')],
        activeNodes: currentId ? [currentId] : [],
        activeLinks: [current.id],
      });
    }

    yield snapshot(state, {
      codeLine: 5,
      caption: `${value} no está en la lista: se recorrieron todos los nodos hasta ∅.`,
      marks: [headMark(state), mark('actual', null, 'cursor')],
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
  note: 'Cada nodo se visita una sola vez y el recorrido termina en ∅.',
  args: [],
  code: [
    'recorrer()',
    '  actual ← cabeza',
    '  mientras actual ≠ ∅ hacer',
    '    visitar(actual.valor)',
    '    actual ← actual.siguiente',
  ],
  *run(state): Generator<Frame, ListState> {
    yield snapshot(state, { codeLine: 0, caption: 'Recorrer la lista de punta a punta.' });

    let currentId = state.head;
    const visited: number[] = [];
    yield snapshot(state, {
      codeLine: 1,
      caption: 'actual empieza en la cabeza.',
      marks: [headMark(state), mark('actual', currentId, 'cursor')],
      activeNodes: currentId ? [currentId] : [],
    });

    while (currentId) {
      const current = node(state, currentId);
      visited.push(current.value);
      yield snapshot(state, {
        codeLine: 3,
        caption: `Visitados: ${visited.join(' · ')}`,
        marks: [headMark(state), mark('actual', currentId, 'cursor')],
        activeNodes: [currentId],
      });
      currentId = current.next;
      yield snapshot(state, {
        codeLine: 4,
        caption: currentId ? `actual avanza a ${node(state, currentId).value}.` : 'actual llega a ∅: no hay más nodos.',
        marks: [headMark(state), mark('actual', currentId, 'cursor')],
        activeNodes: currentId ? [currentId] : [],
        activeLinks: [current.id],
      });
    }

    yield snapshot(state, {
      codeLine: 2,
      caption: visited.length
        ? `Recorrido completo: ${visited.join(' · ')}. ${visited.length} ${visited.length === 1 ? 'salto' : 'saltos'}.`
        : 'La lista está vacía: el recorrido termina antes de empezar.',
      marks: [headMark(state), mark('actual', null, 'cursor')],
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
  note: 'Las celdas no se mueven: lo que cambia de sentido son los enlaces.',
  args: [],
  code: [
    'invertir()',
    '  previo ← ∅;  actual ← cabeza',
    '  mientras actual ≠ ∅ hacer',
    '    siguiente ← actual.siguiente',
    '    actual.siguiente ← previo',
    '    previo ← actual',
    '    actual ← siguiente',
    '  cabeza ← previo',
  ],
  *run(state): Generator<Frame, ListState> {
    yield snapshot(state, {
      codeLine: 0,
      caption: 'Invertir la lista dando vuelta cada enlace, de uno en uno.',
    });

    let prevId: string | null = null;
    let currentId = state.head;
    yield snapshot(state, {
      codeLine: 1,
      caption: 'previo empieza en ∅ porque el que hoy es primero terminará apuntando a ∅.',
      marks: [headMark(state), mark('previo', null, 'aux'), mark('actual', currentId, 'cursor')],
      activeNodes: currentId ? [currentId] : [],
    });

    while (currentId) {
      const current = node(state, currentId);
      const nextId: string | null = current.next;
      yield snapshot(state, {
        codeLine: 3,
        caption: nextId
          ? `Se guarda ${node(state, nextId).value} en siguiente: en cuanto se dé vuelta el enlace, ya no habría cómo llegar.`
          : 'Se guarda ∅ en siguiente: este es el último nodo.',
        marks: [
          headMark(state),
          mark('previo', prevId, 'aux'),
          mark('actual', currentId, 'cursor'),
          mark('siguiente', nextId, 'new'),
        ],
        activeNodes: nextId ? [nextId] : [],
        activeLinks: [currentId],
      });

      current.next = prevId;
      yield snapshot(state, {
        codeLine: 4,
        caption: `El enlace de ${current.value} cambia de sentido.`,
        marks: [
          headMark(state),
          mark('previo', prevId, 'aux'),
          mark('actual', currentId, 'cursor'),
          mark('siguiente', nextId, 'new'),
        ],
        activeNodes: [currentId],
        activeLinks: [currentId],
      });

      prevId = currentId;
      currentId = nextId;
      yield snapshot(state, {
        codeLine: 6,
        caption: currentId
          ? `Los dos punteros avanzan: actual llega a ${node(state, currentId).value}.`
          : 'actual llega a ∅: ya no queda nada por invertir.',
        marks: [headMark(state), mark('previo', prevId, 'aux'), mark('actual', currentId, 'cursor')],
        activeNodes: currentId ? [currentId] : [],
      });
    }

    state.head = prevId;
    yield snapshot(state, {
      codeLine: 7,
      caption: prevId
        ? `La cabeza pasa a ser ${node(state, prevId).value}, que era el último nodo.`
        : 'La lista estaba vacía: no hay nada que invertir.',
      activeNodes: prevId ? [prevId] : [],
    });

    normalize(state);
    yield snapshot(state, {
      codeLine: 7,
      caption: walk(state).length
        ? 'La lista se reacomoda: mismo conjunto de nodos, recorrido al revés.'
        : 'La lista sigue vacía.',
      tone: 'success',
    });
    return state;
  },
};

/**
 * Detección de ciclo de Floyd. Vive aquí porque su gracia es lanzarla sobre las dos
 * listas: en la abierta la liebre se estrella contra ∅, en la circular alcanza a la
 * tortuga. Por eso la comparten ambas estructuras.
 */
export const floyd: OperationDef = {
  id: 'floyd',
  label: 'Detectar ciclo',
  group: 'consultar',
  complexity: 'O(n)',
  note: 'Dos punteros a distinta velocidad: si hay ciclo, el rápido alcanza al lento.',
  args: [],
  code: [
    'tieneCiclo()',
    '  tortuga ← cabeza;  liebre ← cabeza',
    '  mientras liebre ≠ ∅ y liebre.siguiente ≠ ∅ hacer',
    '    tortuga ← tortuga.siguiente',
    '    liebre ← liebre.siguiente.siguiente',
    '    si tortuga = liebre entonces devolver verdadero',
    '  devolver falso',
  ],
  *run(state): Generator<Frame, ListState> {
    yield snapshot(state, {
      codeLine: 0,
      caption: 'Dos punteros salen de la cabeza; el segundo avanza al doble.',
    });

    let slow = state.head;
    let fast = state.head;
    yield snapshot(state, {
      codeLine: 1,
      caption: 'tortuga y liebre arrancan juntas en la cabeza.',
      marks: [headMark(state), mark('tortuga', slow, 'cursor'), mark('liebre', fast, 'aux')],
      activeNodes: slow ? [slow] : [],
    });

    let steps = 0;
    while (fast && node(state, fast).next) {
      slow = node(state, slow as string).next;
      steps += 1;
      yield snapshot(state, {
        codeLine: 3,
        caption: `La tortuga avanza un salto, hasta ${slow ? node(state, slow).value : '∅'}.`,
        marks: [headMark(state), mark('tortuga', slow, 'cursor'), mark('liebre', fast, 'aux')],
        activeNodes: slow ? [slow] : [],
      });

      fast = node(state, node(state, fast).next as string).next;
      yield snapshot(state, {
        codeLine: 4,
        caption: `La liebre avanza dos, hasta ${fast ? node(state, fast).value : '∅'}.`,
        marks: [headMark(state), mark('tortuga', slow, 'cursor'), mark('liebre', fast, 'aux')],
        activeNodes: fast ? [fast] : [],
      });

      if (slow && slow === fast) {
        yield snapshot(state, {
          codeLine: 5,
          caption: `Se encontraron en ${node(state, slow).value} tras ${steps} ${steps === 1 ? 'paso' : 'pasos'}: la lista tiene ciclo.`,
          marks: [headMark(state), mark('tortuga', slow, 'cursor'), mark('liebre', fast, 'aux')],
          activeNodes: [slow],
          tone: 'success',
        });
        return state;
      }
    }

    yield snapshot(state, {
      codeLine: 6,
      caption: 'La liebre se topó con ∅: la lista no tiene ciclo, termina donde el último enlace deja de apuntar.',
      marks: [headMark(state), mark('tortuga', slow, 'cursor'), mark('liebre', fast, 'aux')],
      tone: 'warning',
    });
    return state;
  },
};

export const singlyOperations: OperationDef[] = [
  insertHead,
  insertTail,
  insertAt,
  deleteHead,
  deleteAt,
  deleteValue,
  search,
  traverse,
  reverse,
  floyd,
];
