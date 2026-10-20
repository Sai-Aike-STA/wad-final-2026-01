import { useContext, useState } from "react";
import { Navigate } from "react-router-dom";
import { UserContext } from "../context/UserContext.js";

export default function Login() {
  const { user, login, initializationError } = useContext(UserContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/courses" replace />;

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try { await login(email, password); }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }

  return (
    <main className="login">
      <h1>Online Course Service</h1>
      <p>Sign in as a Student or Teacher.</p>
      {(error || initializationError) && <p role="alert">{error || initializationError}</p>}
      <form onSubmit={submit}>
        <label>Email<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <button disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
      </form>
    </main>
  );
}
