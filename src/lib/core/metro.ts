import type { ArgDef, Tone } from './types';

/**
 * Escenario: los garajes del metro.
 *
 * A diferencia de un canal de estructura, donde una operación toca una sola lista,
 * aquí conviven seis estructuras que se intercambian nodos:
 *
 *   · un tren ES una lista doblemente ligada de vagones, con su cabeza
 *   · los trenes en servicio viven en otra lista doblemente ligada
 *   · garaje de cabezas y garaje de vagones: listas doblemente ligadas
 *   · taller de cabezas y taller de vagones: listas SIMPLEMENTE ligadas, en FIFO
 *
 * Un equipo nunca se copia: el mismo nodo se desenlaza de una lista y se enlaza en
 * otra, llevándose consigo sus contadores. Eso es lo que el escenario enseña, y por
 * eso cada fotograma verifica la conservación: si la suma no cuadra, algún puntero
 * quedó a medias.
 */

export type UnitKind = 'cabeza' | 'vagon';
export type UnitPlace = 'garaje' | 'taller' | 'tren';

/** Lo que se sabe de un equipo en un fotograma. */
export interface UnitView {
  kind: UnitKind;
  place: UnitPlace;
  /** Tren al que pertenece, si está en servicio. */
  trainId: string | null;
  /** Jornadas de funcionamiento que le quedan (solo cabezas). */
  vidaUtil: number;
  /** Jornadas que le faltan en el taller. */
  diasReparacion: number;
}

export interface TrainView {
  id: string;
  capacidad: number;
  cabeza: string | null;
  /** Vagones en orden de la lista doble del tren. */
  vagones: string[];
}

/** Las cinco fases de una jornada. El orden importa y es siempre el mismo. */
export type PhaseId = 'taller' | 'desarmar' | 'revision' | 'conformar' | 'informe';

export const PHASES: { id: PhaseId; label: string; n: number }[] = [
  { id: 'taller', label: 'Envejecer el taller', n: 1 },
  { id: 'desarmar', label: 'Desarmar los trenes', n: 2 },
  { id: 'revision', label: 'Revisión del día', n: 3 },
  { id: 'conformar', label: 'Conformar los trenes', n: 4 },
  { id: 'informe', label: 'Informe', n: 5 },
];

export interface DayVerdict {
  armados: number;
  requeridos: number;
  faltanCabezas: number;
  faltanVagones: number;
  ok: boolean;
}

/** Un fotograma: el estado completo de las seis estructuras en un paso. */
export interface MetroFrame {
  day: number;
  phase: PhaseId;
  /** Ids en el orden en que están enlazados dentro de cada estructura. */
  garajeCabezas: string[];
  garajeVagones: string[];
  tallerCabezas: string[];
  tallerVagones: string[];
  trains: TrainView[];
  units: Record<string, UnitView>;
  /** Lo que este paso está tocando: se pinta en amarillo. */
  touched: string[];
  codeLine: number;
  caption: string;
  tone: Tone;
  /** Solo en la fase de informe. */
  verdict: DayVerdict | null;
  /** Nodos en trenes + garaje + taller = total. Si falla, algún puntero se rompió. */
  conserva: boolean;
}

export interface MetroParams {
  cabezas: number;
  vagones: number;
  vidaUtil: number;
  mantenimientoCabeza: number;
  reparacionVagon: number;
}

export const DIAS = 5;
export const TRENES_LARGOS = 5;
export const VAGONES_LARGO = 10;
export const TRENES_CORTOS = 5;
export const VAGONES_CORTO = 8;
export const CABEZAS_REQUERIDAS = TRENES_LARGOS + TRENES_CORTOS;
export const VAGONES_REQUERIDOS = TRENES_LARGOS * VAGONES_LARGO + TRENES_CORTOS * VAGONES_CORTO;

export const DEFAULT_PARAMS: MetroParams = {
  cabezas: 13,
  vagones: 100,
  vidaUtil: 3,
  mantenimientoCabeza: 3,
  reparacionVagon: 2,
};

/**
 * Los parámetros son la parte jugable del escenario: subir las cabezas a 17 vuelve
 * la semana factible, y verlo pasar es entender el cuello de botella.
 */
