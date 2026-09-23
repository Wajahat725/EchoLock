import Lenis from "@studio-freight/lenis";

const initLenis = (): Lenis => {
  const lenis = new Lenis({
    duration: 1.5, smooth: true,
    easing: (t: number): number => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  });

  function raf(time: number): void {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
  return lenis;
};
export default initLenis;