// Client-side-only cap shared by every upload path: nothing enforces it but
// this code (anyone with devtools open could bypass it), it just keeps an
// ordinary visitor from accidentally filling their own IndexedDB/tab memory
// — or a Storage bucket — with an oversized video, the realistic failure
// mode here.
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

// The identical first pass every upload entry point (album, diary, legacy
// IndexedDB fallback) makes over a picked FileList, so the accepted-file
// rules can't drift between them: classify each file, then drop anything
// unrecognized, empty or over the cap. `allowedKinds` narrows it further —
// the album carousel takes photos/videos only, the diary takes documents too.
export function acceptedFiles(fileList, allowedKinds) {
  return Array.from(fileList || [])
    .map((file) => ({ file, kind: classifyFile(file) }))
    .filter(
      ({ file, kind }) =>
        kind &&
        (!allowedKinds || allowedKinds.includes(kind)) &&
        file.size > 0 &&
        file.size <= MAX_FILE_BYTES
    );
}
