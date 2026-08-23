import { circularOperations } from './circular';
import { doublyOperations } from './doubly';
import { METRO_CODE, METRO_NOTE } from './metro';
import { singlyOperations } from './singly';
import type { ScenarioDef, StructureDef } from './types';

/**
 * Catálogo de canales. Añadir una estructura nueva es añadir un módulo de
 * operaciones y una entrada aquí; ningún componente necesita enterarse.
 */
export const structures: StructureDef[] = [
  {
    id: 'singly',
    channel: 'CH1',
    label: 'Lista simplemente ligada',
    tagline: 'Un enlace por nodo. El recorrido avanza en un solo sentido y termina en ∅.',
    color: 'var(--ch-c)',
    circular: false,
    seed: [12, 7, 41, 3],
    operations: singlyOperations,
  },
  {
    id: 'circular',
    channel: 'CH2',
    label: 'Lista circular',
    tagline: 'El último nodo vuelve a la cabeza. El recorrido no termina nunca por sí solo.',
    color: 'var(--ch-m)',
    circular: true,
    seed: [12, 7, 41, 3],
    operations: circularOperations,
  },
  {
    id: 'doubly',
    channel: 'CH3',
    label: 'Lista doblemente ligada',
    tagline: 'Dos enlaces por nodo y un puntero a la cola. Se recorre en los dos sentidos.',
    color: 'var(--ch-v)',
    circular: false,
    doubly: true,
    seed: [12, 7, 41, 3],
    operations: doublyOperations,
  },
];

/**
 * Escenarios: problemas que ninguna estructura resuelve sola. Se recorren con el
 * mismo transporte que un canal, pero cada uno trae su visor y su consola.
 */
export const scenarios: ScenarioDef[] = [
  {
    id: 'metro',
    channel: 'SIM1',
    label: 'Garajes del metro',
    tagline:
      'Seis listas que se intercambian nodos durante cinco días. Un tren ES una lista doble de vagones.',
    color: 'var(--ch-s)',
    parts: ['6 listas', '2 simples · FIFO', '4 dobles'],
    program: { complexity: 'O(n) por jornada', note: METRO_NOTE, code: METRO_CODE },
  },
];

/** Canales en cola: se muestran apagados debajo de los disponibles. */
export const upcoming = [
  { channel: 'CH4', label: 'Pila y cola' },
  { channel: 'CH5', label: 'Árbol binario de búsqueda' },
];

export function findStructure(id: string): StructureDef {
  return structures.find((structure) => structure.id === id) ?? structures[0];
}

export function findScenario(id: string): ScenarioDef {
  return scenarios.find((scenario) => scenario.id === id) ?? scenarios[0];
}
