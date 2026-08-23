import type { Tone } from './core/types';

export const SPEEDS = [0.5, 1, 2, 4];
const BASE_INTERVAL = 900;

export type StripMark = 'on' | 'off' | 'gone';

/** Una columna de la tira de fotogramas: una marca por entidad que se sigue. */
export interface StripCell {
  tone: Tone;
  marks: StripMark[];
}

/**
 * Transporte de fotogramas, sin saber qué hay dentro de un fotograma.
 *
 * La premisa de la plataforma es que una operación ya se ejecutó entera antes de
 * empezar la animación, así que reproducir, pausar, retroceder y arrastrar la línea
 * de tiempo son lo mismo: cambiar un índice. Eso no depende de si el fotograma
 * retrata una lista o seis, y por eso vive aquí: los controles y la tira se
 * construyen contra esta clase, no contra una estructura concreta.
 */
export abstract class Playback {
  index = $state(0);
  playing = $state(false);
  speed = $state(1);

  #timer: ReturnType<typeof setTimeout> | null = null;

  /** Cuántos fotogramas tiene lo que está cargado. */
  abstract get frameCount(): number;
  /** Narración del fotograma actual. */
  abstract get caption(): string;
  abstract get tone(): Tone;
  /** Reducción del fotograma a marcas para la tira. */
  abstract get stripCells(): StripCell[];

  get atEnd(): boolean {
    return this.index >= this.frameCount - 1;
  }

  get hasRun(): boolean {
    return this.frameCount > 0;
  }

  /** Deja el transporte en el primer fotograma de una tanda nueva. */
  protected rewind() {
    this.pause();
    this.index = 0;
  }

  play() {
    if (!this.frameCount) return;
    if (this.atEnd) this.index = 0;
    this.playing = true;
    this.#schedule();
  }

  pause() {
    this.playing = false;
    if (this.#timer !== null) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
  }

  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }

  stepForward() {
    this.pause();
    if (this.index < this.frameCount - 1) this.index += 1;
  }

  stepBack() {
    this.pause();
    if (this.index > 0) this.index -= 1;
  }

  seek(index: number) {
    this.pause();
    this.index = Math.min(Math.max(index, 0), Math.max(this.frameCount - 1, 0));
  }

  setSpeed(speed: number) {
    this.speed = speed;
    if (this.playing) this.#schedule();
  }

  #schedule() {
    if (this.#timer !== null) clearTimeout(this.#timer);
    this.#timer = setTimeout(() => {
      this.#timer = null;
      if (!this.playing) return;
      if (this.index >= this.frameCount - 1) {
        this.playing = false;
        return;
      }
      this.index += 1;
      this.#schedule();
    }, BASE_INTERVAL / this.speed);
  }
}