export const METRO_PARAMS: ArgDef[] = [
  { key: 'cabezas', label: 'Cabezas', hint: 'en el garaje', min: 1, max: 30, default: 13 },
  { key: 'vagones', label: 'Vagones', hint: 'en el garaje', min: 8, max: 160, default: 100 },
  { key: 'vidaUtil', label: 'Vida útil', hint: 'jornadas por cabeza', min: 1, max: 10, default: 3 },
  { key: 'mantenimientoCabeza', label: 'Taller cabeza', hint: 'jornadas', min: 1, max: 10, default: 3 },
  { key: 'reparacionVagon', label: 'Taller vagón', hint: 'jornadas', min: 1, max: 10, default: 2 },
];

export const METRO_CODE = [
  'simularSemana()',
  '  para dia ← 1 hasta 5',
  '    // FASE 1 · envejecer el taller',
  '    para cada equipo en el taller',
  '      equipo.diasReparacion ← equipo.diasReparacion − 1',
  '      si llegó a 0 → vuelve al garaje (la cabeza renueva su vida útil)',
  '    // FASE 2 · desarmar los trenes de ayer',
  '    para cada tren en servicio',
  '      tren.cabeza.vidaUtil ← tren.cabeza.vidaUtil − 1',
  '      si vidaUtil llegó a 0 → al taller; si no → al garaje',
  '      devolver los vagones del tren al garaje',
  '    // FASE 3 · revisión del día',
  '    para cada avería prevista para hoy',
  '      desenlazar del garaje y encolar en el taller',
  '    // FASE 4 · conformar los 10 trenes',
  '    para indice ← 1 hasta 10',
  '      capacidad ← 10 si indice ≤ 5, si no 8',
  '      si no hay cabeza o faltan vagones → no se toma nada y se reporta',
  '      tren.cabeza ← garajeCabezas.extraerPrimero()',
  '      repetir capacidad veces: tren.vagones.agregar(garajeVagones.extraerPrimero())',
  '    // FASE 5 · informe del día',
  '    verificar la conservación de nodos y reportar el resultado',
];

export const METRO_NOTE =
  'Cada jornada cuesta O(n) sobre los equipos que se mueven, no sobre la flota entera: ' +
  'desenlazar de una lista doble es O(1) porque ya se tiene el nodo, y encolar en el taller ' +
  'también, gracias al puntero a la cola. Lo único que recorre de verdad es la búsqueda por ' +
  'identificador de la revisión diaria.';

// ============================ estado interno ================================

interface Unit extends UnitView {
  id: string;
  next: string | null;
  prev: string | null;
}

/** Una lista ligada. `doubly` decide si se mantiene el enlace de vuelta. */
interface Chain {
  head: string | null;
  tail: string | null;
  size: number;
  doubly: boolean;
}

interface Train {
  id: string;
  capacidad: number;
  cabeza: string | null;
  vagones: Chain;
}

