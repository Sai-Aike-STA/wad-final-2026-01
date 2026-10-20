# Online Course Service

Final examination application with a Next.js API, React frontend, and MongoDB.
The supplied `next-backend/` and `react-frontend/` structure is retained.

## Student Information

- **Student Name:** Sai Aike Shwe Tun Aung
- **Student ID:** 6712122
- **Deployed frontend:** tbd
- **Deployed backend:** tbd

## Test Credentials

Run the seed command below to create these accounts. Each account has the
password **`Course2026!`**. Passwords are stored as bcrypt hashes in MongoDB.

| Role | Username | Email | Initial state |
| --- | --- | --- | --- |
| Teacher 1 | John Smith | johnsmith.teacher1@example.com | Web courses with enrolled Students and all three statuses |
| Teacher 2 | Emma Wilson | emmawilson.teacher2@example.com | Backend courses, including a full course |
| Teacher 3 | Michael Lee | michaellee.teacher3@example.com | New Teacher with no courses |
| Student 1 | Alice Johnson | alicejohnson.student1@example.com | Enrolled in HTML Fundamentals, CSS Layout, and Next.js APIs |
| Student 2 | Daniel Brown | danielbrown.student2@example.com | Enrolled in HTML Fundamentals and MongoDB Basics |
| Student 3 | Sophia Davis | sophiadavis.student3@example.com | New Student with no enrollments |

Sign in with an email address and password. Registration and role editing are
not required by the examination and are not exposed through the application.
The login page has a collapsed Demo accounts section with these credentials,
a short description of each account, and a Fill login button.

## Prerequisites

- Node.js 22.12 or newer and npm.
- A MongoDB connection with read/write access. For Atlas, allow the machine
  running the backend to connect in the cluster's network settings.
- Two terminals for the backend and frontend.

## How to Run & Test

### 1. Backend Setup (`next-backend/`)

From the repository root:

```sh
cd next-backend
npm ci
cp .env.example .env
```

Edit `.env` locally. Set `MONGODB_URI` to the connection string and
`JWT_SECRET` to a long random secret. Keep `DB_NAME=csx4107_final_2026` to use
a database separate from earlier assignments. Keep
`FRONTEND_URL=http://localhost:5173` and `COOKIE_SAME_SITE=lax` for local use.
The application also defaults to `csx4107_final_2026` if `DB_NAME` is absent.
Do not commit `.env`.

Then run:

```sh
npm run seed
npm run dev
```

The API runs at `http://localhost:3000`. The seed command creates six named
accounts, five sample courses, and existing enrollments for Alice and Daniel.
Michael and Sophia start with no courses or enrollments. The displayed account
descriptions refer to this initial state; grading actions change that state.

The first updated seed migrates the original generic accounts while retaining
their IDs and passwords. Courses from the old third Teacher move to Emma, and
the old third Student's enrollments are cleared to provide the blank accounts.
Other course records are retained. Later seed runs preserve existing courses
and enrollment changes; they do not reset grading progress. Deleted sample
courses are recreated with their initial enrollments when seeded again.

| Sample course | Owner | Status | Initial enrollment | Enrolled Students |
| --- | --- | --- | --- | --- |
| HTML Fundamentals | John Smith | Open | 2 / 3 | Alice, Daniel |
| CSS Layout | John Smith | Close | 1 / 10 | Alice |
| JavaScript Workshop | John Smith | Cancel | 0 / 10 | None |
| MongoDB Basics | Emma Wilson | Open | 1 / 1 | Daniel |
| Next.js APIs | Emma Wilson | Open | 1 / 4 | Alice |

### 2. Frontend Setup (`react-frontend/`)

In a second terminal, from the repository root:

```sh
cd react-frontend
npm ci
npm run dev -- --port 5173 --strictPort
```

Open `http://localhost:5173`. Vite forwards `/api` requests to port 3000, so
no frontend environment file is needed for local development. If using
`VITE_API_URL`, it must contain only the backend origin without `/api`.
Restart Vite after changing frontend environment variables.

### 3. Testing Walkthrough

Use separate browser profiles or a private window for simultaneous users.
Tabs in the same browser profile share the login cookie.

1. **Authentication (3 points):** Sign in with invalid credentials and confirm
   an error. Sign in as `johnsmith.teacher1@example.com`, refresh, and confirm the session
   is retained. Sign out and confirm protected pages require login. Calling
   `GET /api/course` without the login cookie must return `401`.
2. **Roles and ownership (4 points):** Teacher 1 sees only their own courses.
   Copy one course's detail URL, sign in as Teacher 2, and open it. The API must
   return `404`. Repeat a `PUT` or `DELETE` using that ID as Teacher 2 and confirm
   rejection. A Student's `POST /api/course`, `PUT /api/course/:id`, or
   `DELETE /api/course/:id` must return `403`. A Teacher's enrollment request
   must also return `403`. These rules apply to direct API requests.
3. **Teacher course management (5 points):** As Teacher 1, create a course with
   multiple topics, view its details, and edit every field. Delete the course
   while it has no enrollments. Create another course, enroll a Student, then
   confirm its details show the Student's username and email. Deletion must
   fail with `409`, even through a direct API request. Capacity cannot be
   reduced below the existing enrollment count.
4. **Enrollment rules (7 points):** Alice and Daniel already have enrollments.
   As Alice, confirm HTML Fundamentals, CSS Layout, and Next.js APIs appear in
   My enrollments, then repeat enrollment in HTML and expect `409`. As Sophia,
   confirm My enrollments is initially empty, then enroll in HTML's final seat
   and repeat that request to check duplicate prevention. As Alice, attempt to
   enroll in the full MongoDB Basics course and expect `409`. CSS Layout must
   reject new enrollments, and the Cancel course is hidden from Students,
   including direct detail and enrollment requests. For a concurrency check,
   create a course with one seat and send enrollment requests from two Students
   together. Exactly one should succeed.
