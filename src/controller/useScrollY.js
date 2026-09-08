import { useEffect } from "react";
import { useMotionValue } from "framer-motion";

// framer-motion's own useScroll() wasn't notifying subscribers reliably in
// this app (rAF-driven Lenis scrolling didn't trigger its updates) — this
// drives an equivalent MotionValue by hand from a plain native scroll
// listener, which ScrollBackground consumes.
export function useScrollY() {
  const scrollY = useMotionValue(typeof window !== "undefined" ? window.scrollY : 0);

  useEffect(() => {
    let frame = null;
    function onScroll() {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        scrollY.set(window.scrollY);
        frame = null;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [scrollY]);

  return scrollY;
}
