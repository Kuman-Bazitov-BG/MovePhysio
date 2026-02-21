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
