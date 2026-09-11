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
    name: row.caption || "",
  };
}

// Supabase-backed replacement for the album/Gallery half of
// useUploadedMedia.js — active once VITE_SUPABASE_URL/ANON_KEY are set (see
// supabaseClient.js). Anything uploaded here goes straight into
// `album_photos` and is public immediately (no review), per
// docs/BACKEND_PLAN.md requirement #2. Upload itself still requires being
// signed in (RLS on the insert checks auth.role()) — the caller is expected
// to gate the upload UI on useAuth() status, this hook doesn't re-check it.
export function useAlbumMedia() {
  const [items, setItems] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!SUPABASE_ENABLED) return;
    supabase
      .from("album_photos")
      .select("id, storage_path, type, caption, created_at")
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

  return { items, addFiles, uploading };
}
