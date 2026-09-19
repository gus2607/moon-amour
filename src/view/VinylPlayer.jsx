import { useEffect, useRef, useState } from "react";

const PLAYER_ELEMENT_ID = "vinyl-yt-player";

// YouTube's IFrame API is loaded once and shared for the whole page
// lifetime (there's only ever one VinylPlayer). window.onYouTubeIframeAPIReady
// is YouTube's own required global hook — it calls it, not us.
let ytApiPromise = null;
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT);
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return ytApiPromise;
}

// Fixed top-left vinyl (mirrors ChapterManager's top-right admin button).
// The actual audio is a 0x0 YouTube iframe — invisible, but still a real
// video decode, so it stays mounted only while there's at least one song.
// Hover reveals the title + prev/play/next panel; on touch (no hover),
// tapping the disc toggles the panel open the same way play/pause does.
export default function VinylPlayer({ songs }) {
  const playerRef = useRef(null);
  const indexRef = useRef(0);
  const songsRef = useRef(songs);
  songsRef.current = songs;

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  function goTo(nextIndex) {
    const list = songsRef.current;
    if (list.length === 0) return;
    const wrapped = ((nextIndex % list.length) + list.length) % list.length;
    indexRef.current = wrapped;
    setIndex(wrapped);
    playerRef.current?.loadVideoById?.(list[wrapped].video_id);
  }
  const goNext = () => goTo(indexRef.current + 1);
  const goPrev = () => goTo(indexRef.current - 1);

  function togglePlay() {
    const player = playerRef.current;
    if (!player) return;
    if (playing) player.pauseVideo();
    else player.playVideo();
  }

  // One-time player creation once there's a first song to play. Deliberately
  // keyed on songs.length === 0 → >0 rather than every songs change — the
  // list can be re-fetched/reordered without tearing down playback.
  useEffect(() => {
    if (songs.length === 0 || playerRef.current) return;
    let cancelled = false;
    loadYouTubeApi().then((YT) => {
      if (cancelled || playerRef.current) return;
      playerRef.current = new YT.Player(PLAYER_ELEMENT_ID, {
        height: "0",
        width: "0",
        videoId: songsRef.current[0]?.video_id,
        playerVars: { playsinline: 1 },
        events: {
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.ENDED) goNext();
            setPlaying(e.data === YT.PlayerState.PLAYING);
          },
          // Embedding disabled / video removed (codes 101, 150, 100) —
          // skip it rather than sitting silently on a dead track.
          onError: () => goNext(),
        },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [songs.length > 0]);

  // If the playlist shrinks (an item got hidden/deleted) out from under the
  // current index, snap back to the first track instead of pointing past
  // the end of the array.
  useEffect(() => {
    if (index >= songs.length && songs.length > 0) {
      indexRef.current = 0;
      setIndex(0);
      playerRef.current?.loadVideoById?.(songs[0].video_id);
    }
  }, [songs.length, index]);

  useEffect(() => () => playerRef.current?.destroy?.(), []);

  if (songs.length === 0) return null;
  const current = songs[index];

  return (
    <div
      className={panelOpen ? "vinyl-player vinyl-player-active" : "vinyl-player"}
      onMouseEnter={() => setPanelOpen(true)}
      onMouseLeave={() => setPanelOpen(false)}
    >
      <div id={PLAYER_ELEMENT_ID} className="vinyl-yt-frame" aria-hidden="true" />
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
        <p className="vinyl-panel-title">{current?.title || "Nuestra música"}</p>
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
