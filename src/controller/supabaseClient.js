import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// The whole backend layer (album/story hooks) checks this flag once at
// module load and picks its implementation accordingly — see
// useAlbumMedia.js and useStorySubmissions.js. Until Gustavo creates the
// Supabase project and these env vars are set (see .env.example), the site
// keeps working exactly as before on IndexedDB.
export const SUPABASE_ENABLED = Boolean(url && anonKey);

export const supabase = SUPABASE_ENABLED ? createClient(url, anonKey) : null;

// Shared by every hook that uploads a file to a Storage bucket (album,
// story submissions) — same path-naming scheme and upload call, so a fix
// here (retry, content-type, etc.) doesn't need matching edits elsewhere.
export async function uploadToBucket(bucket, file) {
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file);
  return { path, error };
}
