import { useState } from "react";
import { SUPABASE_ENABLED } from "../controller/supabaseClient.js";

// Wraps an upload/edit entry point (Gallery's "+", DiaryPrompt's, or
// StoryEntries') so it can't be used until one of the two of you signs in —
// see useAuth.js. Renders children as-is when Supabase isn't configured
// yet, so the site behaves exactly like before until that backend exists.
export default function AuthGate({ auth, message, children }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  if (!SUPABASE_ENABLED) return children;
  if (auth.user) return children;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    const { ok } = await auth.signIn(email, password);
    if (!ok) setError("Correo o contraseña incorrectos.");
  }

  return (
    <div className="auth-gate">
      {message && <p className="auth-gate-message">{message}</p>}
      <form className="auth-form" onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Tu correo"
          aria-label="Correo"
          autoComplete="email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          aria-label="Contraseña"
          autoComplete="current-password"
          required
        />
        <button type="submit" disabled={auth.signingIn}>
          Entrar
        </button>
        {error && <p className="auth-message">{error}</p>}
      </form>
    </div>
  );
}
