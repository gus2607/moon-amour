import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ANNIVERSARY, NEXT_ANNIVERSARY } from "./model/dates.js";
import { hero, chapters, gallery, letter, closing } from "./model/story.js";
import { useCountdown } from "./controller/useCountdown.js";
import { useSmoothScroll } from "./controller/useSmoothScroll.js";
import { useScrollY } from "./controller/useScrollY.js";
import { useScrollBackground } from "./controller/useScrollBackground.js";
import { useScrollPaintings } from "./controller/useScrollPaintings.js";
import { useUploadedMedia } from "./controller/useUploadedMedia.js";

import Hero from "./view/Hero.jsx";
import Chapter from "./view/Chapter.jsx";
import DiaryPrompt from "./view/DiaryPrompt.jsx";
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

  // Shared across Gallery's own "+" and DiaryPrompt (below Chapter 5) so
  // either upload entry point lands in the same carousel and the same
  // success toast — one useUploadedMedia() instance, both read/write it.
  const { items: uploaded, addFiles, uploading } = useUploadedMedia();
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  async function handleUpload(files) {
    const { added } = await addFiles(files);
    if (added > 0) {
      clearTimeout(toastTimerRef.current);
      setToast(added === 1 ? "Recuerdo subido con éxito" : `${added} recuerdos subidos con éxito`);
      toastTimerRef.current = setTimeout(() => setToast(null), 3200);
    }
    return { added };
  }

  return (
    <>
      <ScrollBackground background={background} />
      <ThreeBackground paintingsRef={paintingsRef} />
      <div aria-hidden="true" className="painting-vignette" />

      <Hero content={hero} countdown={timeSince} ref={sectionRefs.hero} />
      {chapters.map((chapter) => (
        <Fragment key={chapter.id}>
          <Chapter chapter={chapter} ref={sectionRefs[chapter.variant]} />
          {chapter.id === "ch05" && <DiaryPrompt onUpload={handleUpload} uploading={uploading} />}
        </Fragment>
      ))}
      <Gallery content={gallery} uploaded={uploaded} onUpload={handleUpload} uploading={uploading} ref={sectionRefs.gallery} />
      <LetterSection content={letter} ref={sectionRefs.letter} />
      <Closing content={closing} countdown={timeUntilNext} ref={sectionRefs.closing} />

      <div className="toast-slot" aria-live="polite">
        {toast && <div className="toast">{toast}</div>}
      </div>
    </>
  );
}