function chain(doubly: boolean): Chain {
  return { head: null, tail: null, size: 0, doubly };
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

/**
 * Concordancia de número. El verbo también concuerda, así que las dos formas se dan
 * completas: «faltó 1 cabeza» / «faltaron 4 cabezas».
 */
function agree(n: number, one: string, many: string): string {
  return n === 1 ? `${one}` : many.replace('%', String(n));
}

class Sim {
  units: Record<string, Unit> = {};
  garajeCabezas = chain(true);
  garajeVagones = chain(true);
  tallerCabezas = chain(false);
  tallerVagones = chain(false);
  /** Los trenes en servicio también viven en una lista, aquí en orden de conformación. */
  trains: Train[] = [];

  constructor(readonly params: MetroParams) {
    for (let i = 1; i <= params.cabezas; i += 1) {
      this.#create(`C${pad(i, 2)}`, 'cabeza');
      this.append(this.garajeCabezas, `C${pad(i, 2)}`);
    }
    for (let i = 1; i <= params.vagones; i += 1) {
      this.#create(`V${pad(i, 3)}`, 'vagon');
      this.append(this.garajeVagones, `V${pad(i, 3)}`);
    }
  }

  #create(id: string, kind: UnitKind) {
    this.units[id] = {
      id,
      kind,
      place: 'garaje',
      trainId: null,
      vidaUtil: kind === 'cabeza' ? this.params.vidaUtil : 0,
      diasReparacion: 0,
      next: null,
      prev: null,
    };
  }

  unit(id: string): Unit {
    const found = this.units[id];
    if (!found) throw new Error(`El equipo ${id} no existe`);
    return found;
  }

  /** Inserta al final: O(1) gracias al puntero a la cola, en doble y en simple. */
  append(list: Chain, id: string) {
    const u = this.unit(id);
    u.next = null;
    u.prev = list.doubly ? list.tail : null;
    if (list.tail) this.unit(list.tail).next = id;
    else list.head = id;
    list.tail = id;
    list.size += 1;
  }

  /** Desenlaza un nodo de una lista doble: O(1), no hace falta buscar al predecesor. */
  unlinkDouble(list: Chain, id: string): string {
    const u = this.unit(id);
    if (u.prev) this.unit(u.prev).next = u.next;
    else list.head = u.next;
    if (u.next) this.unit(u.next).prev = u.prev;
    else list.tail = u.prev;
    u.next = null;
    u.prev = null;
    list.size -= 1;
    return id;
  }

  takeFirst(list: Chain): string | null {
    if (!list.head) return null;
    return this.unlinkDouble(list, list.head);
  }

  /**
   * Envejece el taller y devuelve al garaje lo que ya cumplió. Patrón de dos
   * punteros: sin enlace `previo` no se puede borrar un nodo teniéndolo solo a él.
   */
  ageWorkshop(shop: Chain, garage: Chain): string[] {
    const released: string[] = [];
    let current = shop.head;
    let previo: string | null = null;

    while (current) {
      const u = this.unit(current);
      u.diasReparacion -= 1;
      const siguiente = u.next; // se guarda ANTES de desenlazar

      if (u.diasReparacion <= 0) {
        if (previo) this.unit(previo).next = siguiente;
        else shop.head = siguiente;
        if (current === shop.tail) shop.tail = previo;
        shop.size -= 1;

        u.next = null;
        u.prev = null;
        u.place = 'garaje';
        if (u.kind === 'cabeza') u.vidaUtil = this.params.vidaUtil; // sale renovada
        this.append(garage, current);
        released.push(current);
      } else {
        previo = current; // previo solo avanza si NO se borró
      }

      current = siguiente;
    }
    return released;
  }

  order(list: Chain): string[] {
    const ids: string[] = [];
    let current = list.head;
    const seen = new Set<string>();
    while (current && !seen.has(current)) {
      seen.add(current);
      ids.push(current);
      current = this.unit(current).next;
    }
    return ids;
  }

  countIn(place: UnitPlace, kind: UnitKind): number {
    let total = 0;
    for (const id of Object.keys(this.units)) {
      const u = this.units[id];
      if (u.kind === kind && u.place === place) total += 1;
    }
    return total;
  }

  /** Ningún nodo se pierde ni se duplica al migrar entre listas. */
  conserva(): boolean {
    const cabezas =
      this.countIn('tren', 'cabeza') + this.countIn('garaje', 'cabeza') + this.countIn('taller', 'cabeza');
    const vagones =
      this.countIn('tren', 'vagon') + this.countIn('garaje', 'vagon') + this.countIn('taller', 'vagon');
    return cabezas === this.params.cabezas && vagones === this.params.vagones;
  }

  trainViews(): TrainView[] {
    return this.trains.map((train) => ({
      id: train.id,
      capacidad: train.capacidad,
      cabeza: train.cabeza,
      vagones: this.order(train.vagones),
    }));
  }

  unitViews(): Record<string, UnitView> {
    const views: Record<string, UnitView> = {};
    for (const id of Object.keys(this.units)) {
      const u = this.units[id];
      views[id] = {
        kind: u.kind,
        place: u.place,
        trainId: u.trainId,
        vidaUtil: u.vidaUtil,
        diasReparacion: u.diasReparacion,
      };
    }
    return views;
  }
}

// ============================ plan de revisión ==============================

export interface PlanEvent {
  dia: number;
  id: string;
}

/**
 * Averías previstas de la semana. Datos FIJOS y no aleatorios: así el informe es
 * reproducible y se puede verificar a mano, que es justo lo que un escenario
 * didáctico necesita.
 */
export function buildPlan(params: MetroParams): PlanEvent[] {
  const plan: PlanEvent[] = [];
  const wagon = (dia: number, from: number, to: number) => {
    for (let i = from; i <= to; i += 1) {
      if (i <= params.vagones) plan.push({ dia, id: `V${pad(i, 3)}` });
    }
  };
  const head = (dia: number, i: number) => {
    if (i <= params.cabezas) plan.push({ dia, id: `C${pad(i, 2)}` });
  };

  wagon(1, 1, 6);
  head(1, 1);
  wagon(2, 7, 9);
  wagon(3, 10, 12);
  head(3, 2);
  wagon(4, 13, 15);
  wagon(5, 16, 17);
  return plan;
}

