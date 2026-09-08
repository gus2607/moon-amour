import { useMemo, useRef } from "react";
import { ANNIVERSARY, NEXT_ANNIVERSARY } from "./model/dates.js";
import { hero, chapters, gallery, letter, closing } from "./model/story.js";
import { useCountdown } from "./controller/useCountdown.js";
import { useSmoothScroll } from "./controller/useSmoothScroll.js";
import { useScrollY } from "./controller/useScrollY.js";
import { useScrollBackground } from "./controller/useScrollBackground.js";
import { useScrollPaintings } from "./controller/useScrollPaintings.js";

import Hero from "./view/Hero.jsx";
import Chapter from "./view/Chapter.jsx";
import Gallery from "./view/Gallery.jsx";
import LetterSection from "./view/LetterSection.jsx";
import Closing from "./view/Closing.jsx";
import ScrollBackground from "./view/ScrollBackground.jsx";
import ThreeBackground from "./view/ThreeBackground.jsx";

export default function App() {
  useSmoothScroll();
  const timeSince = useCountdown(ANNIVERSARY, "since");
  const timeUntilNext = useCountdown(NEXT_ANNIVERSARY, "until");

  const heroRef = useRef(null);
  const dawnRef = useRef(null);
  const middayRef = useRef(null);
  const goldRef = useRef(null);
  const pauseRef = useRef(null);
  const sunsetRef = useRef(null);
  const galleryRef = useRef(null);
  const letterRef = useRef(null);
  const closingRef = useRef(null);

  // Refs themselves are stable across renders — memoize the wrapper object
  // too, or useScrollBackground's effect (keyed on this object) would see a
  // "new" value every render and re-run forever.
  const sectionRefs = useMemo(
    () => ({
      hero: heroRef,
      dawn: dawnRef,
      midday: middayRef,
      gold: goldRef,
      pause: pauseRef,
      sunset: sunsetRef,
      gallery: galleryRef,
      letter: letterRef,
      closing: closingRef,
    }),
    []
  );
  const scrollY = useScrollY();
  const background = useScrollBackground(sectionRefs, scrollY);
  const paintingsRef = useScrollPaintings(sectionRefs, scrollY);

  return (
    <>
      <ScrollBackground background={background} />
      <ThreeBackground paintingsRef={paintingsRef} />
      <div aria-hidden="true" className="painting-vignette" />

      <Hero content={hero} countdown={timeSince} ref={sectionRefs.hero} />
      {chapters.map((chapter) => (
        <Chapter key={chapter.id} chapter={chapter} ref={sectionRefs[chapter.variant]} />
      ))}
      <Gallery content={gallery} ref={sectionRefs.gallery} />
      <LetterSection content={letter} ref={sectionRefs.letter} />
      <Closing content={closing} countdown={timeUntilNext} ref={sectionRefs.closing} />
    </>
  );
}
