# Legal Marketing Intelligence

Competitive intelligence SaaS for plaintiff law firms. Aggregates ad spend, motor vehicle accident (MVA) data, storm damage, mass tort dockets, and legal news into one platform.

**Live at**: [legalmarketingintelligence.com](https://legalmarketingintelligence.com)

## Stack

| Layer     | Technology             |
|-----------|------------------------|
| Frontend  | Next.js (deployed on Vercel) |
| Backend   | Supabase (Postgres + Auth + Edge Functions) |
| ETL       | Python scripts (planned) |

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Supabase CLI](https://supabase.com/docs/guides/cli) v1+
- [Python](https://www.python.org/) 3.10+ (for ETL scripts)
- A Supabase project (or use the local dev setup)

## Getting Started

```bash
# 1. Clone the repo
git clone https://github.com/<your-org>/legal-ad-intel.git
cd legal-ad-intel

# 2. Install frontend dependencies (when the Next.js app is added)
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Fill in your Supabase URL and keys in .env.local

# 4. Start Supabase locally
supabase start

# 5. Apply database migrations
supabase db reset
# This runs all migrations in supabase/migrations/ and seeds data

# 6. Start the dev server (when the Next.js app is added)
npm run dev
```

## Folder Structure

```
.
├── supabase/
│   ├── config.toml          # Supabase local dev configuration
│   └── migrations/           # SQL migration files (YYYYMMDDHHMMSS_name.sql)
├── etl/                      # Python ETL scripts (planned)
├── scripts/                  # Utility scripts
├── docs/
│   ├── schema.md             # Database schema documentation
│   ├── roadmap.md            # Project roadmap
│   └── data-sources.md       # Planned data sources
├── .env.example              # Environment variable template
└── README.md                 # This file
```

## Development Commands

| Command                | Description                      |
|------------------------|----------------------------------|
| `supabase start`       | Start local Supabase services    |
| `supabase stop`        | Stop local Supabase services     |
| `supabase db reset`    | Reset DB and re-run migrations   |
| `supabase migration new <name>` | Create a new migration file |
| `npm run dev`          | Start Next.js dev server (TBD)   |
| `npm run build`        | Build for production (TBD)       |

## Documentation

- [Database Schema](docs/schema.md) - Phase 1 tables and relationships
- [Roadmap](docs/roadmap.md) - Project phases and milestones
- [Data Sources](docs/data-sources.md) - Planned data integrations

## License

Private - All rights reserved.
