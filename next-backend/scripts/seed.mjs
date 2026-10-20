import nextEnv from "@next/env";
import { MongoClient } from "mongodb";
import bcrypt from "bcrypt";

nextEnv.loadEnvConfig(process.cwd(), true);

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Set MONGODB_URI in next-backend/.env before running npm run seed.");
  process.exit(1);
}

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
try {
  await client.connect();
  const db = client.db(process.env.DB_NAME || "csx4107_final_2026");
  await db.collection("user").createIndex({ email: 1 }, { unique: true });
  await db.collection("user").createIndex({ username: 1 }, { unique: true });
  await db.collection("course").createIndex({ teacherId: 1 });
  await db.collection("course").createIndex({ studentIds: 1 });

  const teachers = [];
  for (const role of ["Teacher", "Student"]) {
    for (let number = 1; number <= 3; number++) {
      const username = `${role.toLowerCase()}${number}`;
      const email = `${username}@example.com`;
      await db.collection("user").updateOne({ email }, {
        $setOnInsert: { username, email, role, password: await bcrypt.hash("Course2026!", 12) },
      }, { upsert: true });
      if (role === "Teacher") teachers.push(await db.collection("user").findOne({ email }));
    }
  }

  const examples = [
    { name: "HTML Fundamentals", duration: 5, topics: ["HTML structure", "Forms"], price: 500, maxStudent: 2, status: "Open", teacher: 0 },
    { name: "CSS Layout", duration: 3, topics: ["Flexbox", "Grid"], price: 300, maxStudent: 10, status: "Close", teacher: 0 },
    { name: "JavaScript Workshop", duration: 7, topics: ["Functions", "Arrays"], price: 700, maxStudent: 10, status: "Cancel", teacher: 0 },
    { name: "MongoDB Basics", duration: 4, topics: ["Documents", "Queries"], price: 400, maxStudent: 1, status: "Open", teacher: 1 },
    { name: "Next.js APIs", duration: 6, topics: ["Route handlers", "Authentication"], price: 600, maxStudent: 3, status: "Open", teacher: 2 },
  ];
  for (const { teacher, ...course } of examples) {
    const owner = teachers[teacher];
    await db.collection("course").updateOne({ seedKey: course.name, teacherId: owner._id }, {
      $setOnInsert: { ...course, teacherId: owner._id, teacherName: owner.username, studentIds: [], createdAt: new Date() },
    }, { upsert: true });
  }
  console.log("Seed complete. Three Teachers, three Students, and sample courses are available.");
  console.log("Existing users, passwords, courses, and enrollments were preserved.");
} catch {
  console.error("Seeding failed. Check MongoDB access, the connection settings, and database permissions.");
  process.exitCode = 1;
} finally {
  await client.close();
}
