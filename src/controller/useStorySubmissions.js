import { useCallback, useState } from "react";
import { supabase, uploadToBucket } from "./supabaseClient.js";
import { acceptedFiles } from "./fileClassification.js";

const BUCKET = "story-submissions";

// Backs DiaryPrompt.jsx. Everything submitted here — a file or a plain text
// entry — lands in `story_submissions` with status='pending' and is never
// readable from the client (no select RLS policy on that table, see
// supabase/schema.sql): Gustavo reviews and approves/rejects from the
// Supabase table editor, per docs/BACKEND_PLAN.md requirement #3. This is
// intentionally one-way — there's no "your submissions" list here.
export function useStorySubmissions() {
  const [submitting, setSubmitting] = useState(false);

  const submitFiles = useCallback(async (fileList) => {
    const files = acceptedFiles(fileList);
    if (files.length === 0) return { added: 0 };

    setSubmitting(true);
    try {
      const results = await Promise.all(
        files.map(async ({ file, kind }) => {
          const { path, error: uploadError } = await uploadToBucket(BUCKET, file);
          if (uploadError) return false;
          const { error: insertError } = await supabase.from("story_submissions").insert({
            storage_path: path,
            type: kind,
            original_filename: file.name,
          });
          return !insertError;
        })
      );
      return { added: results.filter(Boolean).length };
    } finally {
      setSubmitting(false);
    }
  }, []);

  const submitText = useCallback(async (text) => {
    const trimmed = (text || "").trim();
    if (!trimmed) return { added: 0 };
    setSubmitting(true);
    try {
      const { error } = await supabase.from("story_submissions").insert({
        type: "text",
        note: trimmed,
      });
      return { added: error ? 0 : 1 };
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submitFiles, submitText, submitting };
}
