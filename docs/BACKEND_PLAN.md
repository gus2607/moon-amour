# Plan: backend real para subidas (álbum + diario) + whitelist de dispositivos

Pedido por Gustavo el 2026-09-08, para ejecutar en una sesión futura. Hoy el
sitio es 100% estático y las subidas (`src/controller/useUploadedMedia.js`)
solo se guardan en el IndexedDB del navegador de quien sube — no hay backend,
no se sincroniza entre dispositivos. Esto reemplaza esa pieza por una base de
datos real, sin tocar el resto del sitio (Three.js background, carrusel,
contenido de `story.js`, etc. quedan igual).

## Requisitos exactos del pedido

1. Base de datos real que reciba fotos/archivos de usuarios.
2. Sección **álbum** (Gallery): lo que suba un usuario se carga y se añade
   directo al álbum (visible para todos, sin revisión previa).
3. Sección **historia** (el botón + debajo del Capítulo 5 / DiaryPrompt): lo
   que se suba ahí se guarda para que Gustavo lo revise después y decida si
   lo añade o lo edita — **no debe aparecer público automáticamente**.
4. Whitelist de dispositivos: solo los dispositivos aprobados pueden subir.

## Stack recomendado: Supabase

Por qué: Postgres real + Storage (S3-compatible) + Row Level Security (RLS)
en un solo servicio, tier gratis suficiente para este sitio (~64MB de media
actual), y RLS resuelve el whitelist sin tener que escribir un backend propio
— las reglas de acceso viven en la base de datos, el frontend solo llama al
SDK de Supabase directo desde el navegador con la `anon key` (segura de
exponer en el cliente **siempre que las políticas RLS estén bien puestas** —
ver abajo, es el punto crítico de seguridad de este plan).

Alternativa equivalente si se prefiere: Firebase (Firestore + Storage +
Security Rules cumplen el mismo rol que Postgres+RLS aquí). El plan de abajo
es directamente trasladable, solo cambia la sintaxis de las reglas.

## Esquema de base de datos

```sql
-- Dispositivos: whitelist por token de navegador, no hardware real (la web
-- no tiene esa capacidad). Ver "Mecanismo de whitelist" abajo.
create table devices (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique,        -- generado client-side, guardado en localStorage
  label text,                        -- ej. "Luna's phone", lo escribe ella al pedir acceso
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

-- Álbum: lo que aquí entra se muestra directo en la sección Gallery.
create table album_photos (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,        -- ruta en el bucket de Storage
  type text not null check (type in ('image','video')),
  caption text,
  device_token uuid references devices(token),
  created_at timestamptz not null default now()
);

-- Diario: todo lo que entra aquí queda pendiente hasta que Gustavo lo revise.
create table story_submissions (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  type text not null check (type in ('image','video','document')),
  original_filename text,
  note text,                         -- si se quiere dejar un mensaje al subir
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  device_token uuid references devices(token),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
```

## Políticas RLS (el corazón del whitelist)

```sql
alter table devices enable row level security;
alter table album_photos enable row level security;
alter table story_submissions enable row level security;

-- Cualquiera puede pedir registrar su dispositivo (queda approved=false).
create policy "anyone can request device" on devices
  for insert with check (approved = false);

-- Nadie puede leer la tabla devices desde el cliente (evita listar tokens ajenos).
-- (sin policy de select = sin acceso de lectura pública)

-- Solo dispositivos aprobados pueden insertar en el álbum.
create policy "approved devices insert album" on album_photos
  for insert with check (
    exists (select 1 from devices d where d.token = device_token and d.approved = true)
  );
-- Lectura del álbum: pública (para que se muestre en la sección Gallery).
create policy "anyone can read album" on album_photos
  for select using (true);

-- Solo dispositivos aprobados pueden insertar al diario.
create policy "approved devices insert story" on story_submissions
  for insert with check (
    exists (select 1 from devices d where d.token = device_token and d.approved = true)
  );
-- Lectura del diario: NADIE desde el cliente público (ni siquiera el que subió
-- lo puede releer por esta vía) — Gustavo revisa desde el dashboard de
-- Supabase directamente, o desde una vista /admin protegida (ver abajo).
-- (sin policy de select = sin acceso de lectura pública, correcto a propósito)
```

