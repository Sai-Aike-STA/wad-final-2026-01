import jwt from "jsonwebtoken";
import { getDb } from "./mongodb";
import { HttpError, objectId } from "./utils";

export function verifyJWT(request) {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return null;
    const user = jwt.verify(token, secret, { algorithms: ["HS256"] });
    return typeof user.id === "string" && /^[a-f0-9]{24}$/i.test(user.id) ? user : null;
  } catch {
    return null;
  }
}

export function publicUser(user) {
  return { _id: user._id.toString(), username: user.username, email: user.email, role: user.role };
}

export async function requireUser(request, role) {
  const token = verifyJWT(request);
  if (!token) throw new HttpError(401, "Please sign in.");
  const db = await getDb();
  const user = await db.collection("user").findOne({ _id: objectId(token.id) }, { projection: { password: 0 } });
  if (!user) throw new HttpError(401, "Please sign in again.");
  if (!["Teacher", "Student"].includes(user.role) || (role && user.role !== role)) {
    throw new HttpError(403, "This operation is not allowed for your role.");
  }
  return user;
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.COOKIE_SAME_SITE === "none" && process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}
