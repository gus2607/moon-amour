import { useEffect, useRef, useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import Modal from "./Modal.jsx";
import ChapterForm from "./ChapterForm.jsx";
import { extractYouTubeId } from "../controller/youtube.js";

// Fixed top-right entry point, visible only once one of the two accounts is
// signed in (see useAuth.js) — the login form itself lives in AuthGate, so
// by the time this renders, "signed in" already means "one of us". Two
// tabs: "Capítulos" (add/edit/delete/reorder, see useChapters.js), "Galería"
// (hide/remove what the public carousel shows, see useAlbumMedia.js), and
// "Canciones" (the VinylPlayer playlist, see useSongs.js) — the public
// timeline, carousel and player are all read-only outside this panel.
export default function ChapterManager({ auth, chapters, album, songs }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("chapters");
  // Reorder.Group's onReorder fires on every swap mid-drag, not once at
  // drop — writing to Supabase on each of those (as an earlier version did)
  // fired overlapping batches of updates per drag gesture, whose responses
  // could land out of order and leave `position` inconsistent with what was
  // actually dropped. Keeping the live order local and only persisting once,
  // on drag end, fixes both the redundant writes and the race.
  const [order, setOrder] = useState(() => chapters.entries.map((entry) => entry.id));
  const [songOrder, setSongOrder] = useState(() => songs.entries.map((entry) => entry.id));

  useEffect(() => {
    setOrder(chapters.entries.map((entry) => entry.id));
  }, [chapters.entries]);

  useEffect(() => {
    setSongOrder(songs.entries.map((entry) => entry.id));
  }, [songs.entries]);

  if (!auth.user) return null;

  const byId = new Map(chapters.entries.map((entry) => [entry.id, entry]));
  const orderedEntries = order.map((id) => byId.get(id)).filter(Boolean);

  const songById = new Map(songs.entries.map((entry) => [entry.id, entry]));
  const orderedSongs = songOrder.map((id) => songById.get(id)).filter(Boolean);

  function commitOrder() {
    const persistedOrder = chapters.entries.map((entry) => entry.id);
    const unchanged = order.length === persistedOrder.length && order.every((id, i) => id === persistedOrder[i]);
    if (!unchanged) chapters.reorderEntries(order);
  }

  function commitSongOrder() {
    const persistedOrder = songs.entries.map((entry) => entry.id);
    const unchanged =
      songOrder.length === persistedOrder.length && songOrder.every((id, i) => id === persistedOrder[i]);
    if (!unchanged) songs.reorderEntries(songOrder);
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
        <Modal titleId="chapter-admin-title" title="Panel" onClose={() => setOpen(false)} wide>
          <div className="admin-tabs" role="tablist" aria-label="Secciones del panel">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "chapters"}
              className={tab === "chapters" ? "admin-tab admin-tab-active" : "admin-tab"}
              onClick={() => setTab("chapters")}
            >
              Capítulos
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "gallery"}
              className={tab === "gallery" ? "admin-tab admin-tab-active" : "admin-tab"}
              onClick={() => setTab("gallery")}
            >
              Galería
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "songs"}
              className={tab === "songs" ? "admin-tab admin-tab-active" : "admin-tab"}
              onClick={() => setTab("songs")}
            >
              Canciones
            </button>
          </div>

          {tab === "chapters" ? (
            <>
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
            </>
          ) : tab === "gallery" ? (
            <GalleryAdminTab album={album} />
          ) : (
            <SongAdminTab
              songs={songs}
              orderedSongs={orderedSongs}
              songOrder={songOrder}
              setSongOrder={setSongOrder}
              onDragEnd={commitSongOrder}
            />
          )}
        </Modal>
      )}
    </>
  );
}

