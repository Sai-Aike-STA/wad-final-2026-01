import { useContext, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { UserContext } from "../context/UserContext.js";
import { api } from "../lib/api";

export default function CourseDetails() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const [course, setCourse] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [message, setMessage] = useState("");
  const teacher = user.role === "Teacher";

  useEffect(() => {
    const controller = new AbortController();
    api(`/course/${courseId}`, { signal: controller.signal })
      .then((data) => setCourse(data.course))
      .catch((error) => { if (error.name !== "AbortError") { setCourse(null); setError(error.message); } });
    return () => controller.abort();
  }, [courseId, revision]);

  async function enroll() {
    setBusy(true);
    setError("");
    try {
      await api(`/course/${courseId}/enroll`, { method: "POST" });
      setMessage("Enrollment successful.");
    } catch (error) { setError(error.message); }
    finally { setBusy(false); setRevision((value) => value + 1); }
  }

  async function remove() {
    if (!window.confirm(`Delete ${course.name}?`)) return;
    setBusy(true);
    setError("");
    try {
      await api(`/course/${courseId}`, { method: "DELETE" });
      navigate("/courses");
    } catch (error) { setError(error.message); setRevision((value) => value + 1); }
    finally { setBusy(false); }
  }

  return (
    <section>
      <Link to="/courses">Back to courses</Link>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {!course && !error && <p role="status">Loading course...</p>}
      {course && <>
        <h2>{course.name}</h2>
        <dl>
          <dt>Teacher</dt><dd>{course.teacherName}</dd>
          <dt>Duration</dt><dd>{course.duration} days</dd>
          <dt>Topics</dt><dd><ul>{course.topics.map((topic, index) => <li key={index}>{topic}</li>)}</ul></dd>
          <dt>Price</dt><dd>{course.price.toFixed(2)}</dd>
          <dt>Enrollment</dt><dd>{course.enrolledCount} / {course.maxStudent}</dd>
          <dt>Status</dt><dd>{course.status}</dd>
        </dl>
        {teacher ? <>
          <div className="row actions"><Link to={`/courses/${courseId}/edit`}>Edit course</Link><button disabled={busy || course.enrolledCount > 0} onClick={remove}>Delete course</button></div>
          {course.enrolledCount > 0 && <p>Courses with enrolled Students cannot be deleted.</p>}
          <h3>Enrolled Students ({course.enrolledCount})</h3>
          {course.students.length === 0 ? <p>No Students enrolled.</p> : <ul>{course.students.map((student) => <li key={student._id}>{student.username} ({student.email})</li>)}</ul>}
        </> : course.isEnrolled ? <p>You are enrolled in this course.</p> : <>
          <button disabled={busy || course.status !== "Open" || course.enrolledCount >= course.maxStudent} onClick={enroll}>{busy ? "Enrolling..." : "Enroll"}</button>
          {course.status !== "Open" && <p>This course is closed for enrollment.</p>}
          {course.status === "Open" && course.enrolledCount >= course.maxStudent && <p>This course is full.</p>}
        </>}
      </>}
    </section>
  );
}
