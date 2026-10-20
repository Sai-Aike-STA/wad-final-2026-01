import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UserContext } from "../context/UserContext.js";
import { api } from "../lib/api";

export default function CourseList({ enrolled = false }) {
  const { user } = useContext(UserContext);
  const [courses, setCourses] = useState(null);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const teacher = user.role === "Teacher";

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ search, enrolled: String(enrolled) });
    api(`/course?${params}`, { signal: controller.signal })
      .then((data) => { setCourses(data.courses); setError(""); })
      .catch((error) => { if (error.name !== "AbortError") setError(error.message); });
    return () => controller.abort();
  }, [search, enrolled]);

  return (
    <section>
      <div className="row"><h2>{teacher ? "My courses" : enrolled ? "My enrollments" : "All courses"}</h2>{teacher && <Link to="/courses/new">Create course</Link>}</div>
      {!teacher && <form className="search" onSubmit={(event) => { event.preventDefault(); if (input.trim() !== search) { setCourses(null); setError(""); setSearch(input.trim()); } }}>
        <label>Course or Teacher name<input maxLength={150} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Search by part of a name" /></label>
        <button>Search</button>
      </form>}
      {error && <p role="alert">{error}</p>}
      {!courses && !error && <p role="status">Loading courses...</p>}
      {courses?.length === 0 && <p>No courses found.</p>}
      {courses?.length > 0 && <div className="table-wrap"><table>
        <thead><tr><th>Course</th><th>Teacher</th><th>Duration</th><th>Price</th><th>Enrollment</th><th>Status</th><th>Details</th></tr></thead>
        <tbody>{courses.map((course) => <tr key={course._id}>
          <td>{course.name}</td><td>{course.teacherName}</td><td>{course.duration} days</td><td>{course.price.toFixed(2)}</td>
          <td>{course.enrolledCount} / {course.maxStudent}{course.isEnrolled && " (Enrolled)"}</td><td>{course.status}</td>
          <td><Link to={`/courses/${course._id}`}>View course</Link></td>
        </tr>)}</tbody>
      </table></div>}
    </section>
  );
}
