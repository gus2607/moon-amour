import { useCallback, useEffect, useState } from "react";
import { supabase, SUPABASE_ENABLED } from "./supabaseClient.js";

// Replaces the old device-token whitelist with real Supabase Auth. Only the
// two accounts Gustavo creates in the Supabase dashboard (Authentication ->
// Users -> Add user) — his and Luna's — can ever sign in, so "signed in"
// and "one of us" are the same thing here; no separate approval step needed.
export function useAuth() {
  const [user, setUser] = useState(null);
  const [signingIn, setSigningIn] = useState(false);

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

  const signIn = useCallback(async (email, password) => {
    setSigningIn(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { ok: !error, error };
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signOut = useCallback(() => supabase.auth.signOut(), []);

  return { user, signingIn, signIn, signOut };
}
