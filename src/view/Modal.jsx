// Shared backdrop+dialog+close-button chrome for every "+"-triggered
// popup (DiaryPrompt, Gallery's album/entry modal) — one place for the
// ARIA wiring (role/aria-modal/aria-labelledby) and backdrop-click-to-close
// instead of copy-pasted per trigger.
export default function Modal({ titleId, title, onClose, children }) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">
          ×
        </button>
        <h3 id={titleId} className="modal-title">
          {title}
        </h3>
        {children}
      </div>
    </div>
  );
}