// ============================ factibilidad ==================================

export interface Feasibility {
  diasCabezaDisponibles: number;
  diasCabezaRequeridos: number;
  deficitCabeza: number;
  diasVagonDisponibles: number;
  diasVagonRequeridos: number;
  holguraVagon: number;
  /** Cota inferior por conteo: por debajo de esto la semana es imposible. */
  cabezasMinimas: number;
  /** Demostrado imposible sin simular: el conteo de días-cabeza no alcanza. */
  imposible: boolean;
  vagonesSuficientes: boolean;
}

/**
 * Contar «días-equipo» acota el problema antes de simular: 13 cabezas que aguantan
 * 3 jornadas dan 39 días-cabeza, y la semana exige 10 × 5 = 50. Faltan 11, así que
 * la semana es imposible **sin importar cómo se programe**.
 *
 * Ojo con la dirección del argumento: es una cota inferior. Demuestra imposibilidad
 * cuando no alcanza, pero cumplirla no garantiza nada — el reparto por días y las
 * averías del plan hacen que el mínimo real (18 con los valores del enunciado) sea
 * mayor que el que da el conteo (17). Que la cota se cumpla solo significa que ya
 * no se puede descartar por aritmética.
 */
export function feasibility(params: MetroParams): Feasibility {
  const diasCabezaDisponibles = params.cabezas * params.vidaUtil;
  const diasCabezaRequeridos = CABEZAS_REQUERIDAS * DIAS;
  const diasVagonDisponibles = params.vagones * DIAS;
  const diasVagonRequeridos = VAGONES_REQUERIDOS * DIAS;
  return {
    diasCabezaDisponibles,
    diasCabezaRequeridos,
    deficitCabeza: diasCabezaRequeridos - diasCabezaDisponibles,
    diasVagonDisponibles,
    diasVagonRequeridos,
    holguraVagon: diasVagonDisponibles - diasVagonRequeridos,
    cabezasMinimas: Math.ceil(diasCabezaRequeridos / params.vidaUtil),
    imposible: diasCabezaDisponibles < diasCabezaRequeridos || params.vagones < VAGONES_REQUERIDOS,
    vagonesSuficientes: params.vagones >= VAGONES_REQUERIDOS,
  };
}

// ============================ la simulación =================================

interface Emit {
  phase: PhaseId;
  codeLine: number;
  caption: string;
  touched?: string[];
  tone?: Tone;
  verdict?: DayVerdict | null;
}

/**
 * Emite la semana entera como una secuencia de fotogramas. Igual que una operación
 * de lista: el algoritmo no sabe nada del dibujo y el dibujo no sabe nada del
 * algoritmo, solo comparten el fotograma.
 */
