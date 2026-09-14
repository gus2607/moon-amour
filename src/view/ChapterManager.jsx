import { useEffect, useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import Modal from "./Modal.jsx";
import ChapterForm from "./ChapterForm.jsx";

// Fixed top-right entry point, visible only once one of the two accounts is
// signed in (see useAuth.js) — the login form itself lives in AuthGate, so
// by the time this renders, "signed in" already means "one of us". Opens
// the only place a chapter (old or new, see useChapters.js) can be added,
// edited, or deleted — the public timeline (Chapter.jsx) is read-only.
export default function ChapterManager({ auth, chapters }) {
  const [open, setOpen] = useState(false);
  // Reorder.Group's onReorder fires on every swap mid-drag, not once at
  // drop — writing to Supabase on each of those (as an earlier version did)
  // fired overlapping batches of updates per drag gesture, whose responses
  // could land out of order and leave `position` inconsistent with what was
  // actually dropped. Keeping the live order local and only persisting once,
  // on drag end, fixes both the redundant writes and the race.
  const [order, setOrder] = useState(() => chapters.entries.map((entry) => entry.id));

  useEffect(() => {
    setOrder(chapters.entries.map((entry) => entry.id));
  }, [chapters.entries]);

  if (!auth.user) return null;

  const byId = new Map(chapters.entries.map((entry) => [entry.id, entry]));
  const orderedEntries = order.map((id) => byId.get(id)).filter(Boolean);

  function commitOrder() {
    const persistedOrder = chapters.entries.map((entry) => entry.id);
    const unchanged = order.length === persistedOrder.length && order.every((id, i) => id === persistedOrder[i]);
    if (!unchanged) chapters.reorderEntries(order);
  }

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
        <Modal titleId="chapter-admin-title" title="Editar capítulos" onClose={() => setOpen(false)} wide>
          {orderedEntries.length > 0 && (
            <Reorder.Group as="div" axis="y" values={order} onReorder={setOrder} className="chapter-admin-list">
              {orderedEntries.map((entry) => (
                <ChapterAdminRow
                  key={entry.id}
                  entry={entry}
                  saving={chapters.saving}
                  onSave={(fields) => chapters.updateEntry(entry.id, fields)}
                  onDelete={() => chapters.deleteEntry(entry.id)}
                  onDragEnd={commitOrder}
                />
              ))}
            </Reorder.Group>
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

function ChapterAdminRow({ entry, saving, onSave, onDelete, onDragEnd }) {
  const [editing, setEditing] = useState(false);
  // dragListener={false} + this handle keeps drag off the title/buttons/form
  // inputs — only the handle itself starts a reorder, everything else in
  // the row still works with normal clicks/taps.
  const dragControls = useDragControls();
  const dragHandle = (
    <div
      className="chapter-admin-row-handle"
      onPointerDown={(event) => dragControls.start(event)}
      role="button"
      tabIndex={-1}
      aria-label="Arrastrar para reordenar"
      title="Arrastrar para reordenar"
    >
      ⠿
    </div>
  );

  if (editing) {
    return (
      <Reorder.Item as="div" value={entry.id} dragListener={false} dragControls={dragControls} onDragEnd={onDragEnd} className="chapter-admin-row">
        {dragHandle}
        <div className="chapter-admin-row-body">
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
      </Reorder.Item>
    );
  }

  return (
    <Reorder.Item as="div" value={entry.id} dragListener={false} dragControls={dragControls} onDragEnd={onDragEnd} className="chapter-admin-row">
      {dragHandle}
      <div className="chapter-admin-row-body">
        <p className="chapter-admin-row-title">{entry.title}</p>
        <div className="chapter-admin-row-actions">
          <button type="button" onClick={() => setEditing(true)}>
            Editar
          </button>
          <button
            type="button"
            className="chapter-admin-row-delete"
            disabled={saving || entry.diary_anchor}
            title={entry.diary_anchor ? "Este capítulo ancla el diario — no se puede borrar desde aquí" : undefined}
            onClick={() => {
              if (window.confirm(`¿Eliminar "${entry.title}"?`)) onDelete();
            }}
          >
            Eliminar
          </button>
        </div>
      </div>
    </Reorder.Item>
  );
}
