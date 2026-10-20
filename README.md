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

1. Sign in as John Smith. Open a course to view its fields and enrolled
   students. His list includes Open, Close, and Cancel courses.
2. Sign in as Michael Lee to start with an empty course list. Create a course
   with multiple topics, edit its fields, and delete it before anyone enrolls.
3. Sign in as Alice Johnson. Check **My enrollments**, browse **All courses**,
   and search for `html` or `emma`. Cancel courses are hidden; closed and full
   courses cannot accept new enrollments.
4. Sign in as Sophia Davis to start with no enrollments. Enroll in an Open
   course with space, then check **My enrollments**. A student can enroll in
   each course only once.
5. Sign in as the course owner and check the enrolled student list. A course
   with enrollments cannot be deleted, and its capacity cannot be reduced
   below its enrollment count. Other teachers cannot access or change it.
6. Refresh while signed in to check session persistence, then sign out to
   return to the login page. Protected API requests without a session return
   `401`.

Separate browser profiles or a private window allow simultaneous accounts.
Tabs in the same profile share the session cookie. Changes made during testing
remain in the database.

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
