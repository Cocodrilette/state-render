import { prefersReducedMotion } from './motion';

/**
 * Interpolador de posiciones horizontales. Celdas, enlaces y etiquetas leen de aquí,
 * así que se mueven juntos: si las celdas se deslizaran por CSS y los enlaces se
 * redibujaran de golpe, el trazo se despegaría de las celdas a media animación.
 */
export class Slide {
  /** Copia reactiva que consume la vista. */
  values = $state<Record<string, number>>({});

  #current: Record<string, number> = {};
  #targets: Record<string, number> = {};
  #frame = 0;

  set(targets: Record<string, number>) {
    this.#targets = targets;

    for (const key of Object.keys(targets)) {
      if (!(key in this.#current)) this.#current[key] = targets[key];
    }
    for (const key of Object.keys(this.#current)) {
      if (!(key in targets)) delete this.#current[key];
    }

    if (prefersReducedMotion) {
      this.#current = { ...targets };
      this.values = { ...targets };
      return;
    }

    this.values = { ...this.#current };
    this.#start();
  }

  get(key: string, fallback: number): number {
    return this.values[key] ?? fallback;
  }

  destroy() {
    if (this.#frame) cancelAnimationFrame(this.#frame);
    this.#frame = 0;
  }

  #start() {
    if (this.#frame) cancelAnimationFrame(this.#frame);
    this.#frame = requestAnimationFrame(this.#step);
  }

  #step = () => {
    let moving = false;
    for (const key of Object.keys(this.#current)) {
      const target = this.#targets[key];
      if (target === undefined) continue;
      const delta = target - this.#current[key];
      if (Math.abs(delta) < 0.5) {
        this.#current[key] = target;
        continue;
      }
      this.#current[key] += delta * 0.24;
      moving = true;
    }

    this.values = { ...this.#current };
    this.#frame = moving ? requestAnimationFrame(this.#step) : 0;
  };
}
