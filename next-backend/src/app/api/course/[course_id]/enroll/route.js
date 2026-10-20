import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { accessibleCourse, publicCourse } from "@/lib/course";
import { HttpError, objectId, successResponse, withApi } from "@/lib/utils";

export const POST = withApi(async (request, context) => {
  const user = await requireUser(request, "Student");
  const { course_id } = await context.params;
  const id = objectId(course_id);
  const db = await getDb();
  // One conditional write checks status, duplicate enrollment, and the remaining capacity.
  const course = await db.collection("course").findOneAndUpdate({
    _id: id, status: "Open", studentIds: { $ne: user._id },
    $expr: { $lt: [{ $size: "$studentIds" }, "$maxStudent"] },
  }, { $addToSet: { studentIds: user._id } }, { returnDocument: "after" });
  if (course) return successResponse({ course: publicCourse(course, user) }, 201);

  const current = await accessibleCourse(id, user);
  if (current.studentIds.some((studentId) => studentId.equals(user._id))) {
    throw new HttpError(409, "You are already enrolled in this course.");
  }
  if (current.status !== "Open") throw new HttpError(409, "This course is not open for enrollment.");
  throw new HttpError(409, "This course is full. Reload to see the current availability.");
});
