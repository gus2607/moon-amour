// One-time migration: uploads the curated gallery.slots media (currently
// served as static files from public/images and public/videos) into the
// Supabase "album" bucket + album_photos table, so the carousel becomes
// fully DB-driven instead of mixing static content with uploads.
//
// Run once with:
//   SUPABASE_SERVICE_ROLE_KEY=<service role secret> node scripts/seed-album.mjs
//
// Needs the SERVICE ROLE key (Supabase dashboard -> Settings -> API),
// not the anon key — RLS on album_photos/storage.objects only allows
// inserts from a signed-in session, and this script has no signed-in user.
// The service role key bypasses RLS entirely: never commit it, never put
// it in .env files that ship to the client (it must NOT have the VITE_
// prefix), and only ever run this from a trusted machine.
//
// Safe to re-run: a slot whose caption is already in album_photos is skipped,
// so captions are what identify an already-migrated slot.

import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gallery } from "../src/model/story.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const BUCKET = "album";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://vnwxqquqakuznzswovss.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY env var. Aborting.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const CONTENT_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".mp4": "video/mp4",
};

function contentTypeFor(filePath) {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

async function alreadySeeded(caption) {
  const { data } = await supabase.from("album_photos").select("id").eq("caption", caption).limit(1);
  return Boolean(data?.length);
}

async function main() {
  let uploaded = 0;
  let skipped = 0;

  for (const slot of gallery.slots) {
    if (await alreadySeeded(slot.caption)) {
      skipped += 1;
      continue;
    }

    const filePath = path.join(PUBLIC_DIR, slot.src);
    const bytes = await readFile(filePath);
    const storagePath = `seed/${slot.id}${path.extname(slot.src)}`;
    const type = slot.type === "video" ? "video" : "image";

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, bytes, { contentType: contentTypeFor(slot.src), upsert: true });
    if (uploadError) {
      console.error(`Upload failed for ${slot.id} (${slot.src}):`, uploadError.message);
      continue;
    }

    const { error: insertError } = await supabase
      .from("album_photos")
      .insert({ storage_path: storagePath, type, caption: slot.caption });
    if (insertError) {
      console.error(`Insert failed for ${slot.id}:`, insertError.message);
      continue;
    }

    uploaded += 1;
    console.log(`Seeded ${slot.id} — ${slot.caption}`);
  }

  console.log(`\nDone. Seeded ${uploaded}, skipped ${skipped} (already present).`);
}

main().catch((err) => {
  console.error("Migration aborted:", err.message);
  process.exit(1);
});
