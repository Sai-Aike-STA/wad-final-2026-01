import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import nextEnv from "@next/env";
import { MongoClient, ObjectId } from "mongodb";
import jwt from "jsonwebtoken";

nextEnv.loadEnvConfig(process.cwd(), true);

const accounts = {
  teacher1: { email: "johnsmith.teacher1@example.com", username: "John Smith", role: "Teacher" },
  teacher2: { email: "emmawilson.teacher2@example.com", username: "Emma Wilson", role: "Teacher" },
  teacher3: { email: "michaellee.teacher3@example.com", username: "Michael Lee", role: "Teacher" },
  student1: { email: "alicejohnson.student1@example.com", username: "Alice Johnson", role: "Student" },
  student2: { email: "danielbrown.student2@example.com", username: "Daniel Brown", role: "Student" },
  student3: { email: "sophiadavis.student3@example.com", username: "Sophia Davis", role: "Student" },
};
const courseBody = { name: "API verification course", duration: 5, topics: ["Forms", "State"], price: 500, maxStudent: 3, status: "Open" };
const temporaryIds = [];
let server;
let client;
let base;
let passed = 0;

async function check(name, run) {
  await run();
  passed++;
  console.log(`PASS ${name}`);
}

async function request(path, { account, method = "GET", data, headers = {} } = {}) {
  const response = await fetch(`${base}/api${path}`, {
    method,
    headers: {
      ...(account ? { Cookie: accounts[account].cookie } : {}),
      ...(data !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    ...(data !== undefined ? { body: typeof data === "string" ? data : JSON.stringify(data) } : {}),
  });
  const output = await response.json().catch(() => ({}));
  return { response, output, status: response.status };
}

async function createCourse(data = {}, account = "teacher1") {
  const result = await request("/course", { account, method: "POST", data: { ...courseBody, ...data } });
  if (result.output.course?._id) temporaryIds.push(new ObjectId(result.output.course._id));
  assert.equal(result.status, 201, "Teacher course creation must succeed.");
  return result.output.course;
}

try {
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) throw new Error("Missing environment settings.");
  client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  await client.connect();
  const db = client.db(process.env.DB_NAME || "csx4107_final_2026");
  await db.command({ ping: 1 });

  const socket = createServer();
  socket.listen(0, "127.0.0.1");
  await once(socket, "listening");
  const port = socket.address().port;
  await new Promise((resolveClose) => socket.close(resolveClose));
  base = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, [resolve("node_modules/next/dist/bin/next"), "start", "--port", String(port), "--hostname", "127.0.0.1"], {
    env: { ...process.env, NODE_ENV: "production" }, stdio: "ignore",
  });
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    try { ready = (await fetch(base)).ok; } catch { /* The server may still be starting. */ }
    if (ready) break;
    if (server.exitCode !== null) throw new Error("Production server exited.");
    await delay(250);
  }
  assert.ok(ready, "Build the backend before running the API checks.");

  await check("Unauthenticated course and profile operations return 401", async () => {
    for (const path of ["/course", "/me", "/user", "/course/000000000000000000000000"]) {
      assert.equal((await request(path)).status, 401);
    }
    assert.equal((await request("/course", { method: "POST", data: courseBody })).status, 401);
    assert.equal((await request("/course", { headers: { "x-user-id": "000000000000000000000000" } })).status, 401);
  });
  await check("Allowed preflight works without login and disallowed origins are rejected", async () => {
    const origin = process.env.FRONTEND_URL || "http://localhost:5173";
    const result = await request("/course", { method: "OPTIONS", headers: { Origin: origin, "Access-Control-Request-Method": "POST" } });
    assert.equal(result.status, 204);
    assert.equal(result.response.headers.get("access-control-allow-origin"), origin);
    assert.equal((await request("/auth/login", { method: "POST", data: {}, headers: { Origin: "https://untrusted.example" } })).status, 403);
  });
  await check("Invalid credentials, malformed JSON, and missing login fields are rejected", async () => {
    assert.equal((await request("/auth/login", { method: "POST", data: { email: accounts.teacher1.email, password: "wrong" } })).status, 401);
    assert.equal((await request("/auth/login", { method: "POST", data: {} })).status, 400);
    assert.equal((await request("/auth/login", { method: "POST", data: "{" })).status, 400);
    assert.equal((await request("/auth/login", { method: "POST", data: { email: {}, password: "Course2026!" } })).status, 400);
    assert.equal((await request("/auth/login", { method: "POST", data: "{}", headers: { "Content-Type": "text/plain" } })).status, 415);
  });
  for (const [key, account] of Object.entries(accounts)) {
    await check(`Login and session restoration for ${account.username}`, async () => {
      const result = await request("/auth/login", { method: "POST", data: { email: account.email, password: "Course2026!" } });
      assert.equal(result.status, 200);
      assert.equal(result.output.user.username, account.username);
      assert.equal(result.output.user.role, account.role);
      assert.ok(!("password" in result.output.user));
      const cookie = result.response.headers.get("set-cookie");
      assert.ok(cookie?.includes("HttpOnly"));
      assert.ok(cookie?.includes("Secure"));
      assert.ok(/;\s*samesite=lax(?:;|$)/i.test(cookie));
      account.cookie = cookie.split(";")[0];
      account.id = result.output.user._id;
      const session = await request("/me", { account: key });
      assert.equal(session.status, 200);
      assert.equal(session.output.user._id, account.id);
      assert.equal(session.response.headers.get("cache-control"), "no-store");
    });
  }
  await check("Invalid and expired cookies return 401", async () => {
    assert.equal((await request("/me", { headers: { Cookie: "token=invalid" } })).status, 401);
    const expired = jwt.sign({ id: accounts.student1.id }, process.env.JWT_SECRET, { expiresIn: -1 });
    assert.equal((await request("/me", { headers: { Cookie: `token=${expired}` } })).status, 401);
  });
  await check("Profiles expose no passwords and only the current user is accessible", async () => {
    const own = await request("/user", { account: "student1" });
    assert.equal(own.status, 200);
    assert.ok(!("password" in own.output.user));
    assert.equal((await request(`/user/${accounts.student1.id}`, { account: "student1" })).status, 200);
    assert.equal((await request(`/user/${accounts.student2.id}`, { account: "student1" })).status, 403);
  });

  const john = await request("/course", { account: "teacher1" });
  const emma = await request("/course", { account: "teacher2" });
  const html = john.output.courses.find((course) => course.name === "HTML Fundamentals");
  const closed = john.output.courses.find((course) => course.status === "Close");
  const cancelled = john.output.courses.find((course) => course.status === "Cancel");
  const full = emma.output.courses.find((course) => course.name === "MongoDB Basics");
  await check("Teachers see only their own courses; Teacher 3 starts empty", async () => {
    assert.equal(john.status, 200);
    assert.equal(emma.status, 200);
    assert.ok(john.output.courses.length >= 3 && john.output.courses.every((course) => course.teacherId === accounts.teacher1.id));
    assert.ok(emma.output.courses.length >= 2 && emma.output.courses.every((course) => course.teacherId === accounts.teacher2.id));
    assert.deepEqual((await request("/course", { account: "teacher3" })).output.courses, []);
    assert.ok(html && closed && cancelled && full);
  });
  await check("Teacher details include enrolled Students without passwords", async () => {
    const result = await request(`/course/${html._id}`, { account: "teacher1" });
    assert.equal(result.status, 200);
    assert.ok(result.output.course.students.some((user) => user.username === "Alice Johnson"));
    assert.ok(result.output.course.students.some((user) => user.username === "Daniel Brown"));
    assert.ok(result.output.course.students.every((user) => !("password" in user)));
  });
  await check("Other Teachers cannot read, update, or delete a course", async () => {
    for (const method of ["GET", "PUT", "DELETE"]) {
      const result = await request(`/course/${html._id}`, { account: "teacher2", method, ...(method === "PUT" ? { data: courseBody } : {}) });
      assert.equal(result.status, 404);
    }
  });
  await check("Students cannot create, update, or delete courses; Teachers cannot enroll", async () => {
    assert.equal((await request("/course", { account: "student1", method: "POST", data: courseBody })).status, 403);
    assert.equal((await request(`/course/${html._id}`, { account: "student1", method: "PUT", data: courseBody })).status, 403);
    assert.equal((await request(`/course/${html._id}`, { account: "student1", method: "DELETE" })).status, 403);
    assert.equal((await request(`/course/${html._id}/enroll`, { account: "teacher1", method: "POST" })).status, 403);
  });
  await check("Authorization uses the database role instead of a claimed JWT role", async () => {
    const token = jwt.sign({ id: accounts.student1.id, role: "Teacher" }, process.env.JWT_SECRET, { expiresIn: "1m" });
    assert.equal((await request("/course", { method: "POST", data: courseBody, headers: { Cookie: `token=${token}` } })).status, 403);
  });
  await check("Students see non-Cancel courses and cannot see other Students' identities", async () => {
    const result = await request("/course", { account: "student1" });
    assert.equal(result.status, 200);
    assert.ok(result.output.courses.every((course) => course.status !== "Cancel" && !("studentIds" in course) && !("students" in course)));
    assert.ok(result.output.courses.some((course) => course.status === "Close"));
    const detail = await request(`/course/${html._id}`, { account: "student1" });
    assert.equal(detail.status, 200);
    assert.ok(!("students" in detail.output.course));
  });
  await check("Course and Teacher search are partial, case-insensitive, and literal", async () => {
    const name = await request("/course?search=hTmL", { account: "student3" });
    assert.equal(name.status, 200);
    assert.ok(name.output.courses.length > 0 && name.output.courses.every((course) => /html/i.test(course.name)));
    const teacher = await request("/course?search=eMmA", { account: "student3" });
    assert.equal(teacher.status, 200);
    assert.ok(teacher.output.courses.length > 0 && teacher.output.courses.every((course) => /emma/i.test(course.teacherName)));
    for (const text of ["[", ".*"]) {
      const result = await request(`/course?search=${encodeURIComponent(text)}`, { account: "student3" });
      assert.equal(result.status, 200);
      assert.deepEqual(result.output.courses, []);
    }
  });
  await check("Students 1 and 2 have seeded enrollments; Student 3 starts empty", async () => {
    const alice = await request("/course?enrolled=true", { account: "student1" });
    const daniel = await request("/course?enrolled=true", { account: "student2" });
    assert.ok(["HTML Fundamentals", "CSS Layout", "Next.js APIs"].every((name) => alice.output.courses.some((course) => course.name === name && course.isEnrolled)));
    assert.ok(["HTML Fundamentals", "MongoDB Basics"].every((name) => daniel.output.courses.some((course) => course.name === name && course.isEnrolled)));
    assert.deepEqual((await request("/course?enrolled=true", { account: "student3" })).output.courses, []);
  });
  await check("Closed, cancelled, full, and duplicate enrollments are rejected", async () => {
    assert.equal((await request(`/course/${closed._id}/enroll`, { account: "student3", method: "POST" })).status, 409);
    assert.equal((await request(`/course/${cancelled._id}`, { account: "student3" })).status, 404);
    assert.equal((await request(`/course/${cancelled._id}/enroll`, { account: "student3", method: "POST" })).status, 404);
    assert.equal((await request(`/course/${full._id}/enroll`, { account: "student1", method: "POST" })).status, 409);
    assert.equal((await request(`/course/${html._id}/enroll`, { account: "student1", method: "POST" })).status, 409);
  });
  await check("Invalid course values and invalid identifiers are rejected", async () => {
    for (const invalid of [{ name: " " }, { duration: 0 }, { duration: 1.5 }, { maxStudent: 0 }, { maxStudent: 1.5 }, { price: -1 }, { topics: [] }, { status: "Closed" }]) {
      assert.equal((await request("/course", { account: "teacher1", method: "POST", data: { ...courseBody, ...invalid } })).status, 400);
    }
    assert.equal((await request("/course/not-an-id", { account: "student1" })).status, 400);
  });
  await check("Teacher CRUD works and client fields cannot change ownership or enrollments", async () => {
    const course = await createCourse({ teacherId: accounts.teacher2.id, studentIds: [accounts.student1.id] });
    assert.equal(course.teacherId, accounts.teacher1.id);
    assert.equal(course.enrolledCount, 0);
    const changes = { ...courseBody, name: "Updated verification course", duration: 8, topics: ["Routing", "Cookies", "MongoDB"], price: 750, maxStudent: 8, status: "Close", teacherId: accounts.teacher2.id, studentIds: [accounts.student1.id] };
    const update = await request(`/course/${course._id}`, { account: "teacher1", method: "PUT", data: changes });
    assert.equal(update.status, 200);
    for (const key of ["name", "duration", "price", "maxStudent", "status"]) assert.equal(update.output.course[key], changes[key]);
    assert.deepEqual(update.output.course.topics, changes.topics);
    assert.equal(update.output.course.teacherId, accounts.teacher1.id);
    assert.equal(update.output.course.enrolledCount, 0);
    assert.equal((await request(`/course/${course._id}`, { account: "teacher1", method: "DELETE" })).status, 200);
    assert.equal((await request(`/course/${course._id}`, { account: "teacher1" })).status, 404);
  });
  await check("Concurrent enrollments cannot take the final seat twice", async () => {
    const course = await createCourse({ maxStudent: 1 });
    const results = await Promise.all(["student1", "student2"].map((account) => request(`/course/${course._id}/enroll`, { account, method: "POST" })));
    assert.deepEqual(results.map((result) => result.status).sort(), [201, 409]);
    const winner = results[0].status === 201 ? "student1" : "student2";
    assert.equal((await request(`/course/${course._id}/enroll`, { account: winner, method: "POST" })).status, 409);
    assert.equal((await request(`/course/${course._id}`, { account: "teacher1" })).output.course.enrolledCount, 1);
    assert.equal((await request(`/course/${course._id}`, { account: "teacher1", method: "DELETE" })).status, 409);
  });
  await check("Concurrent duplicate enrollment creates one relationship", async () => {
    const course = await createCourse();
    const results = await Promise.all([1, 2].map(() => request(`/course/${course._id}/enroll`, { account: "student1", method: "POST" })));
    assert.deepEqual(results.map((result) => result.status).sort(), [201, 409]);
    assert.equal((await request(`/course/${course._id}`, { account: "teacher1" })).output.course.enrolledCount, 1);
    const enrollments = await request("/course?enrolled=true", { account: "student1" });
    assert.equal(enrollments.output.courses.filter((entry) => entry._id === course._id).length, 1);
  });
  await check("Capacity cannot fall below enrollment; status changes take effect immediately", async () => {
    const course = await createCourse({ maxStudent: 2 });
    for (const account of ["student1", "student2"]) assert.equal((await request(`/course/${course._id}/enroll`, { account, method: "POST" })).status, 201);
    assert.equal((await request(`/course/${course._id}`, { account: "teacher1", method: "PUT", data: { ...courseBody, maxStudent: 1 } })).status, 409);
    assert.equal((await request(`/course/${course._id}/enroll`, { account: "student3", method: "POST" })).status, 409);
    assert.equal((await request(`/course/${course._id}`, { account: "teacher1", method: "PUT", data: { ...courseBody, status: "Close" } })).status, 200);
    assert.equal((await request(`/course/${course._id}/enroll`, { account: "student3", method: "POST" })).status, 409);
    assert.equal((await request(`/course/${course._id}`, { account: "teacher1", method: "PUT", data: { ...courseBody, status: "Cancel" } })).status, 200);
    assert.equal((await request(`/course/${course._id}`, { account: "student1" })).status, 404);
    assert.equal((await request(`/course/${course._id}/enroll`, { account: "student3", method: "POST" })).status, 404);
    assert.ok((await request("/course?enrolled=true", { account: "student1" })).output.courses.every((entry) => entry._id !== course._id));
  });
  await check("Deletion and enrollment cannot leave a missing enrolled course", async () => {
    const course = await createCourse();
    const [deletion, enrollment] = await Promise.all([
      request(`/course/${course._id}`, { account: "teacher1", method: "DELETE" }),
      request(`/course/${course._id}/enroll`, { account: "student3", method: "POST" }),
    ]);
    assert.ok((deletion.status === 200 && enrollment.status === 404) || (deletion.status === 409 && enrollment.status === 201));
  });
  await check("Logout clears the session cookie", async () => {
    const result = await request("/auth/logout", { account: "student3", method: "POST" });
    assert.equal(result.status, 200);
    assert.ok(result.response.headers.get("set-cookie")?.includes("Max-Age=0"));
    assert.equal((await request("/me")).status, 401);
  });
  console.log(`API verification passed: ${passed} checks. Temporary courses will be removed.`);
} catch (error) {
  console.error(error.code === "ERR_ASSERTION" ? `API verification failed: ${error.message}` : "API verification failed. Check the build, environment, database access, and seeded accounts.");
  process.exitCode = 1;
} finally {
  try {
    if (client && temporaryIds.length) {
      await client.db(process.env.DB_NAME || "csx4107_final_2026").collection("course").deleteMany({ _id: { $in: temporaryIds } });
      console.log("Removed only the temporary courses created by this verification run.");
    }
  } catch {
    console.error("Temporary course cleanup failed. Rerun cleanup for this verification run before grading.");
    process.exitCode = 1;
  }
  if (server && server.exitCode === null) {
    const stopped = once(server, "exit");
    server.kill("SIGTERM");
    await stopped;
  }
  if (client) await client.close();
}
