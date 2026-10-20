import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { courseInput, publicCourse } from "@/lib/course";
import { HttpError, readJson, successResponse, withApi } from "@/lib/utils";

export const GET = withApi(async (request) => {
  const user = await requireUser(request);
  const db = await getDb();
  const filter = user.role === "Teacher" ? { teacherId: user._id } : { status: { $ne: "Cancel" } };
  if (user.role === "Student") {
    if (request.nextUrl.searchParams.get("enrolled") === "true") filter.studentIds = user._id;
    const search = (request.nextUrl.searchParams.get("search") || "").trim();
    if (search.length > 150) throw new HttpError(400, "Search must be at most 150 characters.");
    if (search) {
      const pattern = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [{ name: { $regex: pattern, $options: "i" } }, { teacherName: { $regex: pattern, $options: "i" } }];
    }
  }
  const courses = await db.collection("course").find(filter).sort({ createdAt: -1, _id: -1 }).toArray();
  return successResponse({ courses: courses.map((course) => publicCourse(course, user)) });
});

export const POST = withApi(async (request) => {
  const user = await requireUser(request, "Teacher");
  const data = courseInput(await readJson(request));
  const course = { ...data, teacherId: user._id, teacherName: user.username, studentIds: [], createdAt: new Date() };
  const db = await getDb();
  const result = await db.collection("course").insertOne(course);
  course._id = result.insertedId;
  return successResponse({ course: publicCourse(course, user) }, 201);
});
