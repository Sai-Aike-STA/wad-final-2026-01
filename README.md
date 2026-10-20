# Online Course Service

A course management application built with a Next.js API, React and Vite,
and MongoDB. Teachers manage their own courses and view enrolled students.
Students browse courses, filter by course or teacher name, and enroll in
available courses.

- Live application: https://wad-final-2026-01-ebon.vercel.app/#/login
- API base URL: https://wad-final-2026-01-ebon.vercel.app/api

## Student Information

- **Student Name:** Sai Aike Shwe Tun Aung
- **Student ID:** 6712122

## Test Credentials

All demo accounts use the password **`Course2026!`**. Login uses the email
address. The login page also lists these accounts under **Demo accounts**,
with a **Fill login** button for each account.

| Role | Username | Email | Seeded data |
| --- | --- | --- | --- |
| Teacher 1 | John Smith | johnsmith.teacher1@example.com | Web courses with Open, Close, and Cancel statuses |
| Teacher 2 | Emma Wilson | emmawilson.teacher2@example.com | Backend courses, including a full course |
| Teacher 3 | Michael Lee | michaellee.teacher3@example.com | No courses |
| Student 1 | Alice Johnson | alicejohnson.student1@example.com | Enrolled in HTML Fundamentals, CSS Layout, and Next.js APIs |
| Student 2 | Daniel Brown | danielbrown.student2@example.com | Enrolled in HTML Fundamentals and MongoDB Basics |
| Student 3 | Sophia Davis | sophiadavis.student3@example.com | No enrollments |

## Prerequisites

- Node.js 22.12 or newer and npm.
- A MongoDB database with read/write access and network access for the backend.

## How to Run & Test

### 1. Backend Setup (`next-backend/`)

From the repository root:

```sh
cd next-backend
npm ci
cp .env.example .env
```

Set `MONGODB_URI` and `JWT_SECRET` in `.env`. The default database name is
`csx4107_final_2026`; `DB_NAME` can override it. The example file includes the
local frontend origin, `http://localhost:5173`. Environment files containing
credentials are excluded from Git.

```sh
npm run seed
npm run dev
```

The API runs at `http://localhost:3000`. Seeding creates the six demo accounts,
five sample courses, and enrollments for Alice and Daniel. Later seed runs
preserve changes to existing sample courses and enrollments. Deleted sample
courses are recreated with their seeded data.

| Course | Teacher | Status | Seeded enrollment |
| --- | --- | --- | --- |
| HTML Fundamentals | John Smith | Open | 2 / 3 |
| CSS Layout | John Smith | Close | 1 / 10 |
| JavaScript Workshop | John Smith | Cancel | 0 / 10 |
| MongoDB Basics | Emma Wilson | Open | 1 / 1 |
| Next.js APIs | Emma Wilson | Open | 1 / 4 |

### 2. Frontend Setup (`react-frontend/`)

In a second terminal, from the repository root:

```sh
cd react-frontend
npm ci
npm run dev -- --port 5173 --strictPort
```

Open `http://localhost:5173`. Vite proxies `/api` requests to the backend on
port 3000. No frontend environment changes are needed for this setup.
`VITE_API_URL` optionally specifies a separate backend origin without `/api`.

### 3. Testing Walkthrough

The following describes the expected behavior using the seeded demo accounts.
Changes made during testing remain in the database.

1. **Authentication:** Entering an incorrect password displays an error and
   does not open a protected page. Signing in shows the account's name and
   role, and refreshing preserves the session. Signing out returns to login.
   Protected API requests without a valid session return `401`.

2. **Roles and ownership:** John and Emma each see only their own courses.
   Michael starts with an empty course list. Accessing another teacher's
   course returns `404`. Student requests to create, update, or delete courses
   return `403`, as do teacher requests to enroll.

3. **Teacher course management:** Creating a course saves its name, duration,
   multiple topics, price, Max Student, and status. Editing its fields saves
   the changes. Deleting a course with no enrollments removes it from the list
   and makes its detail URL unavailable. HTML Fundamentals shows Alice and
   Daniel in its enrolled student list; attempting to delete it returns `409`.

4. **Enrollment rules:** Enrolling Sophia in an Open course with space adds
   it to her enrollments and adds her to the teacher's student list. Duplicate,
   full-course, and closed-course enrollment requests return `409`. Concurrent
   requests cannot overbook a course or enroll the same student twice.
   Reducing capacity below the enrollment count is also rejected.

5. **Student course functions:** Alice's enrollment list contains HTML
   Fundamentals, CSS Layout, and Next.js APIs; Sophia's starts empty.
   Searching `html` or `emma` matches part of a course or teacher name,
   regardless of case. Open courses allow enrollment when space remains;
   Close courses stay visible without accepting enrollments. Cancel courses
   are hidden, and direct student access returns `404`.

6. **Frontend behavior:** Selecting Fill login enters the chosen demo
   credentials without submitting the form. Lists show loading and empty
   states, and failed requests display errors. Missing course fields, invalid
   duration or capacity, and negative prices are rejected. Enrollment and
   deletion controls reflect the same restrictions enforced by the API.

7. **Deployed application:** The public application supports login, course
   management, and enrollment without a Vercel account. Saved changes remain
   available after refreshing or signing in again.

8. **Code and checks:** The original backend and frontend directories are
   retained. Credentials, setup, and deployed URLs are documented here.
   Passwords are hashed and environment secrets are excluded from Git.
   Lint, build, and API verification commands are listed under **Checks**.

## API

Authentication uses a JWT in an HTTP-only cookie. Course access, roles,
ownership, status, capacity, and duplicate enrollment are checked by the API.
Enrollment uses a conditional MongoDB update to prevent overbooking when
requests arrive together. Passwords are stored as bcrypt hashes.

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/auth/login` | Sign in with email and password |
| POST | `/api/auth/logout` | Clear the session cookie |
| GET | `/api/me` | Current session user |
| GET | `/api/user`, `/api/user/:id` | Own user profile |
| GET | `/api/course` | Courses available to the current user |
| GET | `/api/course?search=html` | Filter by course or teacher name |
| GET | `/api/course?enrolled=true` | Student's enrolled courses |
| POST | `/api/course` | Create a course as a teacher |
| GET | `/api/course/:id` | Course details |
| PUT | `/api/course/:id` | Update an owned course |
| DELETE | `/api/course/:id` | Delete an owned course without enrollments |
| POST | `/api/course/:id/enroll` | Enroll as a student |

## Checks

Both applications provide `npm run lint` and `npm run build`.

After building the backend, `npm run check:api` runs functional checks against
its configured database using a temporary local server. It covers
permissions, course management, filtering, enrollment rules, and concurrent
requests. Temporary courses are removed afterward. The checks expect the
initial demo account state described above.

## Deployment

The application was deployed as one Vercel Services project with the repository
root as its root directory. The root `vercel.json` defines the Next.js backend
and Vite frontend, routing `/api/*` to the backend and other requests to the
frontend. Both applications share one domain.

`MONGODB_URI`, `DB_NAME`, and `JWT_SECRET` were configured in Vercel. MongoDB
Atlas network access was configured to allow the deployed backend to connect.
The frontend uses relative `/api` URLs, and session cookies use `SameSite=lax`.
