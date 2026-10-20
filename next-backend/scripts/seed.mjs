import nextEnv from "@next/env";
import { MongoClient } from "mongodb";
import bcrypt from "bcrypt";

nextEnv.loadEnvConfig(process.cwd(), true);

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Set MONGODB_URI in next-backend/.env before running npm run seed.");
  process.exit(1);
}

const demoUsers = [
  { demoKey: "teacher1", username: "John Smith", email: "johnsmith.teacher1@example.com", role: "Teacher" },
  { demoKey: "teacher2", username: "Emma Wilson", email: "emmawilson.teacher2@example.com", role: "Teacher" },
  { demoKey: "teacher3", username: "Michael Lee", email: "michaellee.teacher3@example.com", role: "Teacher" },
  { demoKey: "student1", username: "Alice Johnson", email: "alicejohnson.student1@example.com", role: "Student" },
  { demoKey: "student2", username: "Daniel Brown", email: "danielbrown.student2@example.com", role: "Student" },
  { demoKey: "student3", username: "Sophia Davis", email: "sophiadavis.student3@example.com", role: "Student" },
];

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
try {
  await client.connect();
  const db = client.db(process.env.DB_NAME || "csx4107_final_2026");
  await db.collection("user").createIndex({ email: 1 }, { unique: true });
  await db.collection("user").createIndex({ username: 1 }, { unique: true });
  await db.collection("course").createIndex({ teacherId: 1 });
  await db.collection("course").createIndex({ studentIds: 1 });

  const users = {};
  const legacyAccounts = new Set();
  for (const data of demoUsers) {
    const oldEmail = `${data.demoKey}@example.com`;
    const existing = await db.collection("user").findOne({
      $or: [{ demoKey: data.demoKey }, { email: data.email }, { email: oldEmail }],
    });
    if (existing?.email === oldEmail) legacyAccounts.add(data.demoKey);
    if (existing) {
      // Existing IDs and password hashes keep their relationships during the name migration.
      await db.collection("user").updateOne({ _id: existing._id }, { $set: data });
      users[data.demoKey] = { ...existing, ...data };
    } else {
      const user = { ...data, password: await bcrypt.hash("Course2026!", 12) };
      const result = await db.collection("user").insertOne(user);
      users[data.demoKey] = { ...user, _id: result.insertedId };
    }
  }

  if (legacyAccounts.has("teacher3")) {
    // The old third Teacher's courses are retained under the second Teacher.
    await db.collection("course").updateMany({ teacherId: users.teacher3._id }, {
      $set: { teacherId: users.teacher2._id, teacherName: users.teacher2.username },
    });
  }
  if (legacyAccounts.has("student3")) {
    await db.collection("course").updateMany({ studentIds: users.student3._id }, {
      $pull: { studentIds: users.student3._id },
    });
  }
  for (const key of ["teacher1", "teacher2", "teacher3"]) {
    await db.collection("course").updateMany({ teacherId: users[key]._id }, {
      $set: { teacherName: users[key].username },
    });
  }

  const examples = [
    { name: "HTML Fundamentals", duration: 5, topics: ["HTML structure", "Forms"], price: 500, maxStudent: 3, status: "Open", teacher: "teacher1", students: ["student1", "student2"] },
    { name: "CSS Layout", duration: 3, topics: ["Flexbox", "Grid"], price: 300, maxStudent: 10, status: "Close", teacher: "teacher1", students: ["student1"] },
    { name: "JavaScript Workshop", duration: 7, topics: ["Functions", "Arrays"], price: 700, maxStudent: 10, status: "Cancel", teacher: "teacher1", students: [] },
    { name: "MongoDB Basics", duration: 4, topics: ["Documents", "Queries"], price: 400, maxStudent: 1, status: "Open", teacher: "teacher2", students: ["student2"] },
    { name: "Next.js APIs", duration: 6, topics: ["Route handlers", "Authentication"], price: 600, maxStudent: 4, status: "Open", teacher: "teacher2", students: ["student1"] },
  ];
  for (const { teacher, students, ...data } of examples) {
    const existing = await db.collection("course").findOne({ seedKey: data.name });
    if (existing?.seedVersion === 2) continue;
    const studentIds = existing?.studentIds ? [...existing.studentIds] : [];
    for (const key of students) {
      if (!studentIds.some((id) => id.equals(users[key]._id))) studentIds.push(users[key]._id);
    }
    const course = {
      ...data, seedKey: data.name, seedVersion: 2,
      maxStudent: Math.max(data.maxStudent, studentIds.length),
      teacherId: users[teacher]._id, teacherName: users[teacher].username, studentIds,
    };
    if (existing) await db.collection("course").updateOne({ _id: existing._id }, { $set: course });
    else await db.collection("course").insertOne({ ...course, createdAt: new Date() });
  }
  console.log("Seed complete. Six named demo users and five sample courses are available.");
  console.log("Teachers 1 and 2 own the examples; Students 1 and 2 have existing enrollments.");
  console.log("The third accounts start empty. Later seed runs preserve grading changes and passwords.");
} catch {
  console.error("Seeding failed. Check MongoDB access, the connection settings, and database permissions.");
  process.exitCode = 1;
} finally {
  await client.close();
}
