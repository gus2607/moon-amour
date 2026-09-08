import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Cinematic entrance for the hero: a staggered timeline on mount, then a
// scroll-scrubbed fade/scale as the section leaves view. Scoped with
// gsap.context so all tweens (including the ScrollTrigger) get cleaned up
// together on unmount — otherwise ScrollTrigger instances leak across
// React StrictMode's double-invoke in dev.
export function useHeroTimeline(sectionRef) {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const section = sectionRef.current;
    if (reduceMotion || !section) return;

    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from(".hero-eyebrow", { opacity: 0, y: 18, duration: 0.7 })
        .from("h1", { opacity: 0, y: 32, duration: 0.9 }, "-=0.45")
        .from(".hero-sub", { opacity: 0, y: 24, duration: 0.8 }, "-=0.55")
        .from(".counter", { opacity: 0, y: 20, duration: 0.7 }, "-=0.5")
        .from(".counter-note", { opacity: 0, y: 16, duration: 0.6 }, "-=0.45");

      gsap.to(section, {
        opacity: 0.15,
        scale: 0.94,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    }, section);

    return () => ctx.revert();
  }, [sectionRef]);
}
