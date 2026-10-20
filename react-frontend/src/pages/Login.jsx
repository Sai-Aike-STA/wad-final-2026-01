import { useContext, useState } from "react";
import { Navigate } from "react-router-dom";
import { UserContext } from "../context/UserContext.js";

const demoAccounts = [
  { role: "Teacher", username: "teacher1" },
  { role: "Teacher", username: "teacher2" },
  { role: "Teacher", username: "teacher3" },
  { role: "Student", username: "student1" },
  { role: "Student", username: "student2" },
  { role: "Student", username: "student3" },
];

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
      <section className="demo-accounts" aria-labelledby="demo-accounts-heading">
        <h2 id="demo-accounts-heading">Demo accounts</h2>
        <p>Copy an email and password below to test either role. Use the email address to sign in.</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Role</th>
                <th scope="col">Username</th>
                <th scope="col">Email</th>
                <th scope="col">Password</th>
              </tr>
            </thead>
            <tbody>
              {demoAccounts.map(({ role, username }) => (
                <tr key={username}>
                  <td>{role}</td>
                  <td>{username}</td>
                  <td><code>{username}@example.com</code></td>
                  <td><code>Course2026!</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
