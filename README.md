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

| Role | Username | Email |
| --- | --- | --- |
| Teacher | teacher1 | teacher1@example.com |
| Teacher | teacher2 | teacher2@example.com |
| Teacher | teacher3 | teacher3@example.com |
| Student | student1 | student1@example.com |
| Student | student2 | student2@example.com |
| Student | student3 | student3@example.com |

Sign in with an email address and password. Registration and role editing are
not required by the examination and are not exposed through the application.

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

The API runs at `http://localhost:3000`. The seed command creates three
Teachers, three Students, and five sample courses. It preserves existing
accounts, passwords, courses, and enrollments when run again. It does not reset
test data. If a test course is deleted, rerunning the seed recreates it.

| Sample course | Owner | Status | Max Student |
| --- | --- | --- | --- |
| HTML Fundamentals | teacher1 | Open | 2 |
| CSS Layout | teacher1 | Close | 10 |
| JavaScript Workshop | teacher1 | Cancel | 10 |
| MongoDB Basics | teacher2 | Open | 1 |
| Next.js APIs | teacher3 | Open | 3 |

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
   an error. Sign in as `teacher1@example.com`, refresh, and confirm the session
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
4. **Enrollment rules (7 points):** As Student 1, enroll in HTML Fundamentals.
   Confirm enrollment appears in My enrollments and remains after refresh.
   Repeat the enrollment request and expect `409`. Enroll Student 2 in the same
   course, then try Student 3 and expect `409` because its capacity is two.
   Confirm CSS Layout rejects enrollment with `409` and the Cancel course is
   unavailable to Students, including direct detail and enrollment requests.
   For a concurrency check, create a course with one seat and submit enrollment
   requests from two different Students together. Exactly one should succeed.
5. **Student course functions (4 points):** Students see all Open and Close
   courses across Teachers. Search `html` to match part of a course name and
   `teacher2` to match a Teacher's username. Search is case-insensitive and
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
  -d '{"email":"teacher1@example.com","password":"Course2026!"}'
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
If Turbopack cannot start a worker in a restricted environment, the backend
also supports `npm run build -- --webpack`.
Vite's development API proxy is not part of the frontend production build;
configure production routing as described below.

## Vercel Deployment Settings

Pushing and deployment are handled by the student. Deploy the same repository
as two Vercel projects with these root directories:

- Backend: `next-backend`, using the Next.js preset.
- Frontend: `react-frontend`, using the Vite preset, build command
  `npm run build`, and output directory `dist`.

Set these backend environment variables in Vercel:

| Variable | Value |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string |
| `DB_NAME` | `csx4107_final_2026` |
| `JWT_SECRET` | A long random secret |
| `FRONTEND_URL` | Exact production frontend origin, including `https://` |
| `COOKIE_SAME_SITE` | `lax` for the recommended same-origin rewrite |

Allow the Vercel backend to connect in Atlas network settings. Seed the same
database locally with `npm run seed` before testing the deployed application.
Both production and local instances share data if they use the same database.

For reliable cookie authentication, leave frontend `VITE_API_URL` unset and
add this `vercel.json` inside `react-frontend/`, replacing the example backend
hostname with the real production backend hostname:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://YOUR-BACKEND.vercel.app/api/:path*"
    }
  ]
}
```

This serves API requests through the frontend's origin, including the login
cookie. HashRouter handles frontend page navigation. Use the public production
backend domain, and make sure Vercel Deployment Protection does not block API
requests. Redeploy the frontend after adding its rewrite configuration.

Alternatively, set frontend `VITE_API_URL` to the backend origin and backend
`COOKIE_SAME_SITE=none`, with `FRONTEND_URL` set to the frontend origin. This
uses secure cross-site cookies in production and depends on the browser
allowing third-party cookies. The same-origin rewrite avoids that dependency.
Frontend environment changes require a new build/deployment.
