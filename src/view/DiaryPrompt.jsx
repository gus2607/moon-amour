import { useState } from "react";
import UploadButton from "./UploadButton.jsx";
import AuthGate from "./AuthGate.jsx";
import Modal from "./Modal.jsx";
import { SUPABASE_ENABLED } from "../controller/supabaseClient.js";

const MESSAGE =
  "¿Quieres ayudarme a contar nuestra historia? Hagamos de esta página nuestro diario: sube aquí fotos, documentos o escribe algo con nuestra historia.";

// Sits right below Chapter 5 (see App.jsx). Once Supabase is configured,
// this is separate from Gallery's own "+": anything submitted here goes to
// story_submissions with status='pending' (see useStorySubmissions.js) and
// never appears publicly until Gustavo reviews and approves it. Until then
// (legacyUpload/legacyUploading), it falls back to the original behavior —
// same shared carousel as Gallery — so this entry point keeps working
// exactly as before while no backend exists yet.
export default function DiaryPrompt({ auth, storySubmissions, legacyUpload, legacyUploading }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);

  async function handleFiles(files) {
    const { added } = await storySubmissions.submitFiles(files);
    if (added > 0) setSent(true);
    return { added };
  }

  async function handleTextSubmit(e) {
    e.preventDefault();
    const { added } = await storySubmissions.submitText(text);
    if (added > 0) {
      setText("");
      setSent(true);
    }
  }

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
        <Modal titleId="diary-modal-title" title="Nuestro diario" onClose={() => setOpen(false)}>
          <p className="modal-message">{MESSAGE}</p>

          {sent ? (
            <p className="modal-message">Gracias — quedó guardado.</p>
          ) : SUPABASE_ENABLED ? (
            <AuthGate auth={auth} message="Solo tú puedes añadir más a esta historia — inicia sesión.">
              <UploadButton
                onUpload={handleFiles}
                uploading={storySubmissions.submitting}
                accept="image/*,video/*,application/pdf,.doc,.docx,.txt"
                label="Subir fotos o documentos"
              />
              <form className="diary-text-form" onSubmit={handleTextSubmit}>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Cuenta aquí la historia que deseas..."
                  rows={4}
                />
                <button type="submit" disabled={storySubmissions.submitting || !text.trim()}>
                  Enviar
                </button>
              </form>
            </AuthGate>
          ) : (
            <UploadButton
              onUpload={legacyUpload}
              uploading={legacyUploading}
              accept="image/*,video/*,application/pdf,.doc,.docx,.txt"
              label="Subir fotos o documentos"
            />
          )}
        </Modal>
      )}
    </div>
  );
}
