import { forwardRef, memo, useEffect, useMemo, useRef, useState } from "react";
import Reveal from "./Reveal.jsx";
import { useUploadedMedia } from "../controller/useUploadedMedia.js";

const Gallery = forwardRef(function Gallery({ content }, ref) {
  const { items: uploaded, addFiles, uploading } = useUploadedMedia();
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);
  const toastTimerRef = useRef(null);

  const allSlots = useMemo(() => {
    const uploadedSlots = uploaded.map((u) => ({
      id: u.id,
      type: u.type,
      src: u.url,
      caption: "Un recuerdo que añadiste",
    }));
    return [...content.slots, ...uploadedSlots];
  }, [content.slots, uploaded]);

  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  async function onFilesChosen(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    // Resetting the input's value invalidates the picked File's data for
    // any *new* read started afterward (confirmed: File.arrayBuffer() and
    // an <img> decode both succeed before the reset, then a fresh read
    // after it just hangs) — so the reset happens only once every read is
    // already done, not before.
    const { added } = await addFiles(files);
    e.target.value = ""; // lets the same file be picked again later
    if (added > 0) {
      clearTimeout(toastTimerRef.current);
      setToast(added === 1 ? "Recuerdo subido con éxito" : `${added} recuerdos subidos con éxito`);
      toastTimerRef.current = setTimeout(() => setToast(null), 3200);
    }
  }

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

      <MediaCarousel items={allSlots} />

      <Reveal as="div" className="swipe-hint">
        <span className="swipe-hint-track" aria-hidden="true">
          <span className="swipe-hint-thumb" />
        </span>
        <span className="swipe-hint-label">{content.note}</span>
      </Reveal>

      <Reveal as="div" className="add-memory">
        <p className="add-memory-text">¿Quieres añadir más de nuestros momentos?</p>
        <button
          type="button"
          className="add-memory-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          aria-label="Añadir fotos o videos"
        >
          {uploading ? <span className="add-memory-spinner" aria-hidden="true" /> : "+"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="file-input-hidden"
          onChange={onFilesChosen}
        />
      </Reveal>

      <div className="toast-slot" aria-live="polite">
        {toast && <div className="toast">{toast}</div>}
      </div>
    </section>
  );
});

export default memo(Gallery);

// One draggable horizontal row mixing every photo and video together. The
// item list renders three times back to back; once the scroll position
// (from touch, trackpad, wheel or mouse-drag) passes the middle copy's
// bounds, it silently jumps by exactly one copy-width — since the copies
// are identical, that jump is invisible and the row reads as an infinite
// loop in either direction.
//
// Touch/trackpad already get native momentum from the browser. Mouse-drag
// doesn't, so releasing it used to just stop dead — startMomentum below
// tracks the pointer's recent velocity and keeps the row gliding with
// friction after release, matching the native feel. Scroll-snap was
// removed entirely: snapping to the nearest tile after every scroll fought
// with both the native momentum and this one, which read as stutter.
function MediaCarousel({ items }) {
  const trackRef = useRef(null);
  const draggingRef = useRef(null);
  const momentumFrameRef = useRef(null);

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
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [items]);

  function cancelMomentum() {
    if (momentumFrameRef.current) cancelAnimationFrame(momentumFrameRef.current);
    momentumFrameRef.current = null;
  }

  function startMomentum(el, initialVelocity) {
    let velocity = initialVelocity; // px per frame
    function step() {
      if (draggingRef.current || Math.abs(velocity) < 0.05) {
        momentumFrameRef.current = null;
        return;
      }
      el.scrollLeft -= velocity;
      velocity *= 0.94; // friction
      momentumFrameRef.current = requestAnimationFrame(step);
    }
    momentumFrameRef.current = requestAnimationFrame(step);
  }

  function onPointerDown(e) {
    const el = trackRef.current;
    if (!el) return;
    cancelMomentum();
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
    if (el && drag && Math.abs(drag.velocity) > 0.02) {
      startMomentum(el, -drag.velocity * 16);
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
  return (
    <div className="media-tile" {...rest}>
      {slot.type === "video" ? (
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
      ) : (
        <img src={slot.src} alt={slot.caption} loading="lazy" draggable="false" />
      )}
    </div>
  );
}
