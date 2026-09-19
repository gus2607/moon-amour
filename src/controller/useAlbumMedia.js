import { useCallback, useEffect, useState } from "react";
import { supabase, SUPABASE_ENABLED, uploadToBucket } from "./supabaseClient.js";
import { acceptedFiles } from "./fileClassification.js";

const BUCKET = "album";

function publicUrl(storagePath) {
  return supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

function toItem(row) {
  return {
    id: row.id,
    type: row.type,
    url: publicUrl(row.storage_path),
    storagePath: row.storage_path,
    name: row.caption || "",
    hidden: Boolean(row.hidden),
  };
}

// Supabase-backed replacement for the album/Gallery half of
// useUploadedMedia.js — active once VITE_SUPABASE_URL/ANON_KEY are set (see
// supabaseClient.js). Anything uploaded here goes straight into
// `album_photos` and is public immediately (no review), per
// docs/BACKEND_PLAN.md requirement #2. Upload itself still requires being
// signed in (RLS on the insert checks auth.role()) — the caller is expected
// to gate the upload UI on useAuth() status, this hook doesn't re-check it.
//
// `items` includes hidden rows too — Gallery.jsx (public carousel) filters
// those out itself; the Galería admin tab (ChapterManager.jsx) needs to see
// and toggle them, so filtering here would hide that control surface.
export function useAlbumMedia() {
  const [items, setItems] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!SUPABASE_ENABLED) return;
    supabase
      .from("album_photos")
      .select("id, storage_path, type, caption, hidden, created_at")
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setItems(data.map(toItem));
      });
  }, []);

  const addFiles = useCallback(async (fileList) => {
    const files = acceptedFiles(fileList, ["image", "video"]);
    if (files.length === 0) return { added: 0 };

    setUploading(true);
    try {
      const results = await Promise.all(
        files.map(async ({ file, kind }) => {
          const { path, error: uploadError } = await uploadToBucket(BUCKET, file);
          if (uploadError) return null;
          const { data, error: insertError } = await supabase
            .from("album_photos")
            .insert({ storage_path: path, type: kind })
            .select()
            .single();
          return insertError ? null : data;
        })
      );
      const newRows = results.filter(Boolean);
      if (newRows.length > 0) setItems((prev) => [...prev, ...newRows.map(toItem)]);
      return { added: newRows.length };
    } finally {
      setUploading(false);
    }
  }, []);

  // Toggle from the Galería admin tab — pulls a photo/video out of the
  // public carousel without deleting it, so it can be brought back later.
  const setHidden = useCallback(async (id, hidden) => {
    if (!SUPABASE_ENABLED) return { ok: false };
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, hidden } : item)));
    const { error } = await supabase.from("album_photos").update({ hidden }).eq("id", id);
    if (error) {
      // revert the optimistic flip if the write didn't actually land
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, hidden: !hidden } : item)));
    }
    return { ok: !error, error };
  }, []);

  // Permanent removal — deletes the row and its file in the bucket. Storage
  // deletion is best-effort: if it fails (e.g. already gone) the row is
  // still removed so the item disappears everywhere either way.
  const removeItem = useCallback(async (id) => {
    if (!SUPABASE_ENABLED) return { ok: false };
    const item = items.find((entry) => entry.id === id);
    const { error } = await supabase.from("album_photos").delete().eq("id", id);
    if (error) return { ok: false, error };
    setItems((prev) => prev.filter((entry) => entry.id !== id));
    if (item?.storagePath) supabase.storage.from(BUCKET).remove([item.storagePath]).then(() => {});
    return { ok: true, error: null };
  }, [items]);

  return { items, addFiles, uploading, setHidden, removeItem };
}
