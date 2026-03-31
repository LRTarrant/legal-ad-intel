# Data Sources

Planned data sources for Legal Marketing Intelligence. Each source feeds one or more database tables via Python ETL scripts.

## Ad Spend & Media

| Source | Description | Target Table | Status |
|--------|-------------|--------------|--------|
| **Meta Ad Library** | Facebook/Instagram ad spend and creatives for legal advertisers | `ad_events` | Planned |
| **iSpot.tv** | TV and CTV ad occurrence and spend estimates | `ad_events` | Planned |
| **MediaRadar** | Cross-channel advertising intelligence | `ad_events` | Planned |
| **Google Ads Transparency** | Google search and display ad data | `ad_events` | Planned |

## Incident & Event Data

| Source | Description | Target Table | Status |
|--------|-------------|--------------|--------|
| **FARS** (Fatality Analysis Reporting System) | NHTSA motor vehicle fatality data, downloadable as CSV | `fatalities` | Planned |
| **NOAA Storm Events** | National Weather Service storm event data (tornadoes, hail, floods, hurricanes) | `storms` | Planned |

## Legal & Court Data

| Source | Description | Target Table | Status |
|--------|-------------|--------------|--------|
| **JPML Reports** | Judicial Panel on Multidistrict Litigation — MDL pending case counts | `mdls`, `mdl_stats_monthly` | Planned |
| **CourtListener API** | Free Law Project — federal court dockets and filings | `dockets`, `docket_events` | Planned |

## Trends & Supplementary

| Source | Description | Target Table | Status |
|--------|-------------|--------------|--------|
| **Google Trends** | Search interest trends for mass tort and legal keywords | Supplementary (TBD) | Planned |

## Notes

- All ETL scripts will live in the `etl/` directory
- Each connector will handle pagination, rate limiting, and deduplication
- Data is deduplicated using `(source, source_event_id)` or similar unique constraints
- Raw API responses are stored in the `metadata` / `attributes` JSONB columns for auditability
