-- Backend schema for love-story-site (see docs/BACKEND_PLAN.md for the
-- original rationale — superseded on the whitelist mechanism, see note
-- below). Run this once in the Supabase SQL editor after creating the
-- project. Idempotent-ish via IF NOT EXISTS / OR REPLACE where possible.

-- Whitelist mechanism: real Supabase Auth, not the device-token table this
-- project started with. Create exactly two users in the dashboard
-- (Authentication -> Users -> Add user) — Gustavo's and Luna's — and any
-- signed-in request is by definition one of them. The old `devices` table /
-- `device_request_status` function / `device_token` columns are gone.

-- Álbum: lo que entra aquí se muestra directo en la sección Gallery.
create table if not exists album_photos (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  type text not null check (type in ('image', 'video')),
  caption text,
  created_at timestamptz not null default now()
);

-- `hidden` lets the Galería tab (ChapterManager.jsx) pull a photo/video out
-- of the public carousel without deleting the row/file — the public Gallery
-- query filters on this. Safe to re-run on an existing table.
alter table album_photos add column if not exists hidden boolean not null default false;

-- Diario: todo lo que entra aquí queda pendiente hasta que Gustavo lo
-- revise. `type` incluye 'text' para entradas sin archivo (solo el campo
-- `note`) — storage_path es opcional en ese caso.
create table if not exists story_submissions (
  id uuid primary key default gen_random_uuid(),
  storage_path text,
  type text not null check (type in ('image', 'video', 'document', 'text')),
  original_filename text,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint story_submissions_needs_content
    check (type = 'text' or storage_path is not null)
);

