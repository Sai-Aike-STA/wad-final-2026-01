import { getDb } from "./mongodb";
import { HttpError } from "./utils";

export function courseInput(data) {
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const { duration, price, maxStudent, status } = data;
  if (!name || name.length > 150) throw new HttpError(400, "Course name must contain 1 to 150 characters.");
  if (!Number.isSafeInteger(duration) || duration < 1) throw new HttpError(400, "Duration must be a positive whole number of days.");
  if (typeof price !== "number" || !Number.isFinite(price) || price < 0) throw new HttpError(400, "Price must be a nonnegative number.");
  if (!Number.isSafeInteger(maxStudent) || maxStudent < 1) throw new HttpError(400, "Max Student must be a positive whole number.");
  if (!["Open", "Close", "Cancel"].includes(status)) throw new HttpError(400, "Status must be Open, Close, or Cancel.");
  if (!Array.isArray(data.topics) || data.topics.length < 1 || data.topics.length > 100 ||
      data.topics.some((topic) => typeof topic !== "string" || !topic.trim() || topic.trim().length > 200)) {
    throw new HttpError(400, "Provide 1 to 100 nonempty topics, each at most 200 characters.");
  }
  return { name, duration, price, maxStudent, status, topics: data.topics.map((topic) => topic.trim()) };
}

export function publicCourse(course, user) {
  return {
    _id: course._id.toString(), name: course.name, duration: course.duration,
    topics: course.topics, price: course.price, maxStudent: course.maxStudent,
    status: course.status, teacherId: course.teacherId.toString(), teacherName: course.teacherName,
    enrolledCount: course.studentIds.length,
    isEnrolled: course.studentIds.some((id) => id.equals(user._id)),
  };
}

export async function accessibleCourse(id, user) {
  const db = await getDb();
  const filter = { _id: id };
  if (user.role === "Teacher") filter.teacherId = user._id;
  else filter.status = { $ne: "Cancel" };
  const course = await db.collection("course").findOne(filter);
  if (!course) throw new HttpError(404, "Course not found or unavailable.");
  return course;
}
