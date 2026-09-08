import { useState } from "react";
import UploadButton from "./UploadButton.jsx";

const MESSAGE =
  "¿Quieres ayudarme a contar nuestra historia? Hagamos de esta página nuestro diario: sube aquí fotos o documentos con nuestra historia, yo los añado.";

// Sits right below Chapter 5 (see App.jsx) — a separate entry point from
// Gallery's own "+", but both call the same shared onUpload from App.jsx,
// so anything added here lands in the same carousel.
export default function DiaryPrompt({ onUpload, uploading }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="diary-prompt">
      <button
        type="button"
        className="add-memory-btn"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label="Ayúdame a contar nuestra historia"
      >
        +
      </button>

      {open && (
        <div className="modal-backdrop" role="presentation" onClick={() => setOpen(false)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="diary-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="modal-close" onClick={() => setOpen(false)} aria-label="Cerrar">
              ×
            </button>
            <h3 id="diary-modal-title" className="modal-title">
              Nuestro diario
            </h3>
            <p className="modal-message">{MESSAGE}</p>
            <UploadButton
              onUpload={onUpload}
              uploading={uploading}
              accept="image/*,video/*,application/pdf,.doc,.docx,.txt"
              label="Subir fotos o documentos"
            />
          </div>
        </div>
      )}
    </div>
  );
}
