import { useEffect, useRef } from "react";
import { PAINTING_ORDER } from "../model/paintings.js";
import { SECTION_ORDER, BOUNDARY_PRE_INSET_PX, BOUNDARY_POST_INSET_PX } from "../model/backgroundStops.js";

// Mirrors useScrollBackground's measure-once/interpolate-on-scroll approach,
// but instead of mixing colors it tracks which two paintings straddle the
// current scroll position and how far between them we are. Each section
// holds its own painting fully visible except near its top/bottom edge
// (same insets the color background uses), where it crossfades into the
// neighboring section's painting.
//
// Written into a plain mutable ref rather than a MotionValue: the Three.js
// render loop already runs every frame regardless, so it just reads
// paintingsRef.current directly instead of paying for a subscription.
export function useScrollPaintings(sectionRefs, scrollY) {
  const paintingsRef = useRef({ currentIndex: 0, nextIndex: 0, mix: 0, zoomProgress: 0 });
  const breakpointsRef = useRef([]);
  // Full [top, top+height] span per painting's own section, independent of
  // the crossfade insets above — this is what drives the continuous
  // "zooming into the painting" dolly: it climbs 0 -> 1 across the *entire*
  // time a painting is on screen (not just the brief crossfade window), so
  // scrolling further into a section keeps pushing the camera in, then the
  // next section starts back at 0 (zoomed out) the moment it takes over.
  const spansRef = useRef({});

  useEffect(() => {
    function measure() {
      const points = [];
      const spans = {};
      SECTION_ORDER.forEach((name, index) => {
        const el = sectionRefs[name]?.current;
        if (!el || !PAINTING_ORDER.includes(name)) return;
        const top = el.offsetTop;
        const height = el.offsetHeight;
        const maxInset = Math.max(0, height / 2 - 1);
        const paintingIndex = PAINTING_ORDER.indexOf(name);
        points.push({ y: top + Math.min(BOUNDARY_POST_INSET_PX, maxInset), index: paintingIndex });
        points.push({ y: top + height - Math.min(BOUNDARY_PRE_INSET_PX, maxInset), index: paintingIndex });
        spans[paintingIndex] = { top, height };
      });
      points.sort((a, b) => a.y - b.y);
      if (points.length >= 2) breakpointsRef.current = points;
      if (Object.keys(spans).length) spansRef.current = spans;
    }

    function zoomProgressAt(y, index) {
      const span = spansRef.current[index];
      if (!span || span.height <= 0) return 0;
      return Math.min(Math.max((y - span.top) / span.height, 0), 1);
    }

    function applyAt(y) {
      const points = breakpointsRef.current;
      const state = paintingsRef.current;
      if (points.length < 2) return;

      if (y <= points[0].y) {
        state.currentIndex = state.nextIndex = points[0].index;
        state.mix = 0;
        state.zoomProgress = zoomProgressAt(y, points[0].index);
        return;
      }
      const last = points[points.length - 1];
      if (y >= last.y) {
        state.currentIndex = state.nextIndex = last.index;
        state.mix = 0;
        state.zoomProgress = zoomProgressAt(y, last.index);
        return;
      }
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i];
        const b = points[i + 1];
        if (y >= a.y && y <= b.y) {
          state.currentIndex = a.index;
          state.nextIndex = b.index;
          const mix = a.index === b.index ? 0 : (y - a.y) / (b.y - a.y);
          state.mix = mix;
          // Inside a crossfade (a.index !== b.index), the outgoing painting's
          // zoom keeps climbing toward 1 right up to the boundary while the
          // incoming painting's own span-based zoom would start back at 0 —
          // switching from one to the other at that single shared y produces
          // a hard snap. Easing this value down by (1 - mix) makes it hit
          // exactly 0 by the time mix reaches 1, matching the next section's
          // starting zoom and removing the jump.
          const raw = zoomProgressAt(y, a.index);
          state.zoomProgress = a.index === b.index ? raw : raw * (1 - mix);
          return;
        }
      }
    }

    measure();
    applyAt(scrollY.get());
    window.addEventListener("resize", measure);
    const settleTimer = setTimeout(measure, 600);

    const unsubscribe = scrollY.on("change", applyAt);

    return () => {
      window.removeEventListener("resize", measure);
      clearTimeout(settleTimer);
      unsubscribe();
    };
  }, [sectionRefs, scrollY]);

  return paintingsRef;
}