// Doesn't touch chapters or the public carousel's ordering — just lets
// either account pull an already-published photo/video out of Gallery.jsx
// (hide, reversible) or delete it outright (row + storage file, see
// useAlbumMedia.js's removeItem). Hidden items stay visible here, dimmed,
// so they can be brought back.
function GalleryAdminTab({ album }) {
  const { items, setHidden, removeItem, addFiles, uploading } = album;

  return (
    <>
      <GalleryDropzone addFiles={addFiles} uploading={uploading} />

      {items.length === 0 ? (
        <p className="modal-message">Todavía no hay fotos ni videos en el álbum.</p>
      ) : (
        <div className="gallery-admin-grid">
          {items.map((item) => (
            <div key={item.id} className={item.hidden ? "gallery-admin-item gallery-admin-item-hidden" : "gallery-admin-item"}>
              <div className="gallery-admin-thumb">
                {item.type === "video" ? (
                  <video src={item.url} muted playsInline preload="metadata" />
                ) : (
                  <img src={item.url} alt={item.name || ""} loading="lazy" />
                )}
                {item.hidden && <span className="gallery-admin-badge">Oculto</span>}
              </div>
              <div className="gallery-admin-actions">
                <button type="button" onClick={() => setHidden(item.id, !item.hidden)}>
                  {item.hidden ? "Mostrar" : "Ocultar"}
                </button>
                <button
                  type="button"
                  className="chapter-admin-row-delete"
                  onClick={() => {
                    if (window.confirm("¿Eliminar este recuerdo para siempre?")) removeItem(item.id);
                  }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// Drag-and-drop upload box for the Galería tab — deliberately not the same
// "+" button the public Gallery.jsx uses (Gustavo asked for a dropzone here
// instead), but it calls the same addFiles/uploading from useAlbumMedia.js.
function GalleryDropzone({ addFiles, uploading }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  async function handleFiles(fileList) {
    if (!fileList || fileList.length === 0) return;
    await addFiles(fileList);
  }

  return (
    <div
      className={dragging ? "gallery-dropzone gallery-dropzone-active" : "gallery-dropzone"}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      role="button"
      tabIndex={0}
      aria-label="Arrastra fotos o videos aquí, o haz clic para elegirlos"
    >
      {uploading ? (
        <span className="add-memory-spinner" aria-hidden="true" />
      ) : (
        <p>Arrastra fotos o videos aquí, o haz clic para elegirlos</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="file-input-hidden"
        onChange={async (e) => {
          await handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// Canciones tab — the VinylPlayer playlist (useSongs.js). Adding only needs
// a pasted YouTube link (extractYouTubeId validates it client-side before
// hitting the DB); the title is fetched automatically unless overridden.
// Hide/delete mirror GalleryAdminTab's; reorder mirrors the chapters list.
function SongAdminTab({ songs, orderedSongs, songOrder, setSongOrder, onDragEnd }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [urlError, setUrlError] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;
    if (!extractYouTubeId(trimmedUrl)) {
      setUrlError(true);
      return;
    }
    setUrlError(false);
    const { ok } = await songs.addEntry(trimmedUrl, title);
    if (ok) {
      setUrl("");
      setTitle("");
    }
  }

  return (
    <>
      {orderedSongs.length > 0 && (
        <Reorder.Group as="div" axis="y" values={songOrder} onReorder={setSongOrder} className="chapter-admin-list">
          {orderedSongs.map((song) => (
            <SongAdminRow
              key={song.id}
              song={song}
              saving={songs.saving}
              onToggleHidden={() => songs.setHidden(song.id, !song.hidden)}
              onDelete={() => songs.deleteEntry(song.id)}
              onDragEnd={onDragEnd}
            />
          ))}
        </Reorder.Group>
      )}

      <p className="modal-message chapter-admin-new-label">Agregar una canción (link de YouTube):</p>
      <form className="chapter-form" onSubmit={handleSubmit}>
        <input
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setUrlError(false);
          }}
          placeholder="https://www.youtube.com/watch?v=..."
          aria-label="Link de YouTube"
          required
        />
        {urlError && <p className="modal-message">Ese link no parece de YouTube.</p>}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título (opcional, se detecta solo si lo dejas vacío)"
          aria-label="Título de la canción"
        />
        <div className="chapter-form-actions">
          <button type="submit" disabled={songs.saving}>
            Agregar
          </button>
        </div>
      </form>
    </>
  );
}

function SongAdminRow({ song, saving, onToggleHidden, onDelete, onDragEnd }) {
  const dragControls = useDragControls();
  return (
    <Reorder.Item as="div" value={song.id} dragListener={false} dragControls={dragControls} onDragEnd={onDragEnd} className="chapter-admin-row">
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
      <div className="chapter-admin-row-body">
        <p className="chapter-admin-row-title">
          {song.title || "Sin título"}
          {song.hidden && <span className="chapter-admin-row-badge">Oculto</span>}
        </p>
        <div className="chapter-admin-row-actions">
          <button type="button" disabled={saving} onClick={onToggleHidden}>
            {song.hidden ? "Mostrar" : "Ocultar"}
          </button>
          <button
            type="button"
            className="chapter-admin-row-delete"
            disabled={saving}
            onClick={() => {
              if (window.confirm(`¿Eliminar "${song.title || "esta canción"}"?`)) onDelete();
            }}
          >
            Eliminar
          </button>
        </div>
      </div>
    </Reorder.Item>
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
