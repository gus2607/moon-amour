import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ANNIVERSARY, NEXT_ANNIVERSARY } from "./model/dates.js";
import { hero, chapters, gallery, letter, closing } from "./model/story.js";
import { useCountdown } from "./controller/useCountdown.js";
import { useSmoothScroll } from "./controller/useSmoothScroll.js";
import { useScrollY } from "./controller/useScrollY.js";
import { useScrollBackground } from "./controller/useScrollBackground.js";
import { useScrollPaintings } from "./controller/useScrollPaintings.js";
import { useUploadedMedia } from "./controller/useUploadedMedia.js";
import { useAuth } from "./controller/useAuth.js";
import { useStorySubmissions } from "./controller/useStorySubmissions.js";
import { useChapters } from "./controller/useChapters.js";
import { useSongs } from "./controller/useSongs.js";

import Hero from "./view/Hero.jsx";
import Chapter from "./view/Chapter.jsx";
import DiaryPrompt from "./view/DiaryPrompt.jsx";
import Gallery from "./view/Gallery.jsx";
import ChapterManager from "./view/ChapterManager.jsx";
import VinylPlayer from "./view/VinylPlayer.jsx";
import LetterSection from "./view/LetterSection.jsx";
import Closing from "./view/Closing.jsx";
import ScrollBackground from "./view/ScrollBackground.jsx";
import ThreeBackground from "./view/ThreeBackground.jsx";

// Only used while the chapters table is still empty (see the fallback
// below) — once seeded, diary_anchor on the row itself decides this.
const DIARY_PROMPT_AFTER = "ch05";

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

  // Gallery (auto-publish, per docs/BACKEND_PLAN.md req #2) and the diary
  // (pending review, req #3) are separate stores once Supabase is
  // configured — see useUploadedMedia.js / useStorySubmissions.js. Both
  // gate on Supabase Auth (req #4 — only the two accounts Gustavo creates
  // can sign in) via AuthGate.
  const auth = useAuth();
  const { items: uploaded, addFiles, uploading, setHidden, removeItem } = useUploadedMedia();
  const visibleUploaded = useMemo(() => uploaded.filter((item) => !item.hidden), [uploaded]);
  const storySubmissions = useStorySubmissions();
  const chaptersData = useChapters();
  const songsData = useSongs();
  const visibleSongs = useMemo(() => songsData.entries.filter((entry) => !entry.hidden), [songsData.entries]);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  // The DB (chapters table) is the sole source once it has rows — the
  // static `chapters` array from story.js only shows while it's still
  // empty, same fallback idiom Gallery uses for content.slots/album_photos.
  const usingFallback = chaptersData.entries.length === 0;
  const timelineChapters = useMemo(() => {
    if (usingFallback) return chapters;
    return chaptersData.entries.map((entry) => ({
      id: entry.id,
      variant: entry.variant || undefined,
      num: entry.num,
      title: entry.title,
      lede: entry.description,
      beats: entry.body ? [{ text: entry.body }] : [],
      diaryAnchor: entry.diary_anchor,
    }));
  }, [usingFallback, chaptersData.entries]);

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
      <ChapterManager
        auth={auth}
        chapters={chaptersData}
        album={{ items: uploaded, setHidden, removeItem, addFiles: handleUpload, uploading }}
        songs={songsData}
      />
      <VinylPlayer songs={visibleSongs} />

      <Hero content={hero} countdown={timeSince} ref={sectionRefs.hero} />
      {timelineChapters.map((chapter) => {
        const showDiaryPrompt = usingFallback ? chapter.id === DIARY_PROMPT_AFTER : chapter.diaryAnchor;
        return (
          <Fragment key={chapter.id}>
            <Chapter chapter={chapter} ref={chapter.variant ? sectionRefs[chapter.variant] : undefined} />
            {showDiaryPrompt && (
              <DiaryPrompt
                auth={auth}
                storySubmissions={storySubmissions}
                legacyUpload={handleUpload}
                legacyUploading={uploading}
              />
            )}
          </Fragment>
        );
      })}
      <Gallery
        content={gallery}
        uploaded={visibleUploaded}
        onUpload={handleUpload}
        uploading={uploading}
        auth={auth}
        ref={sectionRefs.gallery}
      />
      <LetterSection content={letter} ref={sectionRefs.letter} />
      <Closing content={closing} countdown={timeUntilNext} ref={sectionRefs.closing} />

      <div className="toast-slot" aria-live="polite">
        {toast && <div className="toast">{toast}</div>}
      </div>
    </>
  );
}