5. **Student course functions (4 points):** Students see all Open and Close
   courses across Teachers. Search `html` to match part of a course name and
   `emma` to match part of Emma Wilson's name. Search is case-insensitive and
   treats punctuation literally. View course details and My enrollments.
   Cancel courses are hidden from both Student lists and Student detail access.
6. **Frontend integration and usability (3 points):** Check loading messages,
   empty lists, validation errors, enrollment feedback, and sign-out behavior.
   Buttons reflect the course status, capacity, and current enrollment. The
   backend independently enforces each condition.
7. **Deployment (2 points):** After deploying, repeat login, refresh, course
   creation, and enrollment through the production frontend. See deployment
   settings below.
8. **Code quality and submission (2 points):** Run lint and builds in both
   directories, fill in the student ID and deployed URLs, and include this
   README with the source submission.

For local API testing, save a login cookie in a temporary cookie jar:

```sh
curl -i http://localhost:3000/api/course
curl -i -c /tmp/course-teacher.cookies http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"johnsmith.teacher1@example.com","password":"Course2026!"}'
curl -b /tmp/course-teacher.cookies http://localhost:3000/api/course
```

Use a separate cookie jar for each user. Append `-b /tmp/course-teacher.cookies`
to protected requests. Login cookies are HTTP-only and are not stored in
localStorage. Delete cookie jars after testing.

## API Reference

All course, profile, and session-detail endpoints require authentication.
Preflight `OPTIONS` requests do not require authentication.

| Method | Endpoint | Behavior |
| --- | --- | --- |
| POST | `/api/auth/login` | Sign in using `{ "email", "password" }` |
| POST | `/api/auth/logout` | Clear the login cookie |
| GET | `/api/me` | Current user without the password |
| GET | `/api/user` | Current user profile |
| GET | `/api/user/:id` | Own profile only |
| GET | `/api/course` | Teacher's own courses or Student's non-Cancel courses |
| GET | `/api/course?search=html` | Student search by course or Teacher name |
| GET | `/api/course?enrolled=true` | Student's enrolled, non-Cancel courses |
| POST | `/api/course` | Teacher creates a course |
| GET | `/api/course/:id` | Authorized course details; owner also gets enrolled Students |
| PUT | `/api/course/:id` | Owner updates course fields |
| DELETE | `/api/course/:id` | Owner deletes a course with zero enrollments |
| POST | `/api/course/:id/enroll` | Student enrolls in an Open course with a free seat |

Example course request body for creation and update:

```json
{
  "name": "React Basics",
  "duration": 5,
  "topics": ["Components", "State"],
  "price": 500,
  "maxStudent": 10,
  "status": "Open"
}
```

The server sets course ownership from the authenticated user. Request fields
cannot change the owner, role, or enrolled Students. Enrollment is stored as
Student IDs on the course document. A single conditional MongoDB write checks
Open status, remaining capacity, and duplicate enrollment. Capacity changes
and deletion also use conditions on that document to handle concurrent requests.
Each protected handler verifies the cookie and loads the user's current role
from MongoDB. Student responses do not expose other Students' profiles.

## Checks

Run in each application directory:

```sh
npm run lint
npm run build
```

For a local production run of the backend, use `npm start` after building.
To verify the API rules against the configured finals database, run
`npm run check:api` in `next-backend/` after building and before changing the
initial demo state. It starts its own local
production server, uses temporary courses for mutation and concurrency checks,
and removes those courses afterward. It checks authentication, both roles,
ownership, course validation and CRUD, filtering, enrollment constraints,
student privacy, status changes, cookies, and the blank demo accounts.
If Turbopack cannot start a worker in a restricted environment, the backend
also supports `npm run build -- --webpack`.
Vite's development API proxy is not part of the frontend production build;
configure production routing as described below.

## Vercel Deployment Settings

Pushing and deployment are handled by the student. Deploy one Vercel project
using **Root Directory `./`** and **Application Preset Services**. The root
`vercel.json` builds both apps and routes `/api/*` to `next-backend` and all
other requests to `react-frontend`, preserving the existing API paths.
Push this configuration before refreshing the Vercel import screen.

Add these project environment variables for Production and Preview:

| Variable | Value |
| --- | --- |
| `MONGODB_URI` | Copy the value from `next-backend/.env` |
| `DB_NAME` | `csx4107_final_2026` |
| `JWT_SECRET` | Copy the value from `next-backend/.env` |
| `COOKIE_SAME_SITE` | `lax` |

The Import .env button can import `next-backend/.env`. Remove the imported
`FRONTEND_URL=http://localhost:5173` entry for deployment. Frontend and API use
the same origin, which the backend already accepts. If setting `FRONTEND_URL`
explicitly later, use the actual public production origin with `https://` and
no trailing slash. Leave `VITE_API_URL` unset so the frontend calls `/api` on
its own domain. Vercel sets `NODE_ENV` automatically.

Allow the deployed backend to connect in Atlas network settings. The named
accounts and enrollments already seeded locally are available in production
when the connection and database name match. Deployment does not run the seed
command or reset data.

After deployment, open the public production URL and verify login, refresh,
course creation, and enrollment. Use that URL for grading and confirm Vercel
Deployment Protection allows the grader to access it.

Reference: [Vercel Services guide](https://vercel.com/kb/guide/vercel-services).
