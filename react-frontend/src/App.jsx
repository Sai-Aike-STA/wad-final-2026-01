import { useContext, useState } from "react";
import { HashRouter, Link, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { UserContext } from "./context/UserContext.js";
import Login from "./pages/Login";
import CourseList from "./pages/CourseList";
import CourseDetails from "./pages/CourseDetails";
import CourseForm from "./pages/CourseForm";

function Layout() {
  const { user, logout } = useContext(UserContext);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!user) return <Navigate to="/login" replace />;
  return <>
    <header>
      <h1>Online Course Service</h1>
      <p>{user.username} ({user.role})</p>
      <nav aria-label="Main navigation"><Link to="/courses">{user.role === "Teacher" ? "My courses" : "All courses"}</Link>{user.role === "Student" && <Link to="/enrollments">My enrollments</Link>}<button disabled={busy} onClick={async () => {
        setBusy(true);
        setError("");
        try { await logout(); } catch (error) { setError(error.message); }
        finally { setBusy(false); }
      }}>{busy ? "Signing out..." : "Sign out"}</button></nav>
      {error && <p role="alert">{error}</p>}
    </header>
    <main><Outlet /></main>
  </>;
}

function TeacherOnly() {
  const { user } = useContext(UserContext);
  return user.role === "Teacher" ? <Outlet /> : <Navigate to="/courses" replace />;
}

function StudentOnly() {
  const { user } = useContext(UserContext);
  return user.role === "Student" ? <Outlet /> : <Navigate to="/courses" replace />;
}

export default function App() {
  const { isInitializing } = useContext(UserContext);
  if (isInitializing) return <main><p role="status">Checking session...</p></main>;
  return <HashRouter><Routes>
    <Route path="/login" element={<Login />} />
    <Route element={<Layout />}>
      <Route path="/courses" element={<CourseList key="all" />} />
      <Route element={<TeacherOnly />}>
        <Route path="/courses/new" element={<CourseForm key="new" />} />
        <Route path="/courses/:courseId/edit" element={<CourseForm key="edit" />} />
      </Route>
      <Route path="/courses/:courseId" element={<CourseDetails />} />
      <Route element={<StudentOnly />}><Route path="/enrollments" element={<CourseList key="enrolled" enrolled />} /></Route>
    </Route>
    <Route path="*" element={<Navigate to="/courses" replace />} />
  </Routes></HashRouter>;
}