-- Capítulos de la línea de tiempo — TODOS ellos, no solo los que se agregan
-- después: los 5 originales (antes hardcoded en model/story.js) fueron
-- sembrados aquí también, para que el panel de ChapterManager.jsx pueda
-- editar/borrar cualquiera, viejo o nuevo. Publica de inmediato, cualquiera
-- de las dos cuentas puede editar/borrar cualquier fila — sin revisión, sin
-- dueño por fila. `variant` (dawn/midday/gold/pause/sunset) solo existe en
-- los 5 originales — es lo que engancha cada uno a su propio tramo de fondo
-- animado (ver backgroundStops.js); los capítulos nuevos no tienen uno y
-- simplemente no producen un tramo de fondo propio. `diary_anchor` marca la
-- fila después de la cual aparece el DiaryPrompt (hoy, el capítulo 5).
-- model/story.js conserva el arreglo original como fallback visual (con sus
-- beats/tags completos) solo para cuando esta tabla está vacía — mismo
-- patrón que content.slots para album_photos.
create table if not exists chapters (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  num text,
  body text not null,
  variant text,
  diary_anchor boolean not null default false,
  author text,
  position integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- `position` drives the timeline/admin order (drag-to-reorder in
-- ChapterManager.jsx) instead of `created_at` — `num` stays free-text
-- ("Capítulo 06") and is never parsed for ordering. Safe to re-run: only
-- backfills rows that don't have one yet, in their current created_at order.
alter table chapters add column if not exists position integer;
with ranked as (
  select id, row_number() over (order by position nulls last, created_at asc) as rn
  from chapters
)
update chapters set position = ranked.rn
from ranked
where chapters.id = ranked.id and chapters.position is null;

-- Música de fondo (VinylPlayer.jsx) — solo guarda el video_id de YouTube,
-- nunca el archivo: se reproduce vía el iframe de YouTube (oculto), así que
-- no hay descarga/subida de audio de por medio. `title` se resuelve una vez
-- al agregar la canción (oEmbed público de YouTube, ver controller/youtube.js)
-- y queda cacheado en la fila. Mismo modelo que chapters/album_photos: sin
-- dueño-por-fila, cualquiera de las dos cuentas administra cualquier fila.
create table if not exists songs (
  id uuid primary key default gen_random_uuid(),
  video_id text not null,
  title text,
  hidden boolean not null default false,
  position integer,
  created_at timestamptz not null default now()
);
alter table songs enable row level security;

drop policy if exists "anyone can read songs" on songs;
create policy "anyone can read songs" on songs
  for select using (true);
drop policy if exists "authenticated users insert songs" on songs;
create policy "authenticated users insert songs" on songs
  for insert with check (auth.role() = 'authenticated');
drop policy if exists "authenticated users update songs" on songs;
create policy "authenticated users update songs" on songs
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "authenticated users delete songs" on songs;
create policy "authenticated users delete songs" on songs
  for delete using (auth.role() = 'authenticated');

-- Server-side counter for supabase/functions/login-attempt — keeps the
-- 3-attempt lockout real (a page reload can't reset it, unlike client-only
-- state) and caps how many times a script hitting the function directly
-- can probe a real account's password. Only the Edge Function's
-- service-role client ever touches this table.
create table if not exists login_throttle (
  identifier text primary key,
  fail_count integer not null default 0,
  first_fail_at timestamptz not null default now(),
  locked_until timestamptz
);
alter table login_throttle enable row level security;
-- No policies at all = no client access whatsoever, service role only.

alter table album_photos enable row level security;
alter table story_submissions enable row level security;
alter table chapters enable row level security;

drop policy if exists "anyone can read chapters" on chapters;
create policy "anyone can read chapters" on chapters
  for select using (true);
drop policy if exists "authenticated users insert chapters" on chapters;
create policy "authenticated users insert chapters" on chapters
  for insert with check (auth.role() = 'authenticated');
drop policy if exists "authenticated users update chapters" on chapters;
create policy "authenticated users update chapters" on chapters
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "authenticated users delete chapters" on chapters;
create policy "authenticated users delete chapters" on chapters
  for delete using (auth.role() = 'authenticated');

-- Solo un usuario autenticado (una de las dos cuentas) puede insertar.
drop policy if exists "authenticated users insert album" on album_photos;
create policy "authenticated users insert album" on album_photos
  for insert with check (auth.role() = 'authenticated');
-- Lectura del álbum: pública (para que se muestre en la sección Gallery).
drop policy if exists "anyone can read album" on album_photos;
create policy "anyone can read album" on album_photos
  for select using (true);
-- Ocultar/quitar desde la pestaña Galería (ChapterManager.jsx) — cualquiera
-- de las dos cuentas puede editar (el flag `hidden`) o borrar cualquier fila,
-- mismo modelo sin dueño-por-fila que chapters.
drop policy if exists "authenticated users update album" on album_photos;
create policy "authenticated users update album" on album_photos
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "authenticated users delete album" on album_photos;
create policy "authenticated users delete album" on album_photos
  for delete using (auth.role() = 'authenticated');

drop policy if exists "authenticated users insert story" on story_submissions;
create policy "authenticated users insert story" on story_submissions
  for insert with check (auth.role() = 'authenticated');
-- Lectura del diario: nadie desde el cliente público (ni el que subió puede
-- releerlo por esta vía) — Gustavo revisa desde el table editor de Supabase.
-- (sin policy de select = sin acceso de lectura pública, a propósito)

-- Storage buckets: correr esto una vez, o crearlos a mano en Storage → New
-- bucket. `album` público de lectura, `story-submissions` privado.
insert into storage.buckets (id, name, public)
values ('album', 'album', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('story-submissions', 'story-submissions', false)
on conflict (id) do nothing;

drop policy if exists "authenticated users upload to album bucket" on storage.objects;
create policy "authenticated users upload to album bucket" on storage.objects
  for insert with check (bucket_id = 'album' and auth.role() = 'authenticated');
drop policy if exists "anyone can read album bucket" on storage.objects;
create policy "anyone can read album bucket" on storage.objects
  for select using (bucket_id = 'album');
drop policy if exists "authenticated users delete from album bucket" on storage.objects;
create policy "authenticated users delete from album bucket" on storage.objects
  for delete using (bucket_id = 'album' and auth.role() = 'authenticated');

drop policy if exists "authenticated users upload to story bucket" on storage.objects;
create policy "authenticated users upload to story bucket" on storage.objects
  for insert with check (bucket_id = 'story-submissions' and auth.role() = 'authenticated');
-- Sin policy de select en el bucket story-submissions = sin lectura pública.
