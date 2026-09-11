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

-- Capítulos escritos por la pareja: a diferencia de story_submissions, esto
-- publica de inmediato y cualquiera de las dos cuentas puede editar
-- cualquier fila — sin revisión, sin dueño por fila. Ver StoryEntries.jsx.
create table if not exists story_entries (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date_label text,
  body text not null,
  author text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table album_photos enable row level security;
alter table story_submissions enable row level security;
alter table story_entries enable row level security;

drop policy if exists "anyone can read story entries" on story_entries;
create policy "anyone can read story entries" on story_entries
  for select using (true);
drop policy if exists "authenticated users insert story entries" on story_entries;
create policy "authenticated users insert story entries" on story_entries
  for insert with check (auth.role() = 'authenticated');
drop policy if exists "authenticated users update story entries" on story_entries;
create policy "authenticated users update story entries" on story_entries
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Solo un usuario autenticado (una de las dos cuentas) puede insertar.
drop policy if exists "authenticated users insert album" on album_photos;
create policy "authenticated users insert album" on album_photos
  for insert with check (auth.role() = 'authenticated');
-- Lectura del álbum: pública (para que se muestre en la sección Gallery).
drop policy if exists "anyone can read album" on album_photos;
create policy "anyone can read album" on album_photos
  for select using (true);

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

drop policy if exists "authenticated users upload to story bucket" on storage.objects;
create policy "authenticated users upload to story bucket" on storage.objects
  for insert with check (bucket_id = 'story-submissions' and auth.role() = 'authenticated');
-- Sin policy de select en el bucket story-submissions = sin lectura pública.
