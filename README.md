# MovePhysio

MovePhysio is a modern physiotherapy website built with vanilla JavaScript + Vite, styled with Bootstrap, and connected to Supabase for authentication and role-based admin access.

## Features

- Animated live background and responsive public pages
- Client-side route rendering for Home, About, Services, Physiotherapy, Pilates, Contact
- Supabase authentication (register, login, logout)
- Role-based admin button visibility
- Dedicated admin panel for user role management
- RLS-ready `user_roles` model with Supabase migration

## Tech Stack

- Frontend: HTML, CSS, JavaScript (ES modules), Bootstrap 5, Bootstrap Icons
- Tooling: Vite, npm
- Backend: Supabase Auth + Postgres (RLS policies)


## Technologies

· Frontend: Implement your app in HTML, CSS, JavaScript and Bootstrap. Use UI libraries and components of your choice. Keep it simple, without TypeScript and UI frameworks like React and Vue.

· Backend: Use Supabase as a backend (database, authentication and storage).

· Build tools: Node.js, npm, Vite

## Architecture

· Use a client-server architecture: JavaScript frontend app with Supabase backend, communicating via the Supabase REST API.

· Use Node.js, npm and Vite to structure your app with modular components.

· Use multi-page navigation (instead of single page with popups) and keep each page in separate file.

· Use modular design: split your app into self-contained components (e.g. UI pages, services, utils) to improve project maintenance. When reasonable, use separate files for the UI, business logic, styles, and other app assets. Avoid big and complex monolith code.

· Define "Agent Instructions" (.github/copilot-instructions.md) to provide app context, architectural guidelines and project-wide instructions for the AI dev agent.

## User Interface (UI)

· Implement minimum 5 app screens (pages / popups / others).

· Example: register, login, main page, view / add / edit / delete entity, admin panel.

· Implement responsive design for desktop and mobile browsers.

· Use icons, effects and visual cues to enhance user experience and make the app more intuitive.

· Place different app screens in separate files (for better maintenance).

## Backend

· Use Supabase as a backend to keep all your app data.

· Use Supabase DB for data tables.

· Use Supabase Auth for authentication (users, register, login, logout).

· Use Supabase Storage to upload photos and files at the server-side.

· Optionally, use Supabase Edge Functions for special server-side interactions.

## Authentication and Authorization

· Use Supabase Auth for authentication and authorization with JWT tokens.

· Implement users (register, login, logout) and roles (normal and admin users).

· Use Row-Level Security (RLS) policies to implement access control.

· If role-based access control (RBAC) is needed, use `user_roles` table + RLS to implement it.

· Implement admin panel (or similar concept for special users, different from regular).

## Database

· Your database should hold minimum 4 DB tables (with relationships when needed).

· Example (blog): users, profiles, articles, photos. Example (social network): users, posts, photos, comments.

· Use best practices to design the Supabase DB schema, including normalization, indexing, and relationships.

· When changing the DB schema, always use Supabase migrations.

· Sync the DB migrations history from Supabase to a local project folder.

· Your DB migration SQL scripts should be committed in the GitHub repo.

## Storage

· Store app user files (like photos and documents) in Supabase Storage.

· Your project should use file upload and download somewhere, e.g. profile pictures or product photos.

## Deployment

· Your project should be deployed live on the Internet (e.g. in Netlify, Vercel or similar platform).

· Provide sample credentials (e.g. demo / demo123) to simplify testing your app.

## GitHub Repo

· Use a GitHub repo to hold your project assets.

· Commit and push each successful change during the development.

Your public GitHub repo is the most important project asset for your capstone project. The commit history in your repo demonstrates that you have worked seriously to develop your app yourself, and you have spent several days working on it. Without a solid history of commits in GitHub you cannot demonstrate that your project is your own work (not taken from someone else).

· Create minimum 15 commits in GitHub.

· Create your commits on at least 3 different days.

· Optionally, you can create branches and merge them with pull requests.

## Documentation

· Generate a project documentation in your GitHub repository.

· Project description: describe briefly your project (what it does, who can do what, etc.).

· Architecture: front-end, back-end, technologies used, database, etc.

· Database schema design: visualize the main DB tables and their relationships.

· Local development setup guide.

· Key folders and files and their purpose.


## Project Structure

- `my/` – frontend app root
  - `index.html` – public app entry
  - `admin.html` – admin page entry
  - `src/main.js` – app bootstrap + animated background + route handling
  - `src/app.js` – page rendering + layout + auth modal markup
  - `src/auth.js` – auth/session logic + admin visibility checks
  - `src/admin.js` – admin access guard + user role management UI
  - `src/config.js` – Supabase env config
- `supabase/migrations/` – SQL migrations
  - `20260215120000_user_roles_rls.sql`

## Getting Started

### 1) Install dependencies

```bash
cd my
npm install
```

### 2) Configure environment

Copy `.env.example` to `.env` inside `my/` and set real values:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
# or use VITE_SUPABASE_PUBLISHABLE_KEY
```

### 3) Run the app

```bash
npm run dev
```

Then open the local Vite URL (usually `http://localhost:5173`).

## Scripts

From `my/`:

- `npm run dev` – start development server
- `npm run build` – create production build
- `npm run preview` – preview production build locally

## Supabase Setup

Apply migration(s) from `supabase/migrations/` to create:

- `public.app_role` enum (`user`, `admin`)
- `public.user_roles` table
- helper SQL functions (`is_admin`, `is_owner_or_admin`)
- RLS policies for admin-controlled role changes

### Bootstrap first admin user

Because role updates are admin-protected, set the first admin manually once via Supabase SQL Editor:

```sql
insert into public.user_roles (user_id, user_role)
select id, 'admin'::public.app_role
from auth.users
where email = 'your-admin@email.com'
on conflict (user_id) do update
set user_role = excluded.user_role,
    updated_at = now();
```

After this, that user can access `admin.html` and manage roles from the UI.

## Deployment

- Build with `npm run build`
- Deploy the `my/dist` output to Netlify, Vercel, or similar
- Ensure all required `VITE_` env variables are set in your hosting provider

## Notes

- If Supabase credentials are missing or placeholders, auth is disabled and the app shows a setup warning in the auth modal.
- Admin panel access is denied automatically for non-admin users.
