#!/usr/bin/env python3
"""Generate (and optionally validate) the pi_metros seed migration for all 50
states + DC.

The "Search Advertising Landscape" section of a State Intelligence page is
powered by pi_metros -> pi_search_daily.py (loops every metro) -> the get_pi_*
RPCs (keyed on pi_metros.state_abbr). A state only populates once it has
pi_metros rows. AL/CA/FL were seeded in 20260417120000; this fills the rest.

Top ~3 metros per state by city population. searchapi_location uses Google's
canonical geotarget format "City, State, United States" (matches the existing
seed and is what pi_search_daily passes to SearchApi's `location` param).

Usage:
  python scripts/gen_pi_metros_seed.py            # print SQL to stdout
  python scripts/gen_pi_metros_seed.py --out <f>  # write SQL to a file
  python scripts/gen_pi_metros_seed.py --validate # check every searchapi_location
                                                  # resolves (needs SEARCHAPI_API_KEY)
"""
import argparse
import os
import sys
import subprocess
import urllib.parse
import json

STATE_NAME = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
    "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware",
    "DC": "District of Columbia", "FL": "Florida", "GA": "Georgia", "HI": "Hawaii",
    "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas",
    "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
    "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi",
    "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada",
    "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York",
    "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma",
    "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island",
    "SC": "South Carolina", "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas",
    "UT": "Utah", "VT": "Vermont", "VA": "Virginia", "WA": "Washington",
    "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
}

# Top ~3 metros per state by city population (well-known cities with stable
# Google geotargets). AL/CA/FL kept for completeness (ON CONFLICT no-ops them).
METROS = {
    "AL": ["Birmingham", "Montgomery", "Huntsville"],
    "AK": ["Anchorage", "Fairbanks", "Juneau"],
    "AZ": ["Phoenix", "Tucson", "Mesa"],
    "AR": ["Little Rock", "Fayetteville", "Fort Smith"],
    "CA": ["Los Angeles", "San Francisco", "San Diego"],
    "CO": ["Denver", "Colorado Springs", "Aurora"],
    "CT": ["Bridgeport", "New Haven", "Hartford"],
    "DE": ["Wilmington", "Dover", "Newark"],
    "DC": ["Washington"],
    "FL": ["Miami", "Tampa", "Jacksonville"],
    "GA": ["Atlanta", "Augusta", "Savannah"],
    "HI": ["Honolulu", "Hilo", "Kailua"],
    "ID": ["Boise", "Meridian", "Nampa"],
    "IL": ["Chicago", "Rockford", "Springfield"],
    "IN": ["Indianapolis", "Fort Wayne", "Evansville"],
    "IA": ["Des Moines", "Cedar Rapids", "Davenport"],
    "KS": ["Wichita", "Overland Park", "Topeka"],
    "KY": ["Louisville", "Lexington", "Bowling Green"],
    "LA": ["New Orleans", "Baton Rouge", "Shreveport"],
    "ME": ["Portland", "Lewiston", "Bangor"],
    "MD": ["Baltimore", "Frederick", "Rockville"],
    "MA": ["Boston", "Worcester", "Springfield"],
    "MI": ["Detroit", "Grand Rapids", "Ann Arbor"],
    "MN": ["Minneapolis", "Saint Paul", "Rochester"],
    "MS": ["Jackson", "Gulfport", "Southaven"],
    "MO": ["Kansas City", "St. Louis", "Springfield"],
    "MT": ["Billings", "Missoula", "Bozeman"],
    "NE": ["Omaha", "Lincoln", "Bellevue"],
    "NV": ["Las Vegas", "Reno", "Henderson"],
    "NH": ["Manchester", "Nashua", "Concord"],
    "NJ": ["Newark", "Jersey City", "Paterson"],
    "NM": ["Albuquerque", "Las Cruces", "Santa Fe"],
    "NY": ["New York", "Buffalo", "Rochester"],
    "NC": ["Charlotte", "Raleigh", "Greensboro"],
    "ND": ["Fargo", "Bismarck", "Grand Forks"],
    "OH": ["Columbus", "Cleveland", "Cincinnati"],
    "OK": ["Oklahoma City", "Tulsa", "Norman"],
    "OR": ["Portland", "Salem", "Eugene"],
    "PA": ["Philadelphia", "Pittsburgh", "Allentown"],
    "RI": ["Providence", "Warwick", "Cranston"],
    "SC": ["Charleston", "Columbia", "Greenville"],
    "SD": ["Sioux Falls", "Rapid City", "Aberdeen"],
    "TN": ["Nashville", "Memphis", "Knoxville"],
    "TX": ["Houston", "San Antonio", "Dallas"],
    "UT": ["Salt Lake City", "West Valley City", "Provo"],
    "VT": ["Burlington", "South Burlington", "Rutland"],
    "VA": ["Virginia Beach", "Richmond", "Norfolk"],
    "WA": ["Seattle", "Spokane", "Tacoma"],
    "WV": ["Charleston", "Huntington", "Morgantown"],
    "WI": ["Milwaukee", "Madison", "Green Bay"],
    "WY": ["Cheyenne", "Casper", "Laramie"],
}


