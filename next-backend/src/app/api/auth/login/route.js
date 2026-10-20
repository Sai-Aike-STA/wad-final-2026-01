import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getDb } from "@/lib/mongodb";
import { cookieOptions, publicUser } from "@/lib/auth";
import { HttpError, readJson, successResponse, withApi } from "@/lib/utils";

export const POST = withApi(async (request) => {
  const data = await readJson(request);
  if (typeof data.email !== "string" || !data.email.trim() || data.email.length > 254 ||
      typeof data.password !== "string" || !data.password || Buffer.byteLength(data.password) > 72) {
    throw new HttpError(400, "A valid email and password are required.");
  }
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required.");
  const db = await getDb();
  const user = await db.collection("user").findOne({ email: data.email.trim().toLowerCase() });
  if (!user || !["Teacher", "Student"].includes(user.role) || !await bcrypt.compare(data.password, user.password)) {
    throw new HttpError(401, "Invalid email or password.");
  }
  const token = jwt.sign({ id: user._id.toString(), username: user.username, email: user.email },
    process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "7d" });
  const response = successResponse({ user: publicUser(user) });
  response.cookies.set("token", token, cookieOptions());
  return response;
});