Storage: dos buckets, `album` (público de lectura) y `story-submissions`
(privado, sin acceso público de lectura — mismo criterio que la tabla).

## Mecanismo de whitelist (flujo completo)

1. Primera vez que un navegador intenta subir algo, el frontend genera un
   `crypto.randomUUID()`, lo guarda en `localStorage`, y hace
   `insert into devices` con ese token + un `label` que la persona escribe
   (ej. "El celular de Luna"). Queda con `approved: false`.
2. El frontend muestra un mensaje: "Pedido enviado, Gustavo tiene que
   aprobar este dispositivo antes de que puedas subir algo."
3. Gustavo aprueba desde el **table editor de Supabase** directamente
   (`update devices set approved = true where id = '...'`) — no hace falta
   construir una pantalla de administración para esto, es un cambio de un
   campo boolean en una tabla, más rápido a mano que programando una UI.
4. Desde ese momento, cada subida desde ese navegador manda su `token`
   guardado, y la política RLS del paso anterior lo deja pasar.
5. Si Luna borra los datos del sitio en su navegador o cambia de
   dispositivo, tiene que pedir aprobación de nuevo (un token nuevo, un
   `label` nuevo) — comportamiento esperado y aceptable para este caso de
   uso.

Alternativa más simple si no se quiere este flujo de aprobación por
dispositivo: una **frase secreta compartida** (Gustavo se la dice a Luna una
vez) que se pide antes de subir, verificada contra un valor guardado en una
env var de Supabase (Edge Function) o incluso hasheada en la tabla
`devices`. Menos elegante, mucho menos código. Decidir cuál de las dos
implementar al empezar esta tarea — el esquema de arriba ya soporta ambas
sin cambios grandes.

## Qué cambia en el código (checklist para la sesión)

- [ ] Crear proyecto en Supabase (cuenta de Gustavo — requiere su acción,
      no se puede automatizar sin sus credenciales).
- [ ] Correr el SQL de arriba (tablas + políticas + buckets) en el SQL
      editor de Supabase.
- [ ] `npm install @supabase/supabase-js`.
- [ ] Variables de entorno: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
      — en `.env.local` (gitignorado) para desarrollo, y en Vercel →
      Settings → Environment Variables para producción. **Nunca
      commitear estos valores al repo.**
- [ ] Nuevo `src/controller/useDeviceAuth.js`: genera/lee el token de
      `localStorage`, expone `{approved, requestAccess(label)}`.
- [ ] Reescribir `src/controller/useUploadedMedia.js` para que en vez de
      IndexedDB hable con Supabase Storage + tabla `album_photos` (esto
      alimenta el carrusel del álbum — reemplaza el fetch de
      `content.slots` estático por `contenido estático + fetch de
      album_photos`, ordenados por `created_at`).
- [ ] Nuevo `src/controller/useStorySubmissions.js` para el flujo de
      `DiaryPrompt.jsx`: sube a Storage + inserta en `story_submissions`
      (nunca lee esa tabla desde el cliente).
- [ ] `DiaryPrompt.jsx`: si el dispositivo no está aprobado, mostrar el
      formulario para pedir acceso (label + botón) en vez del uploader.
- [ ] Opcional (mejora, no bloqueante): una ruta `/admin` protegida por
      contraseña simple donde Gustavo vea `story_submissions` pendientes
      con botones aprobar/editar/rechazar, en vez de usar el dashboard de
      Supabase a mano. Sugerido como fase 2, no necesario para que la
      fase 1 funcione.
- [ ] Actualizar `vercel.json` CSP: agregar el dominio de Supabase a
      `connect-src` e `img-src`/`media-src` (`https://<project>.supabase.co`).
- [ ] Quitar/dejar como fallback el código de IndexedDB actual, o
      eliminarlo si se confirma que ya no hace falta.

## Qué NO cambia

Todo lo demás del sitio (fondo Van Gogh/Three.js, carrusel, textos de
`story.js`, diseño) sigue exactamente igual — este trabajo es aislado a la
capa de subida de archivos.
