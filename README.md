# HAKKEN — AI-Powered Resale Intelligence Platform

HAKKEN analyzes secondhand listings for resale arbitrage opportunities. Paste a listing, upload photos, and the 5-layer AI pipeline identifies the product, assesses condition, verifies authenticity, values it against the market, and tells you whether to buy, negotiate, watch, or walk away.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **UI:** Lucide icons, custom glassmorphism design system
- **Backend:** Supabase (PostgreSQL database, auth, storage, edge functions)
- **AI:** OpenAI GPT-4o Vision (with deterministic fallback engine)

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project (create one free at [supabase.com](https://supabase.com))
- An OpenAI API key (optional — the app works without it using the built-in engine)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Apply database migrations

The SQL migration files are in `supabase/migrations/`. Run them in order against your Supabase database using the Supabase SQL Editor (Dashboard > SQL Editor) or the Supabase MCP tools:

1. `supabase/migrations/20260802135947_hakken_phase1_schema.sql` — Creates tables, RLS policies, and triggers
2. `supabase/migrations/20260802141355_listing_images_storage.sql` — Creates the image storage bucket and policies

### 4. Deploy the edge function

The AI analysis runs as a Supabase Edge Function. Deploy it from the Supabase dashboard or CLI:

```bash
# Using Supabase CLI
supabase functions deploy analyze-listing
```

Or use the Supabase dashboard: Edge Functions > Deploy from the `supabase/functions/analyze-listing/` directory.

### 5. Set the OpenAI API key (optional but recommended)

In your Supabase dashboard, go to **Settings > Edge Functions > Secrets** and add:

```
OPENAI_API_KEY=sk-your-openai-key-here
```

When this key is present, the analysis uses GPT-4o Vision to examine your uploaded photos. When it's absent, the app falls back to a deterministic pattern-matching engine so everything still works.

### 6. Run the dev server

```bash
npm run dev
```

### 7. Build for production

```bash
npm run build
```

## Project Structure

```
├── src/
│   ├── components/
│   │   └── Nav.tsx              # Sidebar navigation + deal alerts
│   ├── context/
│   │   └── AuthContext.tsx       # Supabase auth provider
│   ├── lib/
│   │   ├── supabase.ts          # Supabase client singleton
│   │   ├── types.ts             # TypeScript types for all DB tables
│   │   └── utils.ts             # Formatting + color helpers
│   ├── pages/
│   │   ├── AuthPage.tsx         # Sign in / sign up
│   │   ├── Dashboard.tsx       # Overview + recent analyses + alerts
│   │   ├── Analyze.tsx         # Listing input + image upload + pipeline
│   │   ├── AnalysisReport.tsx   # Full 5-layer report view
│   │   ├── Portfolio.tsx       # Inventory tracking + profit/loss
│   │   └── Settings.tsx        # Trading preferences + risk profile
│   ├── App.tsx                  # Root component + routing
│   ├── main.tsx                 # React entry point
│   └── index.css                # Global styles + Tailwind
├── supabase/
│   ├── migrations/
│   │   ├── 20260802135947_hakken_phase1_schema.sql
│   │   └── 20260802141355_listing_images_storage.sql
│   └── functions/
│       └── analyze-listing/
│           └── index.ts         # 5-layer AI analysis edge function
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── eslint.config.js
└── index.html
```

## The 5-Layer Analysis Pipeline

| Layer | Name | What it does |
|-------|------|-------------|
| 1 | Product Identification | Identifies brand, model, year, color, variant, and accessories from listing text and photos |
| 2 | Condition Assessment | Multi-point condition scoring (crystal, bezel, dial, movement, etc.), issue detection, risk score |
| 3 | Authenticity Verification | Positive/negative signal detection, counterfeit risk flags, confidence scoring |
| 4 | Market Valuation | Fair market value, resale range, fast-sale price, max acquisition price, profit/ROI projection, comparable sales |
| 5 | Opportunity Assessment | Final 0–100 score, tier (Exceptional → Avoid), BUY/NEGOTIATE/WATCH/AVOID decision, negotiation strategy |

## Database Schema

Four tables, all secured with row-level security (each user only sees their own data):

- **profiles** — Display name, budget, risk tolerance, preferred categories/marketplaces
- **analyses** — Every analysis run: raw listing input, 5-layer results, valuation, decision
- **portfolio_items** — Inventory tracking: acquisition price, listing price, sold price, profit
- **deal_alerts** — Auto-generated alerts for high-scoring opportunities (score ≥ 70)

A storage bucket (`listing-images`) holds user-uploaded listing photos, scoped per-user.

## Deployment

### Frontend

Deploy the Vite build to any static host (Vercel, Netlify, Cloudflare Pages, etc.):

```bash
npm run build
# Upload the dist/ folder
```

Make sure to set the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables on your hosting provider.

### Backend (Supabase)

The Supabase project handles database, auth, storage, and edge functions. No additional server infrastructure needed.

## License

Proprietary. All rights reserved.
