import { useRef } from "react";

// Shared "+" trigger + hidden file input, reused by Gallery's own upload
// prompt and DiaryPrompt.jsx — both just hand a FileList up to onUpload,
// which lives in App.jsx alongside the shared useUploadedMedia() + toast.
export default function UploadButton({ onUpload, uploading, accept, label }) {
  const fileInputRef = useRef(null);

  async function onFilesChosen(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    // Resetting the input's value invalidates the picked File's data for
    // any *new* read started afterward, so the reset happens only once
    // onUpload is fully done reading/storing everything, not before.
    await onUpload(files);
    e.target.value = "";
  }

  return (
    <>
      <button
        type="button"
        className="add-memory-btn"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        aria-label={label}
      >
        {uploading ? <span className="add-memory-spinner" aria-hidden="true" /> : "+"}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple
        className="file-input-hidden"
        onChange={onFilesChosen}
      />
    </>
  );
}
