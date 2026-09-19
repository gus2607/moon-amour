import { useCallback, useEffect, useState } from "react";
import { supabase, SUPABASE_ENABLED } from "./supabaseClient.js";
import { extractYouTubeId, fetchYouTubeTitle } from "./youtube.js";

// Background-music playlist (VinylPlayer.jsx + the Canciones admin tab in
// ChapterManager.jsx). Only ever stores a YouTube video_id — no file upload,
// no bucket, playback happens through YouTube's own hidden iframe player.
// Same no-owner, either-account-can-edit model as chapters/album_photos.
export function useSongs() {
  const [entries, setEntries] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!SUPABASE_ENABLED) return;
    supabase
      .from("songs")
      .select("id, video_id, title, hidden, position, created_at")
      .order("position", { ascending: true, nullsFirst: false })
      .then(({ data, error }) => {
        if (!error && data) setEntries(data);
      });
  }, []);

  // Takes the raw pasted URL (not just the id) because the title lookup
  // needs the full URL for YouTube's oEmbed endpoint.
  const addEntry = useCallback(async (url, titleOverride) => {
    if (!SUPABASE_ENABLED) return { ok: false, error: null };
    const video_id = extractYouTubeId(url);
    if (!video_id) return { ok: false, error: new Error("invalid_youtube_url") };

    setSaving(true);
    try {
      const title = titleOverride?.trim() || (await fetchYouTubeTitle(url)) || "";
      const { data, error } = await supabase.from("songs").insert({ video_id, title }).select().single();
      if (!error && data) {
        const nextPosition = data.position ?? Date.now();
        setEntries((prev) => [...prev, { ...data, position: nextPosition }]);
        if (data.position == null) {
          supabase.from("songs").update({ position: nextPosition }).eq("id", data.id).then(() => {});
        }
      }
      return { ok: !error, error };
    } finally {
      setSaving(false);
    }
  }, []);

  const reorderEntries = useCallback(async (orderedIds) => {
    if (!SUPABASE_ENABLED) return { ok: false, error: null };
    setEntries((prev) => {
      const byId = new Map(prev.map((entry) => [entry.id, entry]));
      return orderedIds.map((id, index) => ({ ...byId.get(id), position: index + 1 }));
    });
    setSaving(true);
    try {
      const results = await Promise.all(
        orderedIds.map((id, index) => supabase.from("songs").update({ position: index + 1 }).eq("id", id))
      );
      const error = results.find((r) => r.error)?.error || null;
      return { ok: !error, error };
    } finally {
      setSaving(false);
    }
  }, []);

  // Reversible pull from the public playlist — same idiom as
  // useAlbumMedia.js's setHidden.
  const setHidden = useCallback(async (id, hidden) => {
    if (!SUPABASE_ENABLED) return { ok: false, error: null };
    setEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, hidden } : entry)));
    const { error } = await supabase.from("songs").update({ hidden }).eq("id", id);
    if (error) setEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, hidden: !hidden } : entry)));
    return { ok: !error, error };
  }, []);

  const deleteEntry = useCallback(async (id) => {
    if (!SUPABASE_ENABLED) return { ok: false, error: null };
    setSaving(true);
    try {
      const { error } = await supabase.from("songs").delete().eq("id", id);
      if (!error) setEntries((prev) => prev.filter((entry) => entry.id !== id));
      return { ok: !error, error };
    } finally {
      setSaving(false);
    }
  }, []);

  return { entries, saving, addEntry, setHidden, deleteEntry, reorderEntries };
}
