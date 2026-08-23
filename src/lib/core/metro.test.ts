import { describe, expect, it } from 'vitest';
import {
  CABEZAS_REQUERIDAS,
  DEFAULT_PARAMS,
  DIAS,
  VAGONES_REQUERIDOS,
  buildPlan,
  feasibility,
  renderWeek,
  type MetroFrame,
  type MetroParams,
} from './metro';

function params(overrides: Partial<MetroParams> = {}): MetroParams {
  return { ...DEFAULT_PARAMS, ...overrides };
}

/** Todo lo que un fotograma promete tiene que ser cierto. */
function expectConsistent(frame: MetroFrame, p: MetroParams) {
  expect(frame.caption.length).toBeGreaterThan(0);
  expect(frame.codeLine).toBeGreaterThanOrEqual(0);
  expect(frame.day).toBeGreaterThanOrEqual(1);
  expect(frame.day).toBeLessThanOrEqual(DIAS);

  // Ningún id aparece dos veces dentro de una misma estructura ni entre estructuras.
  const seen = new Set<string>();
  const enTrenes: string[] = [];
  for (const train of frame.trains) {
    if (train.cabeza) enTrenes.push(train.cabeza);
    enTrenes.push(...train.vagones);
    // Un tren conformado está completo: esa es la regla del enunciado.
    expect(train.vagones.length).toBe(train.capacidad);
    expect(train.cabeza).not.toBeNull();
  }
  const todos = [
    ...frame.garajeCabezas,
    ...frame.garajeVagones,
    ...frame.tallerCabezas,
    ...frame.tallerVagones,
    ...enTrenes,
  ];
  for (const id of todos) {
    expect(seen.has(id)).toBe(false);
    seen.add(id);
    expect(frame.units[id]).toBeDefined();
  }

  // Conservación: ningún nodo se pierde ni se duplica al migrar entre listas.
  expect(seen.size).toBe(p.cabezas + p.vagones);
  expect(frame.conserva).toBe(true);

  // El lugar que declara cada equipo coincide con la lista en la que está.
  for (const id of frame.garajeCabezas) expect(frame.units[id].place).toBe('garaje');
  for (const id of frame.tallerVagones) expect(frame.units[id].place).toBe('taller');
  for (const id of enTrenes) expect(frame.units[id].place).toBe('tren');

  // Lo que el fotograma dice estar tocando tiene que existir.
  for (const id of frame.touched) expect(frame.units[id]).toBeDefined();
}

describe('escenario del metro', () => {
  it('emite fotogramas para los cinco días', () => {
    const frames = renderWeek(params());
    expect(frames.length).toBeGreaterThan(20);
    const dias = new Set(frames.map((frame) => frame.day));
    expect([...dias].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('mantiene la conservación de nodos en todos los fotogramas', () => {
    const p = params();
    for (const frame of renderWeek(p)) expectConsistent(frame, p);
  });

  it('reproduce el informe de la semana del taller', () => {
    // El mismo resultado que la simulación en Python: la semana se cae el día 4.
    const verdicts = renderWeek(params())
      .filter((frame) => frame.verdict)
      .map((frame) => frame.verdict!.armados);
    expect(verdicts).toEqual([10, 10, 10, 6, 1]);
  });

  it('el cuello de botella son las cabezas, no los vagones', () => {
    const informes = renderWeek(params()).filter((frame) => frame.verdict);
    const dia4 = informes[3].verdict!;
    expect(dia4.faltanCabezas).toBe(4);
    expect(dia4.faltanVagones).toBe(0);
  });

  it('la cota por conteo es necesaria pero no suficiente', () => {
    // El conteo de dias-cabeza da 17 = ceil(50 / 3): por debajo es imposible.
    const minimas = feasibility(params()).cabezasMinimas;
    expect(minimas).toBe(17);

    // Pero cumplir la cota no basta: el plan de averias tambien gasta cabezas, y
    // una cabeza agotada el dia 5 ya no se recicla. Con 17 el dia 5 se queda corto.
    const con17 = renderWeek(params({ cabezas: 17 }))
      .filter((frame) => frame.verdict)
      .map((frame) => frame.verdict!.armados);
    expect(con17).toEqual([10, 10, 10, 10, 9]);

    // El minimo real es 18.
    const con18 = renderWeek(params({ cabezas: 18 }))
      .filter((frame) => frame.verdict)
      .map((frame) => frame.verdict!.ok);
    expect(con18).toEqual([true, true, true, true, true]);
  });

  it('mas vida util por cabeza tambien resuelve la semana', () => {
    // La otra palanca: si cada cabeza aguanta 5 jornadas, 13 cabezas alcanzan.
    const verdicts = renderWeek(params({ vidaUtil: 5 }))
      .filter((frame) => frame.verdict)
      .map((frame) => frame.verdict!.ok);
    expect(verdicts).toEqual([true, true, true, true, true]);
  });

  it('el analisis de factibilidad cuadra con los numeros del enunciado', () => {
    const f = feasibility(params());
    expect(f.diasCabezaDisponibles).toBe(39); // 13 cabezas x 3 jornadas
    expect(f.diasCabezaRequeridos).toBe(50); // 10 cabezas x 5 dias
    expect(f.deficitCabeza).toBe(11);
    expect(f.holguraVagon).toBe(50);
    expect(f.imposible).toBe(true);
    expect(f.vagonesSuficientes).toBe(true);
  });

  it('requiere 10 cabezas y 90 vagones por dia', () => {
    expect(CABEZAS_REQUERIDAS).toBe(10);
    expect(VAGONES_REQUERIDOS).toBe(90);
  });

  it('el plan de averias no inventa equipos que no existen', () => {
    const p = params({ cabezas: 11, vagones: 92 });
    const plan = buildPlan(p);
    expect(plan.length).toBeGreaterThan(0);
    for (const event of plan) {
      const numero = Number(event.id.slice(1));
      expect(numero).toBeLessThanOrEqual(event.id.startsWith('C') ? p.cabezas : p.vagones);
    }
  });

  it('sobrevive a una flota demasiado pequena para armar un solo tren', () => {
    const p = params({ cabezas: 1, vagones: 8 });
    const frames = renderWeek(p);
    for (const frame of frames) expectConsistent(frame, p);
    const armados = frames.filter((f) => f.verdict).map((f) => f.verdict!.armados);
    // Con 8 vagones no alcanza para un tren largo, pero si para uno corto.
    expect(Math.max(...armados)).toBeLessThanOrEqual(1);
  });
});
