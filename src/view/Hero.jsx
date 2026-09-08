import { forwardRef } from "react";
import { useHeroTimeline } from "../controller/useHeroTimeline.js";
import Countdown from "./Countdown.jsx";

const Hero = forwardRef(function Hero({ content, countdown }, ref) {
  useHeroTimeline(ref);

  return (
    <section ref={ref} className="hero">
      <div className="wrap">
        <p className="eyebrow hero-eyebrow">{content.eyebrow}</p>
        <h1>{content.title}</h1>
        <p className="hero-sub">{content.subtitle}</p>

        <Countdown value={countdown} ariaLabel="Tiempo desde nuestro aniversario" />
      </div>
      <div className="scroll-cue">
        <span>Desliza</span>
        <svg className="heart" viewBox="0 0 32 29" aria-hidden="true">
          <path d="M16 28C9 22.5 1 16 1 9.2 1 4.2 4.6 1 9 1c2.7 0 5.3 1.5 7 4 1.7-2.5 4.3-4 7-4 4.4 0 8 3.2 8 8.2C31 16 23 22.5 16 28Z" />
        </svg>
      </div>
    </section>
  );
});

export default Hero;
