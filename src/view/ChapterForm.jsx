import { useState } from "react";

// Shared add/edit form for a chapter row (see useChapters.js) — used only
// inside ChapterManager.jsx's panel. Editing/deleting a chapter never
// happens from the public timeline itself (Chapter.jsx is read-only); this
// is the only place those actions exist.
export default function ChapterForm({ initial, saving, submitLabel, onCancel, onSubmit }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [num, setNum] = useState(initial?.num ?? "");
  const [body, setBody] = useState(initial?.body ?? "");

  function handleSubmit(e) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle || !trimmedBody) return;
    onSubmit({
      title: trimmedTitle,
      description: description.trim(),
      num: num.trim(),
      body: trimmedBody,
    });
  }

  return (
    <form className="chapter-form" onSubmit={handleSubmit}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título"
        aria-label="Título"
        required
      />
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descripción breve (opcional)"
        aria-label="Descripción"
      />
      <input
        type="text"
        value={num}
        onChange={(e) => setNum(e.target.value)}
        placeholder="Número de capítulo (opcional, ej. Capítulo 06)"
        aria-label="Número de capítulo"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Cuenta aquí la historia..."
        aria-label="Texto"
        rows={5}
        required
      />
      <div className="chapter-form-actions">
        {onCancel && (
          <button type="button" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button type="submit" disabled={saving}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
