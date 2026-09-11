import { useCallback, useEffect, useRef, useState } from "react";
import { SUPABASE_ENABLED } from "./supabaseClient.js";
import { useAlbumMedia } from "./useAlbumMedia.js";
import { acceptedFiles } from "./fileClassification.js";

const DB_NAME = "love-story-media";
const STORE = "uploads";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGetAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Downscales + recompresses an image client-side so a full-resolution phone
// photo doesn't bloat IndexedDB or the carousel. Videos pass through
// untouched — real client-side transcoding isn't practical in-browser
// without a heavy library, so that's a known limit of "optimiza" for video.
function optimizeImage(file, { maxDim = 1600, quality = 0.82 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale) || 1;
      const h = Math.round(img.height * scale) || 1;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objUrl);
          blob ? resolve(blob) : reject(new Error("No se pudo optimizar la imagen"));
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objUrl);
      reject(new Error("No se pudo leer la imagen"));
    };
    img.src = objUrl;
  });
}

// Gallery/album storage. Dispatches to the Supabase-backed useAlbumMedia
// once VITE_SUPABASE_URL/ANON_KEY are configured (see supabaseClient.js and
// docs/BACKEND_PLAN.md). SUPABASE_ENABLED is a build-time constant fixed
// for the app's whole lifetime, so this conditional call never actually
// changes which branch runs between renders — calling only the hook that's
// needed skips opening/hydrating IndexedDB entirely once Supabase is live.
export function useUploadedMedia() {
  return SUPABASE_ENABLED ? useAlbumMedia() : useLocalUploadedMedia();
}

// Legacy fallback while no Supabase project exists yet: storing in this
// browser's IndexedDB. Survives reloads on this device, but never syncs
// anywhere else.
function useLocalUploadedMedia() {
  const [items, setItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const urlsRef = useRef([]);

  useEffect(() => {
    let cancelled = false;
    dbGetAll()
      .then((records) => {
        if (cancelled) return;
        records.sort((a, b) => a.createdAt - b.createdAt);
        const withUrls = records.map((r) => ({ ...r, url: URL.createObjectURL(r.blob) }));
        urlsRef.current.push(...withUrls.map((r) => r.url));
        setItems(withUrls);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const urls = urlsRef.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const addFiles = useCallback(async (fileList) => {
    const files = acceptedFiles(fileList);
    if (files.length === 0) return { added: 0 };
    setUploading(true);
    try {
      const newRecords = [];
      for (const { file, kind } of files) {
        const blob = kind === "image" ? await optimizeImage(file).catch(() => file) : file;
        const url = URL.createObjectURL(blob);
        urlsRef.current.push(url);
        newRecords.push({
          id: `up-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: kind,
          name: file.name,
          blob,
          url,
          createdAt: Date.now(),
        });
      }
      for (const record of newRecords) {
        const { url, ...toStore } = record;
        try {
          await dbPut(toStore);
        } catch {
          // best-effort persistence (e.g. private browsing) — still show
          // it for this session even if it won't survive a reload
        }
      }
      setItems((prev) => [...prev, ...newRecords]);
      return { added: newRecords.length };
    } finally {
      setUploading(false);
    }
  }, []);

  return { items, addFiles, uploading };
}
