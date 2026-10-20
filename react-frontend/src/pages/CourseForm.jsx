import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";

const emptyForm = { name: "", duration: "", topics: "", price: "", maxStudent: "", status: "Open" };

export default function CourseForm() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [loaded, setLoaded] = useState(!courseId);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    const controller = new AbortController();
    api(`/course/${courseId}`, { signal: controller.signal })
      .then(({ course }) => {
        setForm({ name: course.name, duration: course.duration, topics: course.topics.join("\n"), price: course.price, maxStudent: course.maxStudent, status: course.status });
        setLoaded(true);
      })
      .catch((error) => { if (error.name !== "AbortError") setError(error.message); });
    return () => controller.abort();
  }, [courseId]);

  function change(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api(courseId ? `/course/${courseId}` : "/course", {
        method: courseId ? "PUT" : "POST",
        body: JSON.stringify({ ...form, duration: Number(form.duration), price: Number(form.price), maxStudent: Number(form.maxStudent), topics: form.topics.split("\n").map((topic) => topic.trim()).filter(Boolean) }),
      });
      navigate(`/courses/${data.course._id}`);
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }

  return (
    <section className="course-form">
      <h2>{courseId ? "Edit course" : "Create course"}</h2>
      {error && <p role="alert">{error}</p>}
      {!loaded && !error && <p role="status">Loading course...</p>}
      {loaded && <form onSubmit={submit}>
        <label>Course name<input name="name" required maxLength={150} value={form.name} onChange={change} /></label>
        <label>Duration (days)<input name="duration" type="number" required min="1" step="1" value={form.duration} onChange={change} /></label>
        <label>Topics (one per line)<textarea name="topics" required rows="4" value={form.topics} onChange={change} /></label>
        <label>Price<input name="price" type="number" required min="0" step="0.01" value={form.price} onChange={change} /></label>
        <label>Max Student<input name="maxStudent" type="number" required min="1" step="1" value={form.maxStudent} onChange={change} /></label>
        <label>Status<select name="status" value={form.status} onChange={change}><option>Open</option><option>Close</option><option>Cancel</option></select></label>
        <div className="row actions"><button disabled={busy}>{busy ? "Saving..." : "Save course"}</button><Link to={courseId ? `/courses/${courseId}` : "/courses"}>Cancel</Link></div>
      </form>}
    </section>
  );
}
