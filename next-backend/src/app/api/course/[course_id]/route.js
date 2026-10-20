import { publicUser, requireUser } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { accessibleCourse, courseInput, publicCourse } from "@/lib/course";
import { HttpError, objectId, readJson, successResponse, withApi } from "@/lib/utils";

export const GET = withApi(async (request, context) => {
  const user = await requireUser(request);
  const { course_id } = await context.params;
  const course = await accessibleCourse(objectId(course_id), user);
  const output = publicCourse(course, user);
  if (user.role === "Teacher") {
    const db = await getDb();
    const students = await db.collection("user").find({ _id: { $in: course.studentIds }, role: "Student" },
      { projection: { password: 0 } }).sort({ username: 1 }).toArray();
    output.students = students.map(publicUser);
  }
  return successResponse({ course: output });
});

export const PUT = withApi(async (request, context) => {
  const user = await requireUser(request, "Teacher");
  const { course_id } = await context.params;
  const id = objectId(course_id);
  await accessibleCourse(id, user);
  const data = courseInput(await readJson(request));
  const db = await getDb();
  // The condition also protects capacity when an enrollment happens during an edit.
  const course = await db.collection("course").findOneAndUpdate({
    _id: id, teacherId: user._id, $expr: { $lte: [{ $size: "$studentIds" }, data.maxStudent] },
  }, { $set: { ...data, updatedAt: new Date() } }, { returnDocument: "after" });
  if (!course) throw new HttpError(409, "Course changed or Max Student is below the current enrollment. Reload and try again.");
  return successResponse({ course: publicCourse(course, user) });
});

export const DELETE = withApi(async (request, context) => {
  const user = await requireUser(request, "Teacher");
  const { course_id } = await context.params;
  const id = objectId(course_id);
  await accessibleCourse(id, user);
  const db = await getDb();
  // Deletion and enrollment both modify the same document, so their conditions remain consistent.
  const result = await db.collection("course").deleteOne({ _id: id, teacherId: user._id, studentIds: { $size: 0 } });
  if (!result.deletedCount) throw new HttpError(409, "The course has enrolled Students or was already deleted.");
  return successResponse({ message: "Course deleted." });
});
