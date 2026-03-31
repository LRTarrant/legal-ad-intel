# Project Roadmap

High-level phases for Legal Marketing Intelligence.

## Phase 1: Foundation & Schema (current)

- [x] Design and apply Phase 1 database schema
- [x] Set up Supabase project and local dev environment
- [ ] Document schema, data sources, and project structure
- [ ] Set up repo conventions (README, .gitignore, folder structure)

## Phase 2: First ETL Pipelines

- [ ] Build Python ETL framework in `etl/`
- [ ] Meta Ad Library connector (ad spend data)
- [ ] FARS connector (motor vehicle fatality data)
- [ ] NOAA Storm Events connector
- [ ] Basic data validation and deduplication
- [ ] Seed script for development data

## Phase 3: Dashboard UI

- [ ] Initialize Next.js application
- [ ] Supabase Auth integration (email + magic link)
- [ ] Ad spend overview dashboard
- [ ] Mass tort tracker view
- [ ] Market-level drill-down pages
- [ ] Basic search and filtering

## Phase 4: Auth, Polish & Launch

- [ ] Role-based access control (firm-level permissions)
- [ ] Stripe billing integration
- [ ] Email alerts and notifications
- [ ] Performance optimization and caching
- [ ] Production deployment on Vercel
- [ ] Launch to beta users
