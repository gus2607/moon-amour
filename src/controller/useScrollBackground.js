import { useEffect, useRef } from "react";
import { useMotionValue } from "framer-motion";
import {
  SECTION_COLOR_STOPS,
  SECTION_ORDER,
  BOUNDARY_PRE_INSET_PX,
  BOUNDARY_POST_INSET_PX,
} from "../model/backgroundStops.js";

const FALLBACK_COLOR = "#160f24";

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixHex(hexA, hexB, t) {
  const [r1, g1, b1] = hexToRgb(hexA);
  const [r2, g2, b2] = hexToRgb(hexB);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function colorAtScrollY(y, breakpoints) {
  if (!breakpoints.length) return FALLBACK_COLOR;
  if (y <= breakpoints[0].y) return breakpoints[0].color;
  const last = breakpoints[breakpoints.length - 1];
  if (y >= last.y) return last.color;
  for (let i = 0; i < breakpoints.length - 1; i++) {
    const a = breakpoints[i];
    const b = breakpoints[i + 1];
    if (y >= a.y && y <= b.y) {
      const t = (y - a.y) / (b.y - a.y);
      return mixHex(a.color, b.color, t);
    }
  }
  return last.color;
}

// Measures where each section actually lands on the page, then builds one
// flat list of {y, color} breakpoints spanning the whole document, and
// interpolates between them manually on every scroll tick. (framer-motion's
// array-form useTransform captures its input/output ranges once at mount
// and doesn't pick up ranges computed later from a layout measurement, so
// this drives the MotionValue by hand instead — same result, no gotcha.)
export function useScrollBackground(sectionRefs, scrollY) {
  const breakpointsRef = useRef([]);
  const background = useMotionValue(FALLBACK_COLOR);

  useEffect(() => {
    function measure() {
      const points = [];
      SECTION_ORDER.forEach((name) => {
        const el = sectionRefs[name]?.current;
        const stops = SECTION_COLOR_STOPS[name];
        if (!el || !stops) return;
        const top = el.offsetTop;
        const height = el.offsetHeight;
        const maxInset = Math.max(0, height / 2 - 1);
        stops.forEach((stop) => {
          let inset = 0;
          if (stop.fraction === 0) inset = Math.min(BOUNDARY_POST_INSET_PX, maxInset);
          if (stop.fraction === 1) inset = -Math.min(BOUNDARY_PRE_INSET_PX, maxInset);
          points.push({ y: top + stop.fraction * height + inset, color: stop.color });
        });
      });
      points.sort((a, b) => a.y - b.y);

      const cleaned = [];
      for (const p of points) {
        if (cleaned.length === 0 || p.y > cleaned[cleaned.length - 1].y) {
          cleaned.push(p);
        }
      }
      if (cleaned.length >= 2) {
        breakpointsRef.current = cleaned;
        background.set(colorAtScrollY(scrollY.get(), cleaned));
      }
    }

    measure();
    window.addEventListener("resize", measure);
    const settleTimer = setTimeout(measure, 600); // after images/fonts settle layout

    const unsubscribe = scrollY.on("change", (latest) => {
      background.set(colorAtScrollY(latest, breakpointsRef.current));
    });

    return () => {
      window.removeEventListener("resize", measure);
      clearTimeout(settleTimer);
      unsubscribe();
    };
  }, [sectionRefs, scrollY, background]);

  return background;
}
