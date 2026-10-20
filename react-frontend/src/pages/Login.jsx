import { useContext, useState } from "react";
import { Navigate } from "react-router-dom";
import { UserContext } from "../context/UserContext.js";

const demoAccounts = [
  { role: "Teacher 1", username: "John Smith", email: "johnsmith.teacher1@example.com", description: "John teaches web fundamentals with Open, Close, and Cancel courses and enrolled Students." },
  { role: "Teacher 2", username: "Emma Wilson", email: "emmawilson.teacher2@example.com", description: "Emma teaches backend courses, including a full MongoDB class." },
  { role: "Teacher 3", username: "Michael Lee", email: "michaellee.teacher3@example.com", description: "Michael is a new Teacher with no courses yet." },
  { role: "Student 1", username: "Alice Johnson", email: "alicejohnson.student1@example.com", description: "Alice is enrolled in HTML Fundamentals, CSS Layout, and Next.js APIs." },
  { role: "Student 2", username: "Daniel Brown", email: "danielbrown.student2@example.com", description: "Daniel is enrolled in HTML Fundamentals and the full MongoDB Basics course." },
  { role: "Student 3", username: "Sophia Davis", email: "sophiadavis.student3@example.com", description: "Sophia is a new Student with no enrollments yet." },
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
        <label>Email<input id="login-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <button disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
      </form>
      <details className="demo-accounts">
        <summary>Demo accounts (3 Teachers and 3 Students)</summary>
        <p>Use Fill login or copy an email and password, then select Sign in.</p>
        <div className="demo-account-groups">
          {["Teacher", "Student"].map((group) => (
            <section className="demo-account-grid" aria-label={`${group} demo accounts`} key={group}>
              {demoAccounts.filter((account) => account.role.startsWith(group)).map(({ role, username, email, description }) => (
                <article className="demo-account" key={email}>
                  <h3>{username}</h3>
                  <p className="demo-role">{role}</p>
                  <p>{description}</p>
                  <dl>
                    <dt>Email</dt>
                    <dd><code>{email}</code></dd>
                    <dt>Password</dt>
                    <dd><code>Course2026!</code></dd>
                  </dl>
                  <button type="button" disabled={busy} onClick={() => {
                    setEmail(email);
                    setPassword("Course2026!");
                    setError("");
                    document.getElementById("login-email").focus();
                  }}>Fill login</button>
                </article>
              ))}
            </section>
          ))}
        </div>
      </details>
    </main>
  );
}
