import {
  DEFAULT_PARAMS,
  METRO_PARAMS,
  feasibility,
  idleWeek,
  renderWeek,
  type Feasibility,
  type MetroFrame,
  type MetroParams,
} from './core/metro';
import type { Tone } from './core/types';
import { Playback, type StripCell, type StripMark } from './playback.svelte';

/**
 * Reproductor del escenario del metro. La semana entera se renderiza de una vez y
 * después solo se recorre, igual que una operación de lista: el transporte lo aporta
 * `Playback` y aquí queda lo que sabe del escenario — los parámetros de la flota.
 *
 * Los parámetros son la parte jugable: subir las cabezas o su vida útil y volver a
 * renderizar es la forma de ver de dónde sale el cuello de botella.
 */
export class MetroPlayer extends Playback {
  params = $state<MetroParams>({ ...DEFAULT_PARAMS });
  frames = $state<MetroFrame[]>([]);

  readonly definitions = METRO_PARAMS;

  frame = $derived<MetroFrame>(this.frames.length ? this.frames[this.index] : idleWeek(this.params));
  feasibility = $derived<Feasibility>(feasibility(this.params));

  get frameCount(): number {
    return this.frames.length;
  }

  get caption(): string {
    return this.frame.caption;
  }

  get tone(): Tone {
    return this.frame.tone;
  }

  /**
   * Una marca por cabeza de tren. Se eligen las cabezas y no los vagones porque son
   * el recurso escaso: leída de corrido, la tira muestra la flota drenándose hacia el
   * taller a lo largo de la semana, que es exactamente el hallazgo del ejercicio.
   */
  get stripCells(): StripCell[] {
    return this.frames.map((frame) => {
      const touched = new Set(frame.touched);
      const marks: StripMark[] = [];
      for (const id of Object.keys(frame.units)) {
        const unit = frame.units[id];
        if (unit.kind !== 'cabeza') continue;
        marks.push(touched.has(id) ? 'on' : unit.place === 'taller' ? 'gone' : 'off');
      }
      return { tone: frame.tone, marks };
    });
  }

  setParam(key: string, value: number) {
    const definition = this.definitions.find((arg) => arg.key === key);
    if (!definition) return;
    const clamped = Math.min(Math.max(Math.round(value), definition.min), definition.max);
    this.params = { ...this.params, [key]: clamped };
    // Los fotogramas viejos describen otra flota: se descartan en vez de mentir.
    this.frames = [];
    this.rewind();
  }

  /** Renderiza la semana completa y empieza a reproducirla. */
  render() {
    this.rewind();
    this.frames = renderWeek({ ...this.params });
    if (this.frames.length > 1) this.play();
  }

  reset() {
    this.rewind();
    this.params = { ...DEFAULT_PARAMS };
    this.frames = [];
  }
}
