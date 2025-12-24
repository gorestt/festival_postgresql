# Information & Reference System for Music Festivals (PostgreSQL)


## Stack
- Node.js + Express
- Server-side rendered UI: EJS templates (HTML) + Bootstrap 5 + custom CSS
- PostgreSQL
- Password hashing: bcrypt
- Sessions: express-session
- Charts: Chart.js (CDN)

## Features
- Registration & login (users must be authenticated to access the system)
- Roles: Viewer (Зритель), Organizer (Организатор), Admin (Администратор)
- CRUD: festivals, artists, stages, performances (Organizer/Admin)
- Ratings/Reviews (all authenticated users)
- Search + sorting (server-side)
- Statistics dashboard with Chart.js
- About page
- Error pages (404/500)

## One-click run (Windows)
1. Install **Node.js LTS** and **PostgreSQL** (recommended to have `psql` in PATH).
2. Copy `.env.example` to `.env` (script can do this automatically).
3. Double click: `run_windows.bat`
4. Open: http://localhost:3000

## Demo accounts
- Admin: `admin@demo.local` / `Admin123!`
- Organizer: `org@demo.local` / `Org123!`
- Viewer: `viewer@demo.local` / `Viewer123!`
