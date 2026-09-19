// Shared by useSongs.js (parsing what gets pasted into the Canciones admin
// tab) and VinylPlayer.jsx has no need for these — it only ever deals with
// already-stored video_id values.

// Accepts any of the URL shapes people actually paste: watch?v=, youtu.be/,
// /embed/, /shorts/, with or without extra query params (&t=, ?si=, etc).
// Returns null (rather than throwing) for anything that isn't recognizably
// a YouTube link, so the caller can show a plain validation message.
export function extractYouTubeId(url) {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");
    if (host === "youtu.be") {
      return u.pathname.slice(1).split("/")[0] || null;
    }
    if (host === "youtube.com" || host === "music.youtube.com") {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const match = u.pathname.match(/^\/(embed|shorts)\/([^/?]+)/);
      if (match) return match[2];
    }
    return null;
  } catch {
    return null;
  }
}

// YouTube's oEmbed endpoint is public and CORS-enabled — no API key needed
// just to read a video's title. Best-effort: a private/deleted video (or a
// network hiccup) just means the song is stored with a blank title instead
// of blocking the add.
export async function fetchYouTubeTitle(url) {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.title || null;
  } catch {
    return null;
  }
}
