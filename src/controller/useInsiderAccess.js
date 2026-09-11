import { useEffect, useState } from "react";

const STORAGE_KEY = "love-story-insider";
const QUERY_PARAM = "llave";
// Shared secret for the one-time unlock link. Change it here, then send Luna
// https://ourhistorylyg.vercel.app/?llave=<value> once — opening it persists
// the flag below in her browser (until she clears site data), so she never
// needs the link again.
const SECRET = "lunaygustavo2022";

function hasStoredUnlock() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

// Public visitors should never see the upload UI at all — not even the
// sign-in form (see AuthGate.jsx). This gates on top of that: only a
// browser that has opened the shared link gets the "add memory" entry
// points, and from there the normal Supabase Auth sign-in still applies.
export function useInsiderAccess() {
  const [isInsider, setIsInsider] = useState(hasStoredUnlock);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get(QUERY_PARAM) !== SECRET) return;

    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // Private browsing etc — unlock for this session anyway.
    }
    setIsInsider(true);

    // Drop the secret from the address bar so a screenshot or a shared URL
    // doesn't hand it to someone else.
    params.delete(QUERY_PARAM);
    const rest = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (rest ? `?${rest}` : ""));
  }, []);

  return isInsider;
}
