# Tazémi Agritech — Website & Dashboard

## Deploy on Vercel
1. Push this repo to GitHub
2. Go to vercel.com → New Project → Import your repo
3. Build command: `npm run build`
4. Output directory: `dist`
5. Click Deploy

## Deploy on Netlify
1. Push this repo to GitHub
2. Go to netlify.com → Add new site → Import from Git
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Click Deploy

## Local development
```bash
npm install
npm run dev
```

## Project structure
- `src/pages/public/` — public-facing pages
- `src/pages/dashboard/` — operational dashboard pages
- `src/components/index.jsx` — reusable components
- `src/data/index.js` — demo data (replace with API calls in Phase 2)

## Switching to live data (Phase 2)
Edit `src/data/index.js` to fetch from your Firebase/API endpoints instead of returning static arrays.

## Brand colours (Tailwind tokens)
- `teal` — #1D9E75 (Harvest Teal)
- `deep` — #085041 (Deep Earth)
- `mist` — #E1F5EE (Fresh Mist)
- `tomato` — #D85A30 (Tomato accent)