def rows():
    for abbr, cities in METROS.items():
        full = STATE_NAME[abbr]
        for city in cities:
            yield {
                "state_abbr": abbr,
                "metro_name": city,
                "metro_label": f"{city}, {abbr}",
                "searchapi_location": f"{city}, {full}, United States",
            }


def sql(rs):
    def esc(s):
        return s.replace("'", "''")

    lines = [
        "-- Seed pi_metros for all 50 states + DC (Search Advertising Landscape).",
        "-- ~3 major metros per state. AL/CA/FL already seeded in",
        "-- 20260417120000_add_pi_search_tables.sql; ON CONFLICT no-ops them.",
        "-- pi_search_daily.py loops every pi_metros row and auto-builds",
        "-- pi_search_observations + pi_competitor_profiles, so the get_pi_* RPCs",
        "-- (and each state page's Search Advertising Landscape) populate on the",
        "-- next run. searchapi_location is Google's canonical geotarget name.",
        "",
        "INSERT INTO public.pi_metros (state_abbr, metro_name, metro_label, searchapi_location) VALUES",
    ]
    vals = [
        f"  ('{esc(r['state_abbr'])}', '{esc(r['metro_name'])}', "
        f"'{esc(r['metro_label'])}', '{esc(r['searchapi_location'])}')"
        for r in rs
    ]
    lines.append(",\n".join(vals))
    lines.append("ON CONFLICT (state_abbr, metro_name) DO NOTHING;")
    return "\n".join(lines) + "\n"


def validate(rs):
    key = os.environ.get("SEARCHAPI_API_KEY")
    if not key:
        print("SEARCHAPI_API_KEY not set — cannot validate.", file=sys.stderr)
        return 2
    bad = []
    for r in rs:
        loc = r["searchapi_location"]
        q = urllib.parse.quote(r["metro_name"])
        url = f"https://www.searchapi.io/api/v1/locations?q={q}&limit=20"
        try:
            out = subprocess.run(
                ["curl", "-sS", "--fail", url, "-H", f"Authorization: Bearer {key}"],
                capture_output=True, text=True, timeout=30, check=True,
            ).stdout
            data = json.loads(out)
        except Exception as e:  # noqa: BLE001
            bad.append((loc, f"request error: {e}"))
            continue
        # canonical_name is comma-no-space ("City,State,United States"); our
        # searchapi_location is comma-space. SearchApi accepts the spaced form
        # (verified: detected_location resolves), so compare space-normalized.
        names = {
            (item.get("canonical_name") or item.get("name") or "").replace(" ", "")
            for item in data
        }
        norm = loc.replace(" ", "")
        if norm not in names:
            near = [n for n in names if n and r["state_abbr"] and
                    STATE_NAME[r["state_abbr"]].replace(" ", "") in n]
            bad.append((loc, f"no City canonical match; near: {sorted(near)[:6]}"))
    if bad:
        print(f"\n{len(bad)} location(s) need review:", file=sys.stderr)
        for loc, why in bad:
            print(f"  - {loc!r}: {why}", file=sys.stderr)
        return 1
    print(f"All {len(list(rs))} locations resolved.", file=sys.stderr)
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out")
    ap.add_argument("--validate", action="store_true")
    args = ap.parse_args()
    rs = list(rows())
    if args.validate:
        sys.exit(validate(rs))
    out = sql(rs)
    if args.out:
        with open(args.out, "w") as f:
            f.write(out)
        print(f"wrote {len(rs)} rows -> {args.out}", file=sys.stderr)
    else:
        sys.stdout.write(out)


if __name__ == "__main__":
    main()
