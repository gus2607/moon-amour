import { forwardRef, memo } from "react";
import Reveal from "./Reveal.jsx";
import { useLetter } from "../controller/useLetter.js";

const LetterSection = forwardRef(function LetterSection({ content }, ref) {
  const { open, toggle } = useLetter();

  return (
    <section ref={ref} className="letter-section">
      <div className="wrap" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Reveal as="p" className="eyebrow">
          {content.eyebrow}
        </Reveal>
        <Reveal
          as="h2"
          style={{ fontStyle: "italic", fontSize: "clamp(1.7rem,4vw,2.4rem)", marginTop: 10 }}
        >
          {content.title}
        </Reveal>

        <Reveal>
          <button
            className="envelope"
            id="envelope"
            aria-expanded={open}
            aria-controls="letterPaper"
            onClick={toggle}
          >
            <span className="env-body" />
            <span className="env-flap" />
            <span className="seal">{content.seal}</span>
          </button>
        </Reveal>
        <Reveal as="p" className="env-hint">
          {content.hint}
        </Reveal>

        <div className={`letter-paper ${open ? "open" : ""}`} id="letterPaper">
          {content.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <p className="letter-sign">
            {content.signature.split("\n").map((line, i, arr) => (
              <span key={i}>
                {line}
                {i < arr.length - 1 && <br />}
              </span>
            ))}
          </p>
        </div>
      </div>
    </section>
  );
});

export default memo(LetterSection);
