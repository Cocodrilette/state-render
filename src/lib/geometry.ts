/**
 * Geometría del lienzo. Todo se deriva de estas constantes, así que las celdas, los
 * enlaces y las etiquetas de puntero no pueden desalinearse entre sí.
 */
export const CELL_W = 112;
export const CELL_H = 74;
export const GAP = 62;
export const PITCH = CELL_W + GAP;
export const ORIGIN_X = 44;
export const LINK_Y = 168;
export const DETOUR_DROP = 112;
export const STUB = 44;
export const HEIGHT = LINK_Y + DETOUR_DROP + 44;

export const CELL_TOP = LINK_Y - CELL_H / 2;
export const DETOUR_Y = LINK_Y + DETOUR_DROP;

export function cellX(index: number): number {
  return ORIGIN_X + index * PITCH;
}

export function centerX(index: number): number {
  return cellX(index) + CELL_W / 2;
}

export function exitX(index: number): number {
  return cellX(index) + CELL_W;
}

/** Punto donde se posan los punteros que apuntan a ∅. */
export function voidX(count: number): number {
  return cellX(count) + STUB / 2;
}

export function canvasWidth(count: number): number {
  return cellX(Math.max(count, 1)) + STUB + ORIGIN_X;
}

/**
 * Cuando la estructura tiene enlaces en los dos sentidos, cada sentido corre por su
 * propio carril: `siguiente` por arriba y `previo` por abajo. Con un solo enlace no
 * hay nada que separar y todo va por el eje de la celda.
 */
export const LANE = 13;

export function laneY(doubly: boolean, back = false): number {
  if (!doubly) return LINK_Y;
  return back ? LINK_Y + LANE : LINK_Y - LANE;
}

/** Tramo recto entre dos celdas contiguas. Recibe la posición izquierda de cada celda. */
export function straightPath(fromX: number, toX: number, y = LINK_Y): string {
  return `M ${fromX + CELL_W} ${y} L ${toX} ${y}`;
}

/**
 * Rodeo por debajo de las celdas: sale a la derecha, baja, vuelve y sube.
 * Es el trazo que cierra la lista circular y el que dibuja los enlaces que
 * apuntan hacia atrás mientras se invierte una lista.
 */
export function detourPath(fromX: number, toX: number, y = LINK_Y, depth = DETOUR_Y): string {
  const x1 = fromX + CELL_W;
  const x2 = toX;
  const out = x1 + 36;
  const back = x2 - 36;
  return [
    `M ${x1} ${y}`,
    `C ${out} ${y}, ${out} ${depth}, ${out - 22} ${depth}`,
    `L ${back + 22} ${depth}`,
    `C ${back} ${depth}, ${back} ${y}, ${x2} ${y}`,
  ].join(' ');
}

/** El mismo rodeo, en espejo: sale por la izquierda y entra por el borde derecho del destino. */
export function backDetourPath(fromX: number, toX: number, y: number, depth: number): string {
  const x1 = fromX;
  const x2 = toX + CELL_W;
  const out = x1 - 36;
  const back = x2 + 36;
  return [
    `M ${x1} ${y}`,
    `C ${out} ${y}, ${out} ${depth}, ${out + 22} ${depth}`,
    `L ${back - 22} ${depth}`,
    `C ${back} ${depth}, ${back} ${y}, ${x2} ${y}`,
  ].join(' ');
}

/** Tramo corto que muere en ∅: el enlace que no lleva a ninguna parte. */
export function nullPath(fromX: number, y = LINK_Y): string {
  const x1 = fromX + CELL_W;
  return `M ${x1} ${y} L ${x1 + STUB - 12} ${y}`;
}

/** El ∅ del otro extremo: el `previo` de la cabeza sale hacia la izquierda. */
export function nullBackPath(fromX: number, y: number): string {
  return `M ${fromX} ${y} L ${fromX - STUB + 12} ${y}`;
}

/**
 * `adjacent` viene del orden lógico, no de las coordenadas: mientras las celdas se
 * deslizan las distancias cambian, y el trazo no debe saltar de recto a rodeo a
 * media animación.
 */
export function linkPath(fromX: number, toX: number, adjacent: boolean, y = LINK_Y): string {
  return adjacent ? straightPath(fromX, toX, y) : detourPath(fromX, toX, y);
}

/** Enlace hacia atrás: recto si el destino es la celda de al lado, rodeo si no. */
export function backLinkPath(fromX: number, toX: number, adjacent: boolean, y: number): string {
  return adjacent
    ? `M ${fromX} ${y} L ${toX + CELL_W} ${y}`
    : backDetourPath(fromX, toX, y, DETOUR_Y - 34);
}
