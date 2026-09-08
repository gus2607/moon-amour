// Color stops that drive the continuous scroll-linked background (see
// controller/useScrollBackground.js). Each section lists its own internal
// gradient as { fraction: 0..1, color } pairs, reusing the same hex values
// the original per-section CSS gradients used — this is the single source
// of truth for the page's day-cycle color story.
export const SECTION_COLOR_STOPS = {
  hero: [
    { fraction: 0, color: "#160f24" },
    { fraction: 0.32, color: "#2b1a3d" },
    { fraction: 0.62, color: "#5a2f4d" },
    { fraction: 0.84, color: "#c9556b" },
    { fraction: 1, color: "#e8935b" },
  ],
  dawn: [
    { fraction: 0, color: "#2b1a3d" },
    { fraction: 0.55, color: "#4a2c53" },
    { fraction: 1, color: "#6d3a55" },
  ],
  midday: [
    { fraction: 0, color: "#6d3a55" },
    { fraction: 1, color: "#e8935b" },
  ],
  gold: [
    { fraction: 0, color: "#3d2249" },
    { fraction: 0.5, color: "#8a4360" },
    { fraction: 1, color: "#e8935b" },
  ],
  pause: [
    { fraction: 0, color: "#160f24" },
    { fraction: 1, color: "#100a1c" },
  ],
  sunset: [
    { fraction: 0, color: "#2b1a3d" },
    { fraction: 0.55, color: "#c9556b" },
    { fraction: 1, color: "#e8935b" },
  ],
  gallery: [
    { fraction: 0, color: "#f6ecdc" },
    { fraction: 1, color: "#f6ecdc" },
  ],
  letter: [
    { fraction: 0, color: "#160f24" },
    { fraction: 1, color: "#1d1330" },
  ],
  closing: [
    { fraction: 0, color: "#1d1330" },
    { fraction: 0.45, color: "#3d2249" },
    { fraction: 0.85, color: "#c9556b" },
    { fraction: 1, color: "#e8935b" },
  ],
};

// Render order — must match the actual document order of the sections.
export const SECTION_ORDER = [
  "hero",
  "dawn",
  "midday",
  "gold",
  "pause",
  "sunset",
  "gallery",
  "letter",
  "closing",
];

// How far (px) the cross-fade at a section boundary reaches into the
// previous section vs. the next one. Biased so most of the blend resolves
// before the next section's heading text appears, keeping contrast safe.
export const BOUNDARY_PRE_INSET_PX = 300;
export const BOUNDARY_POST_INSET_PX = 180;
