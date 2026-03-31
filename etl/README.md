# ETL Scripts

This directory will contain Python ETL (Extract, Transform, Load) scripts that pull data from external sources into the Supabase database.

## Planned Connectors

- **Meta Ad Library** — legal ad spend and creatives
- **FARS** — motor vehicle fatality data
- **NOAA Storm Events** — storm and weather data
- **JPML** — MDL statistics
- **CourtListener** — federal court dockets

## Getting Started

```bash
# Create a virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies (once requirements.txt is added)
pip install -r requirements.txt
```

See [docs/data-sources.md](../docs/data-sources.md) for details on each data source.
