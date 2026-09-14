import { useEffect, useRef } from "react";

// Shared backdrop+dialog+close-button chrome for every "+"-triggered
// popup (DiaryPrompt, Gallery's album/entry modal) — one place for the
// ARIA wiring (role/aria-modal/aria-labelledby) and backdrop-click-to-close
// instead of copy-pasted per trigger.
export default function Modal({ titleId, title, onClose, children, wide }) {
  const backdropRef = useRef(null);

  // The page's own scroll isn't native — useSmoothScroll.js runs Lenis,
  // which drives scroll itself via window.scrollTo() on every wheel/touch
  // event it sees at the window level (html/body have overflow:clip
  // specifically so Lenis is the only thing scrolling). That JS-driven
  // scroll ignores CSS overflow entirely, so the fix isn't locking body
  // scroll — it's stopping the wheel/touch event from ever bubbling past
  // the modal to reach Lenis's listener. Capture phase on the backdrop, so
  // it fires before Lenis's own (bubble-phase, on window) listener can.
  useEffect(() => {
    const node = backdropRef.current;
    if (!node) return;
    function stopPropagation(e) {
      e.stopPropagation();
    }
    node.addEventListener("wheel", stopPropagation, { capture: true, passive: true });
    node.addEventListener("touchmove", stopPropagation, { capture: true, passive: true });
    return () => {
      node.removeEventListener("wheel", stopPropagation, { capture: true });
      node.removeEventListener("touchmove", stopPropagation, { capture: true });
    };
  }, []);

  return (
    <div className="modal-backdrop" ref={backdropRef} role="presentation" onClick={onClose}>
      <div
        className={wide ? "modal modal-wide" : "modal"}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">
          ×
        </button>
        <h3 id={titleId} className="modal-title">
          {title}
        </h3>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
