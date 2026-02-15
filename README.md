# MovePhysio

Modern website skeleton for a physiotherapy brand with:

- Beautiful Home screen UI
- Animated live digital-art background
- Supabase Auth popup with two tabs: **Register | Login**
- Logout support

## Project Structure

Main app is in `my/`:

- `my/index.html` – bootstrap, icons, fonts, app mount
- `my/src/style.css` – modern UI styling, logo styling, effects
- `my/src/config.js` – Supabase config from environment variables
- `my/src/auth.js` – register / login / logout logic via Supabase Auth
- `my/src/app.js` – app markup, home screen shell, auth modal
- `my/src/main.js` – app bootstrap + animated live background

## Setup

1. Install dependencies:

	```bash
	cd my
	npm install
	```

2. Add environment variables (copy `my/.env.example` to `my/.env`):

	- `VITE_SUPABASE_URL`
	- `VITE_SUPABASE_ANON_KEY`

3. Run development server:

	```bash
	npm run dev
	```

## Notes

- Home screen content area is intentionally kept empty for now.
- The logo is recreated in a premium style inspired by your visit card design.
