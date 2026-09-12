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
      .select("id, title, description, num, body, variant, diary_anchor, author, created_at, updated_at")
      .order("created_at", { ascending: true })
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
      if (!error && data) setEntries((prev) => [...prev, data]);
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

  return { entries, saving, addEntry, updateEntry, deleteEntry };
}