export function* runWeek(params: MetroParams): Generator<MetroFrame, void> {
  const sim = new Sim(params);
  const plan = buildPlan(params);
  const requeridos = CABEZAS_REQUERIDAS;

  function frame(day: number, emit: Emit): MetroFrame {
    return {
      day,
      phase: emit.phase,
      garajeCabezas: sim.order(sim.garajeCabezas),
      garajeVagones: sim.order(sim.garajeVagones),
      tallerCabezas: sim.order(sim.tallerCabezas),
      tallerVagones: sim.order(sim.tallerVagones),
      trains: sim.trainViews(),
      units: sim.unitViews(),
      touched: emit.touched ?? [],
      codeLine: emit.codeLine,
      caption: emit.caption,
      tone: emit.tone ?? 'neutral',
      verdict: emit.verdict ?? null,
      conserva: sim.conserva(),
    };
  }

  for (let day = 1; day <= DIAS; day += 1) {
    // ---------------------------------------------------------------- FASE 1
    const cabezasLibres = sim.ageWorkshop(sim.tallerCabezas, sim.garajeCabezas);
    const vagonesLibres = sim.ageWorkshop(sim.tallerVagones, sim.garajeVagones);

    if (!cabezasLibres.length && !vagonesLibres.length) {
      yield frame(day, {
        phase: 'taller',
        codeLine: 3,
        caption:
          sim.tallerCabezas.size + sim.tallerVagones.size > 0
            ? 'El taller baja un día a cada contador, pero hoy nadie termina: siguen todos dentro.'
            : 'El taller está vacío, no hay contadores que bajar.',
      });
    } else {
      if (vagonesLibres.length) {
        yield frame(day, {
          phase: 'taller',
          codeLine: 5,
          caption: `${agree(vagonesLibres.length, '1 vagón cumple su reparación y vuelve', '% vagones cumplen su reparación y vuelven')} al garaje, al final de la lista doble.`,
          touched: vagonesLibres,
        });
      }
      for (const id of cabezasLibres) {
        yield frame(day, {
          phase: 'taller',
          codeLine: 5,
          caption: `${id} sale del mantenimiento con la vida útil renovada a ${params.vidaUtil} jornadas.`,
          touched: [id],
        });
      }
    }

    // ---------------------------------------------------------------- FASE 2
    const previos = sim.trains;
    sim.trains = [];
    if (previos.length) {
      const devueltos: string[] = [];
      const agotadas: string[] = [];
      const siguen: string[] = [];

      for (const train of previos) {
        const cabezaId = train.cabeza;
        if (cabezaId) {
          const cabeza = sim.unit(cabezaId);
          cabeza.vidaUtil -= 1;
          cabeza.trainId = null;
          if (cabeza.vidaUtil <= 0) {
            cabeza.place = 'taller';
            cabeza.diasReparacion = params.mantenimientoCabeza;
            sim.append(sim.tallerCabezas, cabezaId);
            agotadas.push(cabezaId);
          } else {
            cabeza.place = 'garaje';
            sim.append(sim.garajeCabezas, cabezaId);
            siguen.push(cabezaId);
          }
        }
        let vagonId = sim.takeFirst(train.vagones);
        while (vagonId) {
          const vagon = sim.unit(vagonId);
          vagon.place = 'garaje';
          vagon.trainId = null;
          sim.append(sim.garajeVagones, vagonId);
          devueltos.push(vagonId);
          vagonId = sim.takeFirst(train.vagones);
        }
      }

      yield frame(day, {
        phase: 'desarmar',
        codeLine: 10,
        caption: `Se desarman los ${previos.length} trenes de ayer: ${devueltos.length} vagones vuelven al garaje.`,
        touched: devueltos,
      });

      if (siguen.length) {
        yield frame(day, {
          phase: 'desarmar',
          codeLine: 9,
          caption: `${agree(siguen.length, '1 cabeza gasta una jornada de vida útil y vuelve', '% cabezas gastan una jornada de vida útil y vuelven')} al garaje: todavía les queda.`,
          touched: siguen,
        });
      }
      for (const id of agotadas) {
        yield frame(day, {
          phase: 'desarmar',
          codeLine: 9,
          caption: `${id} agotó sus ${params.vidaUtil} jornadas de funcionamiento: entra al taller ${params.mantenimientoCabeza} días. No pasa por el garaje.`,
          touched: [id],
          tone: 'warning',
        });
      }
    }

    // ---------------------------------------------------------------- FASE 3
    const averiados = plan.filter((event) => event.dia === day);
    const cabezasAveriadas: string[] = [];
    const vagonesAveriados: string[] = [];
    const ausentes: string[] = [];

    for (const event of averiados) {
      const u = sim.units[event.id];
      if (!u || u.place !== 'garaje') {
        ausentes.push(event.id);
        continue;
      }
      const esCabeza = u.kind === 'cabeza';
      sim.unlinkDouble(esCabeza ? sim.garajeCabezas : sim.garajeVagones, event.id);
      u.place = 'taller';
      u.diasReparacion = esCabeza ? params.mantenimientoCabeza : params.reparacionVagon;
      sim.append(esCabeza ? sim.tallerCabezas : sim.tallerVagones, event.id);
      if (esCabeza) cabezasAveriadas.push(event.id);
      else vagonesAveriados.push(event.id);
    }

    if (vagonesAveriados.length) {
      yield frame(day, {
        phase: 'revision',
        codeLine: 13,
        caption: `La revisión encuentra ${agree(vagonesAveriados.length, '1 vagón averiado: sale', '% vagones averiados: salen')} de la lista doble del garaje y se ${agree(vagonesAveriados.length, 'encola', 'encolan')} en el taller ${params.reparacionVagon} días.`,
        touched: vagonesAveriados,
      });
    }
    for (const id of cabezasAveriadas) {
      yield frame(day, {
        phase: 'revision',
        codeLine: 13,
        caption: `${id} no pasa la revisión: al taller ${params.mantenimientoCabeza} días.`,
        touched: [id],
        tone: 'warning',
      });
    }
    if (ausentes.length) {
      yield frame(day, {
        phase: 'revision',
        codeLine: 12,
        caption: `Aviso: ${ausentes.join(', ')} figura en el plan pero no estaba disponible en el garaje. No se falla en silencio.`,
        touched: [],
        tone: 'warning',
      });
    }
    if (!averiados.length) {
      yield frame(day, {
        phase: 'revision',
        codeLine: 12,
        caption: 'La revisión del día no encuentra averías nuevas.',
      });
    }

    // ---------------------------------------------------------------- FASE 4
    let armados = 0;
    let faltanCabezas = 0;
    let faltanVagones = 0;

    for (let indice = 1; indice <= requeridos; indice += 1) {
      const capacidad = indice <= TRENES_LARGOS ? VAGONES_LARGO : VAGONES_CORTO;
      const id = `T${pad(indice, 2)}`;

      if (sim.garajeCabezas.size < 1) {
        faltanCabezas += 1;
        yield frame(day, {
          phase: 'conformar',
          codeLine: 17,
          caption: `${id} no se puede conformar: no queda ninguna cabeza en el garaje. No se toma nada para él, así ningún vagón queda a medio asignar.`,
          tone: 'warning',
        });
        continue;
      }
      if (sim.garajeVagones.size < capacidad) {
        faltanVagones += capacidad - sim.garajeVagones.size;
        yield frame(day, {
          phase: 'conformar',
          codeLine: 17,
          caption: `${id} no se puede conformar: necesita ${capacidad} vagones y en el garaje solo hay ${sim.garajeVagones.size}.`,
          tone: 'warning',
        });
        continue;
      }

      const train: Train = { id, capacidad, cabeza: null, vagones: chain(true) };
      const cabezaId = sim.takeFirst(sim.garajeCabezas)!;
      const cabeza = sim.unit(cabezaId);
      cabeza.place = 'tren';
      cabeza.trainId = id;
      train.cabeza = cabezaId;

      const tomados: string[] = [cabezaId];
      for (let k = 0; k < capacidad; k += 1) {
        const vagonId = sim.takeFirst(sim.garajeVagones)!;
        const vagon = sim.unit(vagonId);
        vagon.place = 'tren';
        vagon.trainId = id;
        sim.append(train.vagones, vagonId);
        tomados.push(vagonId);
      }

      sim.trains.push(train);
      armados += 1;

      yield frame(day, {
        phase: 'conformar',
        codeLine: 19,
        caption: `${id} conformado: cabeza ${cabezaId} (le quedan ${cabeza.vidaUtil} jornadas) y ${capacidad} vagones enlazados en su propia lista doble.`,
        touched: tomados,
      });
    }

    // ---------------------------------------------------------------- FASE 5
    const verdict: DayVerdict = {
      armados,
      requeridos,
      faltanCabezas,
      faltanVagones,
      ok: armados === requeridos,
    };

    const motivo = verdict.ok
      ? `Los ${requeridos} trenes salen a operar.`
      : faltanCabezas > 0
        ? `${agree(faltanCabezas, 'Faltó 1 cabeza', 'Faltaron % cabezas')}: hay ${sim.tallerCabezas.size} en el taller.`
        : `${agree(faltanVagones, 'Faltó 1 vagón', 'Faltaron % vagones')}: hay ${sim.tallerVagones.size} en el taller.`;

    yield frame(day, {
      phase: 'informe',
      codeLine: 21,
      caption: `Día ${day}: ${armados} de ${requeridos} trenes en funcionamiento. ${motivo}`,
      tone: verdict.ok ? 'success' : 'warning',
      verdict,
    });
  }
}

/** Ejecuta la semana completa y devuelve sus fotogramas. */
export function renderWeek(params: MetroParams): MetroFrame[] {
  return [...runWeek(params)];
}

/**
 * Fotograma en reposo: la flota entera en el garaje, antes de que empiece la semana.
 * Es el estado que se mira mientras se ajustan los parámetros.
 */
export function idleWeek(params: MetroParams): MetroFrame {
  const sim = new Sim(params);
  return {
    day: 0,
    phase: 'taller',
    garajeCabezas: sim.order(sim.garajeCabezas),
    garajeVagones: sim.order(sim.garajeVagones),
    tallerCabezas: [],
    tallerVagones: [],
    trains: [],
    units: sim.unitViews(),
    touched: [],
    codeLine: -1,
    caption: `Flota en el garaje: ${params.cabezas} cabezas y ${params.vagones} vagones. Pulsa Renderizar la semana.`,
    tone: 'neutral',
    verdict: null,
    conserva: true,
  };
}
