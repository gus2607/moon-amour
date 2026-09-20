import { useEffect, useMemo, useRef, useState } from "react";

const YT_ORIGIN = "https://www.youtube.com";

// YouTube's official bootstrap script (youtube.com/iframe_api) turned out to
// 503 consistently on Gustavo's network/browser — every control silently did
// nothing because window.YT never existed. This talks to the embed iframe
// directly via its postMessage protocol instead: no separate script to load
// or fail, just the actual /embed/<id> page, which is core YouTube traffic
// far less likely to be blocked than the widget-tracking-adjacent API script.
function embedSrc(videoId, { autoplay }) {
  const params = new URLSearchParams({
    enablejsapi: "1",
    playsinline: "1",
    origin: window.location.origin,
  });
  if (autoplay) params.set("autoplay", "1");
  return `${YT_ORIGIN}/embed/${videoId}?${params.toString()}`;
}

function postToPlayer(iframe, func) {
  iframe?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args: [] }), YT_ORIGIN);
}

// Only the codes that actually mean "this video won't play here" — not an
// exhaustive list of YouTube's player error codes.
const ERROR_MESSAGES = {
  2: "link de YouTube inválido",
  5: "error del reproductor HTML5",
  100: "video no encontrado o marcado privado",
  101: "el dueño del video bloqueó insertarlo en otros sitios",
  150: "el dueño del video bloqueó insertarlo en otros sitios",
};

// Fixed top-left vinyl (mirrors ChapterManager's top-right admin button).
// The actual audio is a 0x0 YouTube iframe — invisible, but still a real
// video decode, so it stays mounted only while there's at least one song.
// Hover reveals the title + prev/play/next panel; on touch (no hover),
// tapping the disc toggles the panel open the same way play/pause does.
// `isAdmin` only controls whether a failed-song notice is shown — every
// visitor sees and hears the same playlist either way.
export default function VinylPlayer({ songs, isAdmin }) {
  const iframeRef = useRef(null);
  const indexRef = useRef(0);
  const playingRef = useRef(false);
  const songsRef = useRef(songs);
  songsRef.current = songs;

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [adminNotice, setAdminNotice] = useState(null);

  function setPlayingState(value) {
    playingRef.current = value;
    setPlaying(value);
  }

  function goTo(nextIndex) {
    const list = songsRef.current;
    if (list.length === 0) return;
    const wrapped = ((nextIndex % list.length) + list.length) % list.length;
    indexRef.current = wrapped;
    setIndex(wrapped);
  }
  const goNext = () => goTo(indexRef.current + 1);
  const goPrev = () => goTo(indexRef.current - 1);

  function togglePlay() {
    const next = !playingRef.current;
    setPlayingState(next);
    postToPlayer(iframeRef.current, next ? "playVideo" : "pauseVideo");
  }

  useEffect(() => {
    function onMessage(e) {
      if (e.origin !== YT_ORIGIN || e.source !== iframeRef.current?.contentWindow) return;
      let data;
      try {
        data = JSON.parse(e.data);
      } catch {
        return;
      }
      if (data.event === "onError") {
        const song = songsRef.current[indexRef.current];
        setAdminNotice(
          `"${song?.title || "Esta canción"}" no sonó (${ERROR_MESSAGES[data.info] || `error ${data.info}`}) — pasando a la siguiente.`
        );
        goNext();
      } else if (data.event === "onStateChange" && data.info === 0) {
        goNext(); // ended
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // If the playlist shrinks (an item got hidden/deleted) out from under the
  // current index, snap back to the first track instead of pointing past
  // the end of the array.
  useEffect(() => {
    if (index >= songs.length && songs.length > 0) {
      indexRef.current = 0;
      setIndex(0);
    }
  }, [songs.length, index]);

  if (songs.length === 0) return null;
  const current = songs[index];
  // Recomputed only when the track itself changes (not on every play/pause
  // toggle) — reads playingRef at that moment so skipping tracks mid-playback
  // keeps playing, while a fresh page load or a paused skip doesn't autoplay.
  const src = useMemo(() => embedSrc(current.video_id, { autoplay: playingRef.current }), [current.id]);

  return (
    <div
      className={panelOpen ? "vinyl-player vinyl-player-active" : "vinyl-player"}
      onMouseEnter={() => setPanelOpen(true)}
      onMouseLeave={() => setPanelOpen(false)}
    >
      <iframe
        key={current.id}
        ref={iframeRef}
        className="vinyl-yt-frame"
        src={src}
        title="Reproductor de música"
        allow="autoplay; encrypted-media"
        tabIndex={-1}
        aria-hidden="true"
      />
      <button
        type="button"
        className={playing ? "vinyl-disc vinyl-disc-spinning" : "vinyl-disc"}
        onClick={() => {
          togglePlay();
          setPanelOpen((open) => !open);
        }}
        aria-label={playing ? "Pausar música" : "Reproducir música"}
      >
        <img src="/logo.png" alt="" />
      </button>

      <div className="vinyl-panel" role="group" aria-label="Reproductor de música">
        <p className="vinyl-panel-title">{current.title || "Nuestra música"}</p>
        {isAdmin && adminNotice && <p className="vinyl-admin-notice">⚠ {adminNotice}</p>}
        <div className="vinyl-panel-controls">
          <button type="button" onClick={goPrev} aria-label="Canción anterior">
            ⏮
          </button>
          <button type="button" onClick={togglePlay} aria-label={playing ? "Pausar" : "Reproducir"}>
            {playing ? "⏸" : "▶"}
          </button>
          <button type="button" onClick={goNext} aria-label="Siguiente canción">
            ⏭
          </button>
        </div>
      </div>
    </div>
  );
}
