import { useCallback, useEffect, useRef, useState } from "react";

const DB_NAME = "love-story-media";
const STORE = "uploads";
// Client-side-only cap: nothing enforces this except this code (a visitor
// with devtools open could bypass it), but it protects an ordinary visitor
// from accidentally filling their own IndexedDB/tab memory with an
// oversized video, which is the realistic failure mode here.
const MAX_FILE_BYTES = 80 * 1024 * 1024; // 80MB

const DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);
const DOCUMENT_EXTENSIONS = new Set(["pdf", "doc", "docx", "txt"]);

// image/video/document, or null if this isn't something we accept. Some
// browsers report an empty file.type for .doc/.docx, so extension is a
// fallback there.
function classifyFile(file) {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (DOCUMENT_MIME_TYPES.has(file.type)) return "document";
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext && DOCUMENT_EXTENSIONS.has(ext)) return "document";
  return null;
}

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

// This site is static — no backend to upload to — so "adding a memory"
// means storing it in this browser's IndexedDB instead. It survives
// reloads on this device, but won't sync to another device or browser;
// that would need a real backend.
export function useUploadedMedia() {
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
    const files = Array.from(fileList || [])
      .map((f) => ({ file: f, kind: classifyFile(f) }))
      .filter(({ file, kind }) => kind && file.size > 0 && file.size <= MAX_FILE_BYTES);
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
