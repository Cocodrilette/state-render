/** Una sola fuente para «¿el usuario quiere animaciones?». */
export const prefersReducedMotion =
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function dur(ms: number): number {
  return prefersReducedMotion ? 0 : ms;
}
