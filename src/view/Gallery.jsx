import { forwardRef, memo, useEffect, useMemo, useRef, useState } from "react";
import Reveal from "./Reveal.jsx";
import UploadButton from "./UploadButton.jsx";
import AuthGate from "./AuthGate.jsx";
import Modal from "./Modal.jsx";
import StoryEntries, { StoryEntryForm } from "./StoryEntries.jsx";
import { useStoryEntries } from "../controller/useStoryEntries.js";

const Gallery = forwardRef(function Gallery(
  { content, uploaded, onUpload, uploading, auth, isInsider },
  ref
) {
  // Carousel is photos/videos only — documents (which can only land here via
  // the legacy shared-upload fallback while Supabase isn't configured, see
  // App.jsx's legacyUpload) are filtered out rather than shown as file tiles.
  //
  // Once scripts/seed-album.mjs has migrated the curated static slots into
  // album_photos, `uploaded` (fetched from the DB, see useAlbumMedia.js) holds
  // them plus everything added since — so the DB is the sole source, and
  // content.slots (the pre-migration static list) only shows while that table
  // is still empty.
  const slots = useMemo(() => {
    const fromDb = uploaded
      .filter((item) => item.type === "image" || item.type === "video")
      .map((item) => ({
        id: item.id,
        type: item.type,
        src: item.url,
        caption: item.name || "Un recuerdo que añadiste",
      }));
    return fromDb.length > 0 ? fromDb : content.slots;
  }, [content.slots, uploaded]);

  const storyEntries = useStoryEntries();

  return (
    <section ref={ref} className="gallery">
      <div className="wrap">
        <Reveal as="p" className="eyebrow">
          {content.eyebrow}
        </Reveal>
        <Reveal as="h2">{content.title}</Reveal>
        <Reveal as="p" className="chapter-lede">
          {content.lede}
        </Reveal>
      </div>

      <MediaCarousel items={slots} />

      <Reveal as="div" className="swipe-hint">
        <span className="swipe-hint-track" aria-hidden="true">
          <span className="swipe-hint-thumb" />
        </span>
        <span className="swipe-hint-label">{content.note}</span>
      </Reveal>

      {/* Everyone sees the carousel; only an unlocked browser (useInsiderAccess)
          is offered the way to add to it. One "+" covers both photos/videos
          and writing a new story entry — two separate buttons here read as
          a duplicate rather than two distinct actions. */}
      {isInsider && (
        <Reveal as="div" className="add-memory">
          <p className="add-memory-text">¿Quieres añadir más de nuestros momentos?</p>
          <AddMemoryModal
            auth={auth}
            onUpload={onUpload}
            uploading={uploading}
            onAddEntry={storyEntries.addEntry}
            entrySaving={storyEntries.saving}
          />
        </Reveal>
      )}

      <StoryEntries
        entries={storyEntries.entries}
        auth={auth}
        saving={storyEntries.saving}
        onSave={storyEntries.updateEntry}
      />
    </section>
  );
});

export default memo(Gallery);

// Same open-a-modal shape as DiaryPrompt.jsx's "+", but for the album
// (photos/videos, or a new story entry — both publish immediately) rather
// than the diary (pending review) — see AuthGate's `message` for the
// login-gated copy.
function AddMemoryModal({ auth, onUpload, uploading, onAddEntry, entrySaving }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="add-memory-btn"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label="Añadir a nuestra historia"
      >
        +
      </button>

      {open && (
        <Modal titleId="album-modal-title" title="Nuestro álbum" onClose={() => setOpen(false)}>
          <AuthGate auth={auth} message="Solo tú puedes añadir momentos — inicia sesión.">
            <UploadButton
              onUpload={onUpload}
              uploading={uploading}
              accept="image/*,video/*"
              label="Añadir fotos o videos"
            />
            <p className="modal-message">O escribe un capítulo nuevo:</p>
            <StoryEntryForm
              saving={entrySaving}
              submitLabel="Publicar"
              onSubmit={async (fields) => {
                const { ok } = await onAddEntry({ ...fields, author: auth.user?.email });
                if (ok) setOpen(false);
              }}
            />
          </AuthGate>
        </Modal>
      )}
    </>
  );
}

// Base drift speed (px/frame) the carousel idles at when nobody's touching
// it — negative because the drift loop below does `scrollLeft -= velocity`,
// so a negative velocity here means the track advances forward.
const DRIFT_SPEED = -0.45;
// How quickly a post-drag fling's velocity relaxes back to DRIFT_SPEED
// (0 = never settles, 1 = snaps instantly). Small on purpose so a hard
// flick still reads as a fling before the ambient drift reclaims it.
const DRIFT_RECOVERY = 0.02;

