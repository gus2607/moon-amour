import { forwardRef } from "react";
import Reveal from "./Reveal.jsx";
import Countdown from "./Countdown.jsx";

const Closing = forwardRef(function Closing({ content, countdown }, ref) {
  return (
    <section ref={ref} className="closing">
      <div className="wrap">
        <Reveal as="p" className="eyebrow" style={{ color: "var(--gold-100)" }}>
          {content.eyebrow}
        </Reveal>
        <Reveal as="h2">{content.title}</Reveal>
        <Reveal as="p" className="measure">
          {content.body}
        </Reveal>

        <Reveal>
          <Countdown
            value={countdown}
            className="counter next-anniv"
            ariaLabel="Tiempo para nuestro próximo aniversario"
          />
        </Reveal>
        <Reveal as="p" className="counter-note">
          {content.counterNote}
        </Reveal>

        <Reveal as="p" className="signature">
          {content.signature}
        </Reveal>
        <Reveal as="p" className="made-with">
          {content.madeWith}
        </Reveal>
      </div>
    </section>
  );
});

export default Closing;
