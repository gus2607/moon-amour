import { useState } from "react";
import Modal from "./Modal.jsx";
import ChapterForm from "./ChapterForm.jsx";

// Fixed top-right entry point, visible only once one of the two accounts is
// signed in (see useAuth.js) — the login form itself lives in AuthGate, so
// by the time this renders, "signed in" already means "one of us". Opens
// the only place a chapter (old or new, see useChapters.js) can be added,
// edited, or deleted — the public timeline (Chapter.jsx) is read-only.
export default function ChapterManager({ auth, chapters }) {
  const [open, setOpen] = useState(false);

  if (!auth.user) return null;

  return (
    <>
      <button
        type="button"
        className="chapter-admin-btn"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label="Editar capítulos"
        title="Editar capítulos"
      >
        <img src="/logo.png" alt="" />
      </button>

      {open && (
        <Modal titleId="chapter-admin-title" title="Editar capítulos" onClose={() => setOpen(false)}>
          {chapters.entries.length > 0 && (
            <div className="chapter-admin-list">
              {chapters.entries.map((entry) => (
                <ChapterAdminRow
                  key={entry.id}
                  entry={entry}
                  saving={chapters.saving}
                  onSave={(fields) => chapters.updateEntry(entry.id, fields)}
                  onDelete={() => chapters.deleteEntry(entry.id)}
                />
              ))}
            </div>
          )}

          <p className="modal-message chapter-admin-new-label">Agregar un capítulo nuevo:</p>
          <ChapterForm
            saving={chapters.saving}
            submitLabel="Publicar"
            onSubmit={(fields) => chapters.addEntry({ ...fields, author: auth.user?.email })}
          />
        </Modal>
      )}
    </>
  );
}

function ChapterAdminRow({ entry, saving, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="chapter-admin-row">
        <ChapterForm
          initial={entry}
          saving={saving}
          submitLabel="Guardar"
          onCancel={() => setEditing(false)}
          onSubmit={async (fields) => {
            const { ok } = await onSave(fields);
            if (ok) setEditing(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="chapter-admin-row">
      <p className="chapter-admin-row-title">{entry.title}</p>
      <div className="chapter-admin-row-actions">
        <button type="button" onClick={() => setEditing(true)}>
          Editar
        </button>
        <button
          type="button"
          className="chapter-admin-row-delete"
          disabled={saving}
          onClick={() => {
            if (window.confirm(`¿Eliminar "${entry.title}"?`)) onDelete();
          }}
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}
