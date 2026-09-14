import { useCallback, useEffect, useState } from "react";
import { supabase, SUPABASE_ENABLED } from "./supabaseClient.js";

// Every chapter in the timeline — the 5 original ones (seeded once, see
// supabase/schema.sql) and anything added since — lives in this one table
// so ChapterManager.jsx's top-right panel can add/edit/delete any of them.
// Publishes immediately, either account can write: no approval step, unlike
// story_submissions (useStorySubmissions.js). `variant`/`diary_anchor` are
// seed-only fields (which background segment a chapter owns, and which one
// the diary prompt anchors after) — not exposed in the edit form.
export function useChapters() {
  const [entries, setEntries] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!SUPABASE_ENABLED) return;
    supabase
      .from("chapters")
      .select("id, title, description, num, body, variant, diary_anchor, author, position, created_at, updated_at")
      .order("position", { ascending: true, nullsFirst: false })
      .then(({ data, error }) => {
        if (!error && data) setEntries(data);
      });
  }, []);

  const addEntry = useCallback(async ({ title, description, num, body, author }) => {
    if (!SUPABASE_ENABLED) return { ok: false, error: null };
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("chapters")
        .insert({ title, description: description || null, num: num || null, body, author: author || null })
        .select()
        .single();
      if (!error && data) {
        const nextPosition = data.position ?? Date.now();
        setEntries((prev) => [...prev, { ...data, position: nextPosition }]);
        if (data.position == null) {
          supabase.from("chapters").update({ position: nextPosition }).eq("id", data.id).then(() => {});
        }
      }
      return { ok: !error, error };
    } finally {
      setSaving(false);
    }
  }, []);

  // Drag-and-drop reorder in ChapterManager.jsx: takes the new row order
  // (array of ids) and persists 1-based positions for all of them in one
  // batch, optimistic-updating local state first so the drag doesn't snap
  // back while the writes are in flight.
  const reorderEntries = useCallback(async (orderedIds) => {
    if (!SUPABASE_ENABLED) return { ok: false, error: null };
    setEntries((prev) => {
      const byId = new Map(prev.map((entry) => [entry.id, entry]));
      return orderedIds.map((id, index) => ({ ...byId.get(id), position: index + 1 }));
    });
    setSaving(true);
    try {
      const results = await Promise.all(
        orderedIds.map((id, index) => supabase.from("chapters").update({ position: index + 1 }).eq("id", id))
      );
      const error = results.find((r) => r.error)?.error || null;
      return { ok: !error, error };
    } finally {
      setSaving(false);
    }
  }, []);

  const updateEntry = useCallback(async (id, { title, description, num, body }) => {
    if (!SUPABASE_ENABLED) return { ok: false, error: null };
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("chapters")
        .update({
          title,
          description: description || null,
          num: num || null,
          body,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
      if (!error && data) setEntries((prev) => prev.map((entry) => (entry.id === id ? data : entry)));
      return { ok: !error, error };
    } finally {
      setSaving(false);
    }
  }, []);

  const deleteEntry = useCallback(async (id) => {
    if (!SUPABASE_ENABLED) return { ok: false, error: null };
    setSaving(true);
    try {
      const { error } = await supabase.from("chapters").delete().eq("id", id);
      if (!error) setEntries((prev) => prev.filter((entry) => entry.id !== id));
      return { ok: !error, error };
    } finally {
      setSaving(false);
    }
  }, []);

  return { entries, saving, addEntry, updateEntry, deleteEntry, reorderEntries };
}
