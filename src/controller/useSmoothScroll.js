import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Buttery inertia scrolling across the whole page. Skips entirely for
// prefers-reduced-motion so we don't fight that preference.
//
// Lenis intercepts the scroll and drives it manually, so ScrollTrigger
// (which measures native scroll) would drift out of sync without help:
// we feed it Lenis's scroll events and let GSAP's ticker drive Lenis's
// own raf loop instead of running a second one.
export function useSmoothScroll() {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
    });

    lenis.on("scroll", ScrollTrigger.update);

    function onTick(time) {
      lenis.raf(time * 1000);
    }
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(onTick);
      lenis.destroy();
    };
  }, []);
}
