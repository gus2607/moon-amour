import { useCallback, useEffect, useState } from "react";
import { supabase, SUPABASE_ENABLED } from "./supabaseClient.js";

// Replaces the old device-token whitelist with real Supabase Auth. Only the
// two accounts Gustavo creates in the Supabase dashboard (Authentication ->
// Users -> Add user) — his and Luna's — can ever sign in, so "signed in"
// and "one of us" are the same thing here; no separate approval step needed.
const MAX_ATTEMPTS = 3;
const DENIED_KEY = "auth_denied";

// A known account's lockout is enforced server-side (login_throttle) and
// survives a reload on its own. An unrecognized email has nothing to
// persist server-side — sessionStorage is what makes "denied for the rest
// of the visit" true for that case too, instead of a reload silently
// bringing the login form and every "+" back.
function readDeniedFromSession() {
  try {
    return sessionStorage.getItem(DENIED_KEY) === "1";
  } catch {
    return false;
  }
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [signingIn, setSigningIn] = useState(false);
  // A stranger (email doesn't match either account) is denied on the spot;
  // a mistyped password against a real account gets MAX_ATTEMPTS tries
  // before the same denial kicks in. The actual counter lives server-side
  // in the login_throttle table (see supabase/functions/login-attempt) so
  // reloading the page can't reset it — attemptsLeft here just mirrors what
  // the function reports, it's not the source of truth. `denied` hides
  // every "+" upload entry point (AuthGate, Gallery, DiaryPrompt) for the
  // rest of the visit.
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
  const [denied, setDeniedState] = useState(readDeniedFromSession);

  const setDenied = useCallback((value) => {
    setDeniedState(value);
    try {
      if (value) sessionStorage.setItem(DENIED_KEY, "1");
      else sessionStorage.removeItem(DENIED_KEY);
    } catch {
      // sessionStorage unavailable (private mode, etc.) — denied still
      // works for the current in-memory session, just won't survive reload.
    }
  }, []);

  useEffect(() => {
    if (!SUPABASE_ENABLED) return;
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(
    async (email, password) => {
      if (denied) return { ok: false, denied: true };
      setSigningIn(true);
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error) {
          setAttemptsLeft(MAX_ATTEMPTS);
          return { ok: true, error: null };
        }

        const { data, error: fnError } = await supabase.functions.invoke("login-attempt", {
          body: { email, password },
        });

        // The function re-attempts sign-in itself, so a transient failure
        // on our first try (network blip) can still come back "ok" for a
        // genuinely correct password — without this, that case fell
        // through to the retry-counting branch below and burned a real
        // lockout attempt against the account holder for no reason.
        if (!fnError && data?.status === "ok") {
          setAttemptsLeft(MAX_ATTEMPTS);
          return { ok: true, error: null };
        }
        if (!fnError && data?.status === "no_match") {
          setDenied(true);
          return { ok: false, denied: true };
        }

        // Either the classifier is unreachable or it said partial_match —
        // both count against the same local budget so neither path can
        // fail open to unlimited retries.
        const remaining =
          !fnError && typeof data?.attemptsLeft === "number" ? data.attemptsLeft : Math.max(0, attemptsLeft - 1);
        setAttemptsLeft(remaining);
        if (remaining <= 0) {
          setDenied(true);
          return { ok: false, denied: true };
        }
        return { ok: false, denied: false, attemptsLeft: remaining, error };
      } finally {
        setSigningIn(false);
      }
    },
    [denied, attemptsLeft]
  );

  const signOut = useCallback(() => supabase.auth.signOut(), []);

  return { user, signingIn, signIn, signOut, denied, attemptsLeft };
}
