# Tazémi Agritech

Preserving Nigeria's harvest with intelligent agritech infrastructure.

Tazémi is a modern agritech platform built to reduce post-harvest loss through smarter storage, operational visibility, and data-driven decision-making. The product combines a polished public website, a protected executive dashboard, and backend services that can run on demo data today and scale into live field operations tomorrow.

## Why Tazémi Exists

Across many markets, farmers and operators lose value after harvest because storage and logistics systems are unreliable, fragmented, or hard to monitor. Tazémi is designed to help close that gap with:

- better visibility into inventory and field operations
- IoT-aware monitoring workflows
- structured reporting and analytics
- a professional digital presence for partners, investors, and operators

## What’s Included

### Public Website
A responsive marketing site with pages for:
- Home
- About
- Product
- Team
- Impact
- Investors
- Contact
- Authentication

### Operational Dashboard
A protected internal workspace for:
- CEO dashboard insights
- IoT monitoring
- coating operations
- aggregator directory management
- bio-shield R&D views
- truck data analysis

### Backend Platform
A FastAPI backend that provides:
- API routing under `/api/v1`
- a health endpoint
- service-layer structure for core domain objects
- support for Firebase-backed or demo-data workflows

## Technology Stack

### Frontend
- React 19
- Vite
- React Router
- Tailwind CSS
- Recharts
- Lucide React
- EmailJS

### Backend
- FastAPI
- Firebase integration
- CORS support for local and deployed environments
- Uvicorn/Gunicorn-compatible hosting

## Project Structure

- `src/pages/public/` — public-facing pages
- `src/pages/dashboard/` — internal dashboard pages
- `src/components/` — shared UI components and layouts
- `src/context/` — app state and authentication context
- `src/services/` — frontend API/auth services
- `src/data/` — demo datasets
- `backend/` — FastAPI app, routes, services, and storage layer
- `public/` — static assets and fallback pages

## Getting Started

### Prerequisites
- Node.js 18+
- npm
- Python 3.10+

### Run the Frontend
```bash
npm install
npm run dev
```

### Run the Backend
From the `backend/` directory:
```bash
pip install -r ../requirements.txt
uvicorn backend.main:app --reload
```

## Development Scripts

- `npm run dev` — start the frontend dev server
- `npm run build` — create a production build
- `npm run preview` — preview the production build
- `npm run lint` — run ESLint checks
- `npm run deploy` — build and publish to GitHub Pages

## Deployment

### Vercel
1. Push the repository to GitHub
2. Import it into Vercel
3. Set build command to `npm run build`
4. Set output directory to `dist`
5. Deploy

### Netlify
1. Push the repository to GitHub
2. Import it into Netlify
3. Set build command to `npm run build`
4. Set publish directory to `dist`
5. Deploy

### GitHub Pages
Use the included deploy script:
```bash
npm run deploy
```

## Demo Data vs Live Data

The platform currently supports demo-mode workflows for rapid iteration. As the product grows, the demo datasets can be replaced with live Firebase/API integrations for real field pilots and operational reporting.

## Security and Readiness Notes

- Protected dashboard routes require authentication.
- Core write support exists for trucks, sensors, batches, aggregators, trials, notes, and alerts.
- Production deployments should include stronger validation, audit logging, HTTPS, and secure secret management.

## Brand Colors

Tailwind tokens used across the interface:
- `teal` — `#1D9E75` (Harvest Teal)
- `deep` — `#085041` (Deep Earth)
- `mist` — `#E1F5EE` (Fresh Mist)
- `tomato` — `#D85A30` (Tomato accent)

## Vision

Tazémi is building the digital backbone for smarter post-harvest agriculture in Nigeria and beyond — helping operators preserve more value, make faster decisions, and create a more resilient food system.

---

Built for Tazémi Agritech.
