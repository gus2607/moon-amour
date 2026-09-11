import { useCallback, useEffect, useState } from "react";
import { supabase, SUPABASE_ENABLED } from "./supabaseClient.js";

// Backs StoryEntries.jsx — a shared, live-editable continuation of the
// timeline. Unlike story_submissions (useStorySubmissions.js, pending
// review), anything here publishes immediately and either account can
// edit any entry: no approval step, by design (see docs/BACKEND_PLAN.md
// for the original review-gated flow this deliberately does NOT follow).
export function useStoryEntries() {
  const [entries, setEntries] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!SUPABASE_ENABLED) return;
    supabase
      .from("story_entries")
      .select("id, title, date_label, body, author, created_at, updated_at")
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setEntries(data);
      });
  }, []);

  // Gallery calls this hook unconditionally, so both writers have to match
  // the fetch effect's guard above: without Supabase configured there is no
  // client to write through, and the "+" modal still renders the entry form
  // (AuthGate passes children straight through in that mode).
  const addEntry = useCallback(async ({ title, dateLabel, body, author }) => {
    if (!SUPABASE_ENABLED) return { ok: false, error: null };
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("story_entries")
        .insert({ title, date_label: dateLabel || null, body, author: author || null })
        .select()
        .single();
      if (!error && data) setEntries((prev) => [...prev, data]);
      return { ok: !error, error };
    } finally {
      setSaving(false);
    }
  }, []);

  const updateEntry = useCallback(async (id, { title, dateLabel, body }) => {
    if (!SUPABASE_ENABLED) return { ok: false, error: null };
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("story_entries")
        .update({ title, date_label: dateLabel || null, body, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (!error && data) setEntries((prev) => prev.map((entry) => (entry.id === id ? data : entry)));
      return { ok: !error, error };
    } finally {
      setSaving(false);
    }
  }, []);

  return { entries, saving, addEntry, updateEntry };
}