// One draggable horizontal row mixing every photo and video together. The
// item list renders three times back to back; once the scroll position
// (from touch, trackpad, wheel or mouse-drag) passes the middle copy's
// bounds, it silently jumps by exactly one copy-width — since the copies
// are identical, that jump is invisible and the row reads as an infinite
// loop in either direction.
//
// A single rAF loop drives continuous ambient motion (DRIFT_SPEED) at all
// times, not just after a drag: it also *is* the momentum handler — a
// mouse-drag release feeds it a fling velocity (touch/trackpad already get
// native momentum from the browser) which then eases back down to the
// ambient drift speed instead of decaying to a stop, so the row never sits
// still. Scroll-snap was removed entirely: snapping to the nearest tile
// after every scroll fought with both this motion and native momentum,
// which read as stutter.
function MediaCarousel({ items }) {
  const trackRef = useRef(null);
  const draggingRef = useRef(null);
  const driftFrameRef = useRef(null);
  const velocityRef = useRef(DRIFT_SPEED);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || items.length === 0) return;

    function setWidth() {
      return el.scrollWidth / 3;
    }
    let unit = setWidth();
    el.scrollLeft = unit;

    function onScroll() {
      if (draggingRef.current) return;
      if (el.scrollLeft < unit * 0.5) {
        el.scrollLeft += unit;
      } else if (el.scrollLeft > unit * 1.5) {
        el.scrollLeft -= unit;
      }
    }

    function onResize() {
      const ratio = el.scrollLeft / unit;
      unit = setWidth();
      el.scrollLeft = unit * ratio;
    }

    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    function drift() {
      driftFrameRef.current = requestAnimationFrame(drift);
      if (draggingRef.current) return;
      el.scrollLeft -= velocityRef.current;
      velocityRef.current += (DRIFT_SPEED - velocityRef.current) * DRIFT_RECOVERY;
    }

    // Gallery never unmounts, so without this the drift loop would run
    // every frame for the rest of the session the instant the visitor
    // scrolls past it — a permanent, unbounded rAF cost for a carousel
    // nobody's looking at. Only run it while actually on screen.
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (driftFrameRef.current == null) driftFrameRef.current = requestAnimationFrame(drift);
      } else if (driftFrameRef.current != null) {
        cancelAnimationFrame(driftFrameRef.current);
        driftFrameRef.current = null;
      }
    });
    observer.observe(el);

    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      observer.disconnect();
      if (driftFrameRef.current != null) cancelAnimationFrame(driftFrameRef.current);
    };
  }, [items]);

  function onPointerDown(e) {
    const el = trackRef.current;
    if (!el) return;
    draggingRef.current = {
      startX: e.clientX,
      startScroll: el.scrollLeft,
      lastX: e.clientX,
      lastT: performance.now(),
      velocity: 0,
    };
    el.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e) {
    const drag = draggingRef.current;
    const el = trackRef.current;
    if (!drag || !el) return;
    const dx = e.clientX - drag.startX;
    el.scrollLeft = drag.startScroll - dx;

    const now = performance.now();
    const dt = now - drag.lastT;
    if (dt > 0) {
      const instantVelocity = (e.clientX - drag.lastX) / dt; // px per ms
      // Smoothed rather than raw-last-frame, so one jittery sample near
      // release doesn't fling the row in the wrong direction.
      drag.velocity = drag.velocity * 0.7 + instantVelocity * 0.3;
    }
    drag.lastX = e.clientX;
    drag.lastT = now;
  }
  function onPointerUp(e) {
    const el = trackRef.current;
    const drag = draggingRef.current;
    if (el) {
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        // pointer capture may already be gone (e.g. touch cancel) — fine
      }
    }
    draggingRef.current = null;
    if (drag && Math.abs(drag.velocity) > 0.02) {
      velocityRef.current = -drag.velocity * 16;
    }
  }

  return (
    <div
      className="media-carousel"
      ref={trackRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="group"
      aria-label="Fotos y videos, desliza para explorar"
    >
      {[0, 1, 2].map((copy) =>
        items.map((slot) => (
          <MediaTile key={`${copy}-${slot.id}`} slot={slot} aria-hidden={copy !== 1} />
        ))
      )}
    </div>
  );
}

function MediaTile({ slot, ...rest }) {
  if (slot.type === "video") {
    return (
      <div className="media-tile" {...rest}>
        <video
          src={slot.src}
          muted
          loop
          autoPlay
          playsInline
          preload="metadata"
          draggable="false"
          aria-label={slot.caption}
        />
      </div>
    );
  }
  return (
    <div className="media-tile" {...rest}>
      <img src={slot.src} alt={slot.caption} loading="lazy" draggable="false" />
    </div>
  );
}
