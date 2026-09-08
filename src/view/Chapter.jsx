import { forwardRef, memo } from "react";
import Reveal from "./Reveal.jsx";

const Chapter = forwardRef(function Chapter({ chapter }, ref) {
  const isPause = chapter.variant === "pause";

  return (
    <section ref={ref} className={`chapter chapter--${chapter.variant}`}>
      {isPause && <div className="stars" aria-hidden="true" />}
      <div className="wrap">
        <Reveal as="p" className="chapter-num">
          {chapter.num}
        </Reveal>
        <Reveal as="h2">{chapter.title}</Reveal>

        {chapter.lede && (
          <Reveal as="p" className="chapter-lede">
            {chapter.lede}
          </Reveal>
        )}
        {chapter.ledeExtra && (
          <Reveal
            as="p"
            className="chapter-lede"
            style={{ marginTop: 14, fontStyle: "italic", color: "var(--gold-100)" }}
          >
            {chapter.ledeExtra}
          </Reveal>
        )}

        {chapter.beats?.map((beat) => (
          <Reveal as="div" className="beat" key={beat.label}>
            <p className="beat-label">{beat.label}</p>
            <p>{beat.text}</p>
          </Reveal>
        ))}

        {chapter.tags && (
          <Reveal as="div" className="tagrow">
            {chapter.tags.map((tag) => (
              <span className="tag" key={tag}>
                {tag}
              </span>
            ))}
          </Reveal>
        )}
      </div>
    </section>
  );
});

export default memo(Chapter);
