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

function shuffleIds(ids) {
  const copy = [...ids];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
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
// Hover reveals the title + shuffle/prev/play/next panel; on touch (no
// hover), tapping the disc toggles the panel open the same way play/pause
// does. `isAdmin` only controls whether a failed-song notice is shown —
// every visitor sees, hears and can shuffle the same playlist either way.
export default function VinylPlayer({ songs, isAdmin }) {
  const iframeRef = useRef(null);
  const indexRef = useRef(0);
  const playingRef = useRef(false);
  const playlistRef = useRef([]);
  const currentIdRef = useRef(null);

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [adminNotice, setAdminNotice] = useState(null);

  // Random order on every load by default; the shuffle button flips back to
  // the admin's own fixed drag-to-reorder order from the Canciones tab.
  const [shuffled, setShuffled] = useState(true);
  const [order, setOrder] = useState(() => shuffleIds(songs.map((s) => s.id)));
  const prevShuffledRef = useRef(shuffled);

  // Rebuilds `order` whenever the song list changes (admin added/hid one)
  // or shuffle is toggled — a fresh full reshuffle only on the on-toggle
  // transition, otherwise existing order is kept and only new songs are
  // shuffled in, so playback isn't disrupted by an unrelated admin edit.
  useEffect(() => {
    const currentIds = songs.map((s) => s.id);
    const justToggledOn = shuffled && !prevShuffledRef.current;
    prevShuffledRef.current = shuffled;

    setOrder((prev) => {
      if (!shuffled) return currentIds;
      if (justToggledOn) return shuffleIds(currentIds);
      const existing = prev.filter((id) => currentIds.includes(id));
      const added = currentIds.filter((id) => !existing.includes(id));
      return [...existing, ...shuffleIds(added)];
    });
  }, [songs, shuffled]);

  const playlist = useMemo(() => {
    const byId = new Map(songs.map((s) => [s.id, s]));
    return order.map((id) => byId.get(id)).filter(Boolean);
  }, [order, songs]);
  playlistRef.current = playlist;

  // Whenever the effective playlist changes (shuffle toggled, or the admin
  // added/hid a song), keep pointing at whichever song was already loaded
  // instead of jumping to a different track — falls back to the first one
  // if it's no longer in the list at all.
  useEffect(() => {
    const found = playlist.findIndex((s) => s.id === currentIdRef.current);
    const resolved = found === -1 ? 0 : found;
    indexRef.current = resolved;
    currentIdRef.current = playlist[resolved]?.id ?? null;
    setIndex(resolved);
  }, [playlist]);

  function setPlayingState(value) {
    playingRef.current = value;
    setPlaying(value);
  }

  function goTo(nextIndex) {
    const list = playlistRef.current;
    if (list.length === 0) return;
    const wrapped = ((nextIndex % list.length) + list.length) % list.length;
    indexRef.current = wrapped;
    currentIdRef.current = list[wrapped].id;
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
        const song = playlistRef.current[indexRef.current];
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

  const current = playlist[index] ?? null;
  // Recomputed only when the track itself changes (not on every play/pause
  // toggle) — reads playingRef at that moment so skipping tracks mid-playback
  // keeps playing, while a fresh page load or a paused skip doesn't autoplay.
  // Hooks must run unconditionally on every render, so this — and every
  // other hook — stays above the songs.length===0 early return below.
  const src = useMemo(
    () => (current ? embedSrc(current.video_id, { autoplay: playingRef.current }) : ""),
    [current?.id]
  );

  if (songs.length === 0 || !current) return null;

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
          <button
            type="button"
            className={shuffled ? "vinyl-shuffle-btn vinyl-shuffle-active" : "vinyl-shuffle-btn"}
            onClick={() => setShuffled((s) => !s)}
            aria-pressed={shuffled}
            aria-label={shuffled ? "Desactivar orden aleatorio" : "Activar orden aleatorio"}
            title={shuffled ? "Orden aleatorio activado" : "Orden fijo"}
          >
            🔀
          </button>
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
