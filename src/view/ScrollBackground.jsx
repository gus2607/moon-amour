import { motion } from "framer-motion";

// Fixed full-viewport layer painted by the scroll-driven color from
// useScrollBackground. Sits behind every section (z-index -2), so
// individual sections stay transparent and this is the only thing that
// ever paints a background color — that's what makes the transition
// genuinely continuous instead of a per-section hand-off.
export default function ScrollBackground({ background }) {
  return (
    <motion.div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -2,
        backgroundColor: background,
      }}
    />
  );
}
