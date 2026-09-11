import { useState } from "react";
import Reveal from "./Reveal.jsx";

// A shared, live-editable continuation of the timeline: unlike DiaryPrompt
// (pending review) or the curated hero/dawn/.../closing chapters in
// story.js, anything written here (via Gallery's single "+", see
// StoryEntryForm below) publishes immediately and either account can edit
// any entry afterward — no approval step. Purely presentational + edit
// here; adding a new one is Gallery's job so there's one "+" under the
// carousel, not two. Renders nothing for a visitor if there's nothing to
// show yet, so the public never sees an empty section.
export default function StoryEntries({ entries, auth, saving, onSave }) {
  if (entries.length === 0) return null;

  return (
    <div className="story-entries">
      <Reveal as="h3" className="story-entries-title">
        Lo que seguimos escribiendo
      </Reveal>

      {entries.map((entry) => (
        <StoryEntryCard
          key={entry.id}
          entry={entry}
          canEdit={Boolean(auth.user)}
          saving={saving}
          onSave={(fields) => onSave(entry.id, fields)}
        />
      ))}
    </div>
  );
}

function StoryEntryCard({ entry, canEdit, saving, onSave }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="beat story-entry">
        <StoryEntryForm
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
    <div className="beat story-entry">
      {canEdit && (
        <button type="button" className="story-entry-edit" onClick={() => setEditing(true)}>
          Editar
        </button>
      )}
      {entry.date_label && <p className="story-entry-date">{entry.date_label}</p>}
      <h4 className="story-entry-title">{entry.title}</h4>
      <p className="story-entry-body">{entry.body}</p>
    </div>
  );
}

// Exported for reuse by Gallery's single "+" modal (see AddMemoryModal in
// Gallery.jsx), which offers this alongside the photo/video uploader
// instead of each having its own separate trigger button.
export function StoryEntryForm({ initial, saving, submitLabel, onCancel, onSubmit }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [dateLabel, setDateLabel] = useState(initial?.date_label ?? "");
  const [body, setBody] = useState(initial?.body ?? "");

  function handleSubmit(e) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle || !trimmedBody) return;
    onSubmit({ title: trimmedTitle, dateLabel: dateLabel.trim(), body: trimmedBody });
  }

  return (
    <form className="story-entry-form" onSubmit={handleSubmit}>
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
        value={dateLabel}
        onChange={(e) => setDateLabel(e.target.value)}
        placeholder="Fecha (opcional)"
        aria-label="Fecha"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Escribe aquí..."
        aria-label="Texto"
        rows={5}
        required
      />
      <div className="story-entry-form-actions">
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
