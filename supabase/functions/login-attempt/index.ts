// Classifies a FAILED sign-in attempt so useAuth.js can tell a stranger
// apart from one of the two of us who fumbled the password. Never reveals
// which account exists or its real password — only ever returns one of:
// "ok" (credentials were actually correct after all), "partial_match" (the
// email matches one of the two accounts, so a few more tries are fair), or
// "no_match" (unknown email, or the matching account is already locked out
// from too many recent failures). SUPABASE_URL/SUPABASE_ANON_KEY/
// SUPABASE_SERVICE_ROLE_KEY are injected automatically into every Edge
// Function, no secrets to set here.
//
// Security note: this does NOT try the submitted password against the
// *other* known account to detect a "right password, wrong email" typo —
// an earlier version did, which turned this into an automated
// password-guessing oracle against both real accounts (one request could
// test a guessed password against every account at once). Removed; the
// only signal used is whether the submitted email itself is recognized.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";

const ALLOWED_ORIGINS = new Set(["https://moon-amour.vercel.app", "http://localhost:5173"]);
const MAX_ATTEMPTS = 3;
const LOCK_MINUTES = 30;

function corsHeaders(origin) {
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://moon-amour.vercel.app";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    Vary: "Origin",
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  let email, password;
  try {
    ({ email, password } = await req.json());
  } catch {
    return json({ error: "bad_request" }, 400, origin);
  }
  if (!email || !password) return json({ error: "bad_request" }, 400, origin);

  const identifier = String(email).trim().toLowerCase();
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: throttleRow } = await admin
    .from("login_throttle")
    .select("fail_count, locked_until")
    .eq("identifier", identifier)
    .maybeSingle();

  // Already locked out from prior failures — don't even attempt sign-in.
  // This keeps the lock meaningful against a caller that skips the client
  // entirely and hits this function directly in a loop.
  if (throttleRow?.locked_until && new Date(throttleRow.locked_until) > new Date()) {
    return json({ status: "no_match" }, 200, origin);
  }

  const asIs = createClient(url, anonKey);
  const { error: asIsError } = await asIs.auth.signInWithPassword({ email, password });
  if (!asIsError) {
    if (throttleRow) await admin.from("login_throttle").delete().eq("identifier", identifier);
    return json({ status: "ok" }, 200, origin);
  }

  const { data: usersPage, error: listError } = await admin.auth.admin.listUsers();
  if (listError) return json({ error: "lookup_failed" }, 500, origin);

  const emailKnown = usersPage.users.some((u) => (u.email || "").toLowerCase() === identifier);
  if (!emailKnown) return json({ status: "no_match" }, 200, origin);

  const nextCount = (throttleRow?.fail_count || 0) + 1;
  const lockedUntil = nextCount >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null;

  await admin.from("login_throttle").upsert({
    identifier,
    fail_count: nextCount,
    locked_until: lockedUntil,
  });

  return json(
    {
      status: nextCount >= MAX_ATTEMPTS ? "no_match" : "partial_match",
      attemptsLeft: Math.max(0, MAX_ATTEMPTS - nextCount),
    },
    200,
    origin
  );
});
