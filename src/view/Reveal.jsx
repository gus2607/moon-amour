import { motion, useReducedMotion } from "framer-motion";

// Scroll-triggered fade/rise, replaces the old IntersectionObserver script.
// Respects prefers-reduced-motion automatically via useReducedMotion.
export default function Reveal({ as = "div", className, style, children, delay = 0 }) {
  const reduceMotion = useReducedMotion();
  const Component = motion[as] ?? motion.div;

  if (reduceMotion) {
    const Plain = as;
    return (
      <Plain className={className} style={style}>
        {children}
      </Plain>
    );
  }

  return (
    <Component
      className={className}
      style={style}
      initial={{ opacity: 0.001, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.15, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1], delay }}
    >
      {children}
    </Component>
  );
}
