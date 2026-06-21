#!/usr/bin/env python3
"""
gen_dma_markets_seed.py — emit the full-Nielsen dma_markets seed + pi_metros
city→DMA crosswalk migration for the Competitive Analysis surface (Phase 1).

Authoritative source for code/name/rank/TV-homes: the simzou Nielsen gist
`tv.json` (210 DMAs). Download once:

    gh api gists/6459889 --jq '.files["tv.json"].raw_url' | xargs curl -s -o /tmp/tv.json

This script:
  1. Loads /tmp/tv.json (210 DMAs — the validated universe of codes).
  2. Emits INSERTs for the 129 DMAs not already in dma_markets (the 81 verified
     rows are left untouched via ON CONFLICT (dma_code) DO NOTHING).
  3. Emits the pi_metros.dma_code crosswalk (every queried metro → its DMA).
  4. VALIDATES every code used against tv.json and prints a review table
     (city/DMA → code → official Nielsen name → state) for human spot-check.

primary_state / states_covered / display_name for the 129 new DMAs and the
155 city→DMA assignments are curated here (well-known media markets); Nielsen
codes are NOT — they come from tv.json. Run with --emit to write the migration.

    python scripts/gen_dma_markets_seed.py            # validate + print review
    python scripts/gen_dma_markets_seed.py --emit     # also write the migration
"""
from __future__ import annotations
import json
import sys
from pathlib import Path

TV_PATH = Path("/tmp/tv.json")
OUT = Path("supabase/migrations/20260620010000_seed_full_dma_markets_and_crosswalk.sql")

# 129 DMAs absent from the partial dma_markets seed.
# code -> (primary_state, [states_covered], display_name)
NEW_DMA: dict[str, tuple[str, list[str], str]] = {
    "500": ("ME", ["ME"], "Portland ME"),
    "502": ("NY", ["NY", "PA"], "Binghamton"),
    "509": ("IN", ["IN"], "Fort Wayne"),
    "512": ("MD", ["MD"], "Baltimore"),
    "521": ("RI", ["RI", "MA"], "Providence"),
    "523": ("VT", ["VT", "NY"], "Burlington"),
    "526": ("NY", ["NY"], "Utica"),
    "529": ("KY", ["KY", "IN"], "Louisville"),
    "532": ("NY", ["NY"], "Albany NY"),
    "536": ("OH", ["OH", "PA"], "Youngstown"),
    "537": ("ME", ["ME"], "Bangor"),
    "538": ("NY", ["NY"], "Rochester NY"),
    "540": ("MI", ["MI"], "Traverse City"),
    "541": ("KY", ["KY"], "Lexington"),
    "543": ("MA", ["MA"], "Springfield MA"),
    "544": ("VA", ["VA", "NC"], "Norfolk"),
    "545": ("NC", ["NC"], "Greenville NC"),
    "546": ("SC", ["SC"], "Columbia SC"),
    "549": ("NY", ["NY"], "Watertown"),
    "550": ("NC", ["NC"], "Wilmington NC"),
    "551": ("MI", ["MI"], "Lansing"),
    "552": ("ME", ["ME"], "Presque Isle"),
    "554": ("WV", ["WV", "OH"], "Wheeling"),
    "556": ("VA", ["VA"], "Richmond"),
    "558": ("OH", ["OH"], "Lima"),
    "559": ("WV", ["WV", "VA"], "Bluefield"),
    "564": ("WV", ["WV"], "Charleston WV"),
    "565": ("NY", ["NY"], "Elmira"),
    "567": ("SC", ["SC", "NC"], "Greenville SC"),
    "569": ("VA", ["VA"], "Harrisonburg"),
    "570": ("SC", ["SC"], "Myrtle Beach"),
    "573": ("VA", ["VA"], "Roanoke"),
    "576": ("MD", ["MD", "DE", "VA"], "Salisbury"),
    "581": ("IN", ["IN"], "Terre Haute"),
    "583": ("MI", ["MI"], "Alpena"),
    "584": ("VA", ["VA"], "Charlottesville"),
    "588": ("IN", ["IN"], "South Bend"),
    "596": ("OH", ["OH"], "Zanesville"),
    "597": ("WV", ["WV", "OH"], "Parkersburg"),
    "598": ("WV", ["WV"], "Clarksburg"),
    "603": ("MO", ["MO", "KS"], "Joplin"),
    "604": ("MO", ["MO"], "Columbia MO"),
    "605": ("KS", ["KS"], "Topeka"),
    "606": ("AL", ["AL"], "Dothan"),
    "609": ("MO", ["MO", "IL"], "St. Louis"),
    "610": ("IL", ["IL"], "Rockford"),
    "611": ("MN", ["MN", "IA"], "Rochester MN"),
    "612": ("LA", ["LA"], "Shreveport"),
    "616": ("MO", ["MO", "KS"], "Kansas City"),
    "617": ("WI", ["WI"], "Milwaukee"),
    "619": ("MO", ["MO"], "Springfield MO"),
    "622": ("LA", ["LA"], "New Orleans"),
    "624": ("IA", ["IA", "NE", "SD"], "Sioux City"),
    "625": ("TX", ["TX"], "Waco"),
    "626": ("TX", ["TX"], "Victoria"),
    "627": ("TX", ["TX", "OK"], "Wichita Falls"),
    "628": ("LA", ["LA", "AR"], "Monroe"),
    "631": ("IA", ["IA", "MO"], "Ottumwa"),
    "632": ("KY", ["KY", "IL", "MO", "TN"], "Paducah"),
    "633": ("TX", ["TX"], "Odessa-Midland"),
    "634": ("TX", ["TX"], "Amarillo"),
    "636": ("TX", ["TX"], "Harlingen"),
    "637": ("IA", ["IA"], "Cedar Rapids"),
    "638": ("MO", ["MO"], "St. Joseph"),
    "642": ("LA", ["LA"], "Lafayette LA"),
    "643": ("LA", ["LA"], "Lake Charles"),
    "644": ("LA", ["LA"], "Alexandria LA"),
    "647": ("MS", ["MS"], "Greenwood"),
    "649": ("IN", ["IN", "KY", "IL"], "Evansville"),
    "650": ("OK", ["OK"], "Oklahoma City"),
    "651": ("TX", ["TX"], "Lubbock"),
    "652": ("NE", ["NE", "IA"], "Omaha"),
    "657": ("TX", ["TX", "OK"], "Sherman"),
    "658": ("WI", ["WI"], "Green Bay"),
    "661": ("TX", ["TX"], "San Angelo"),
    "662": ("TX", ["TX"], "Abilene"),
    "669": ("WI", ["WI"], "Madison"),
    "670": ("AR", ["AR", "OK"], "Fort Smith"),
    "671": ("OK", ["OK"], "Tulsa"),
    "673": ("MS", ["MS"], "Columbus MS"),
    "676": ("MN", ["MN", "WI"], "Duluth"),
    "678": ("KS", ["KS"], "Wichita"),
    "679": ("IA", ["IA"], "Des Moines"),
    "682": ("IA", ["IA", "IL"], "Davenport"),
    "687": ("ND", ["ND"], "Minot-Bismarck"),
    "693": ("AR", ["AR"], "Little Rock"),
    "702": ("WI", ["WI", "MN"], "La Crosse"),
    "705": ("WI", ["WI"], "Wausau"),
    "710": ("MS", ["MS"], "Hattiesburg"),
    "711": ("MS", ["MS"], "Meridian"),
    "716": ("LA", ["LA"], "Baton Rouge"),
    "717": ("IL", ["IL", "MO", "IA"], "Quincy"),
    "718": ("MS", ["MS"], "Jackson MS"),
    "722": ("NE", ["NE"], "Lincoln"),
    "724": ("ND", ["ND", "MN"], "Fargo"),
    "725": ("SD", ["SD"], "Sioux Falls"),
    "734": ("AR", ["AR"], "Jonesboro"),
    "736": ("KY", ["KY"], "Bowling Green"),
    "737": ("MN", ["MN"], "Mankato"),
    "740": ("NE", ["NE"], "North Platte"),
    "743": ("AK", ["AK"], "Anchorage"),
    "744": ("HI", ["HI"], "Honolulu"),
    "745": ("AK", ["AK"], "Fairbanks"),
    "746": ("MS", ["MS"], "Biloxi-Gulfport"),
    "747": ("AK", ["AK"], "Juneau"),
    "749": ("TX", ["TX"], "Laredo"),
    "752": ("CO", ["CO"], "Colorado Springs"),
    "754": ("MT", ["MT"], "Butte-Bozeman"),
    "755": ("MT", ["MT"], "Great Falls"),
    "756": ("MT", ["MT"], "Billings"),
    "757": ("ID", ["ID"], "Boise"),
    "758": ("ID", ["ID", "WY"], "Idaho Falls"),
    "759": ("WY", ["WY", "NE"], "Cheyenne"),
    "760": ("ID", ["ID"], "Twin Falls"),
    "762": ("MT", ["MT"], "Missoula"),
    "764": ("SD", ["SD"], "Rapid City"),
    "766": ("MT", ["MT"], "Helena"),
    "767": ("WY", ["WY"], "Casper"),
    "770": ("UT", ["UT"], "Salt Lake City"),
    "773": ("CO", ["CO"], "Grand Junction"),
    "790": ("NM", ["NM"], "Albuquerque"),
    "798": ("MT", ["MT"], "Glendive"),
    "801": ("OR", ["OR"], "Eugene"),
    "810": ("WA", ["WA"], "Yakima"),
    "811": ("NV", ["NV"], "Reno"),
    "813": ("OR", ["OR"], "Medford"),
    "821": ("OR", ["OR"], "Bend"),
    "839": ("NV", ["NV"], "Las Vegas"),
    "881": ("WA", ["WA", "ID"], "Spokane"),
}

# pi_metros (state, metro_name) -> DMA code. Secondary cities roll up to their
# market's DMA (e.g. Aurora -> Denver 751). Codes validated against tv.json.
CITY_DMA: dict[tuple[str, str], str] = {
    ("AK", "Anchorage"): "743", ("AK", "Fairbanks"): "745", ("AK", "Juneau"): "747",
    ("AL", "Birmingham"): "630", ("AL", "Huntsville"): "691", ("AL", "Mobile"): "686", ("AL", "Montgomery"): "698",
    ("AR", "Fayetteville"): "670", ("AR", "Fort Smith"): "670", ("AR", "Little Rock"): "693",
    ("AZ", "Mesa"): "753", ("AZ", "Phoenix"): "753", ("AZ", "Tucson"): "789", ("AZ", "Yuma"): "771",
    ("CA", "Los Angeles"): "803", ("CA", "Sacramento"): "862", ("CA", "San Diego"): "825", ("CA", "San Francisco"): "807",
    ("CO", "Aurora"): "751", ("CO", "Colorado Springs"): "752", ("CO", "Denver"): "751",
    ("CT", "Bridgeport"): "501", ("CT", "Hartford"): "533", ("CT", "New Haven"): "533",
    ("DC", "Washington"): "511",
    ("DE", "Dover"): "504", ("DE", "Newark"): "504", ("DE", "Wilmington"): "504",
    ("FL", "Jacksonville"): "561", ("FL", "Miami"): "528", ("FL", "Orlando"): "534", ("FL", "Tampa"): "539",
    ("GA", "Atlanta"): "524", ("GA", "Augusta"): "520", ("GA", "Savannah"): "507",
    ("HI", "Hilo"): "744", ("HI", "Honolulu"): "744", ("HI", "Kailua"): "744",
    ("IA", "Cedar Rapids"): "637", ("IA", "Davenport"): "682", ("IA", "Des Moines"): "679",
    ("ID", "Boise"): "757", ("ID", "Meridian"): "757", ("ID", "Nampa"): "757",
    ("IL", "Chicago"): "602", ("IL", "Rockford"): "610", ("IL", "Springfield"): "648",
    ("IN", "Evansville"): "649", ("IN", "Fort Wayne"): "509", ("IN", "Indianapolis"): "527",
    ("KS", "Overland Park"): "616", ("KS", "Topeka"): "605", ("KS", "Wichita"): "678",
    ("KY", "Bowling Green"): "736", ("KY", "Lexington"): "541", ("KY", "Louisville"): "529",
    ("LA", "Baton Rouge"): "716", ("LA", "New Orleans"): "622", ("LA", "Shreveport"): "612",
    ("MA", "Boston"): "506", ("MA", "Springfield"): "543", ("MA", "Worcester"): "506",
    ("MD", "Baltimore"): "512", ("MD", "Frederick"): "511", ("MD", "Rockville"): "511",
    ("ME", "Bangor"): "537", ("ME", "Lewiston"): "500", ("ME", "Portland"): "500",
    ("MI", "Ann Arbor"): "505", ("MI", "Detroit"): "505", ("MI", "Grand Rapids"): "563",
    ("MN", "Minneapolis"): "613", ("MN", "Rochester"): "611", ("MN", "Saint Paul"): "613",
    ("MO", "Kansas City"): "616", ("MO", "Springfield"): "619", ("MO", "St. Louis"): "609",
    ("MS", "Gulfport"): "746", ("MS", "Jackson"): "718", ("MS", "Southaven"): "640",
    ("MT", "Billings"): "756", ("MT", "Bozeman"): "754", ("MT", "Missoula"): "762",
    ("NC", "Charlotte"): "517", ("NC", "Greensboro"): "518", ("NC", "Raleigh"): "560",
    ("ND", "Bismarck"): "687", ("ND", "Fargo"): "724", ("ND", "Grand Forks"): "724",
    ("NE", "Bellevue"): "652", ("NE", "Lincoln"): "722", ("NE", "Omaha"): "652",
    ("NH", "Concord"): "506", ("NH", "Manchester"): "506", ("NH", "Nashua"): "506",
    ("NJ", "Jersey City"): "501", ("NJ", "Newark"): "501", ("NJ", "Paterson"): "501",
    ("NM", "Albuquerque"): "790", ("NM", "Las Cruces"): "765", ("NM", "Santa Fe"): "790",
    ("NV", "Henderson"): "839", ("NV", "Las Vegas"): "839", ("NV", "Reno"): "811",
    ("NY", "Buffalo"): "514", ("NY", "New York"): "501", ("NY", "Rochester"): "538",
    ("OH", "Cincinnati"): "515", ("OH", "Cleveland"): "510", ("OH", "Columbus"): "535",
    ("OK", "Norman"): "650", ("OK", "Oklahoma City"): "650", ("OK", "Tulsa"): "671",
    ("OR", "Eugene"): "801", ("OR", "Portland"): "820", ("OR", "Salem"): "820",
    ("PA", "Allentown"): "504", ("PA", "Philadelphia"): "504", ("PA", "Pittsburgh"): "508",
    ("RI", "Cranston"): "521", ("RI", "Providence"): "521", ("RI", "Warwick"): "521",
    ("SC", "Charleston"): "519", ("SC", "Columbia"): "546", ("SC", "Greenville"): "567",
    ("SD", "Aberdeen"): "725", ("SD", "Rapid City"): "764", ("SD", "Sioux Falls"): "725",
    ("TN", "Knoxville"): "557", ("TN", "Memphis"): "640", ("TN", "Nashville"): "659",
    ("TX", "Dallas"): "623", ("TX", "Houston"): "618", ("TX", "San Antonio"): "641",
    ("UT", "Provo"): "770", ("UT", "Salt Lake City"): "770", ("UT", "West Valley City"): "770",
    ("VA", "Norfolk"): "544", ("VA", "Richmond"): "556", ("VA", "Virginia Beach"): "544",
    ("VT", "Burlington"): "523", ("VT", "Rutland"): "523", ("VT", "South Burlington"): "523",
    ("WA", "Seattle"): "819", ("WA", "Spokane"): "881", ("WA", "Tacoma"): "819",
    ("WI", "Green Bay"): "658", ("WI", "Madison"): "669", ("WI", "Milwaukee"): "617",
    ("WV", "Charleston"): "564", ("WV", "Huntington"): "564", ("WV", "Morgantown"): "598",
    ("WY", "Casper"): "767", ("WY", "Cheyenne"): "759", ("WY", "Laramie"): "759",
}


def sql_str(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def sql_arr(states: list[str]) -> str:
    return "ARRAY[" + ",".join(sql_str(s) for s in states) + "]"


def main() -> None:
    if not TV_PATH.exists():
        sys.exit(f"Missing {TV_PATH}. Run: gh api gists/6459889 --jq '.files[\"tv.json\"].raw_url' | xargs curl -s -o /tmp/tv.json")
    tv = json.load(open(TV_PATH))

    problems: list[str] = []
    # Validate every code referenced exists in tv.json
    for code in NEW_DMA:
        if code not in tv:
            problems.append(f"NEW_DMA code {code} not in tv.json")
    for (st, city), code in CITY_DMA.items():
        if code not in tv:
            problems.append(f"CITY_DMA {st}/{city} -> {code} not in tv.json")

    print("=== REVIEW: pi_metros city -> DMA (spot-check state + name) ===")
    for (st, city), code in sorted(CITY_DMA.items()):
        nm = tv.get(code, {}).get("Designated Market Area (DMA)", "??")
        print(f"  {st}/{city:<18} -> {code}  {nm}")

    print(f"\nNEW DMAs to insert: {len(NEW_DMA)}   city crosswalk entries: {len(CITY_DMA)}")
    if problems:
        print("\n!!! PROBLEMS:")
        for p in problems:
            print("  -", p)
        sys.exit(1)
    print("All codes validated against tv.json (210 DMAs).")

    if "--emit" not in sys.argv:
        print("\n(dry preview — pass --emit to write the migration)")
        return

    lines: list[str] = []
    lines.append("-- Full-Nielsen dma_markets seed (129 missing DMAs) + pi_metros DMA crosswalk.")
    lines.append("-- Generated by scripts/gen_dma_markets_seed.py from the simzou Nielsen gist (tv.json).")
    lines.append("-- Existing 81 verified rows are preserved (ON CONFLICT DO NOTHING). Phase 1 / Competitive Analysis.")
    lines.append("")
    lines.append("INSERT INTO public.dma_markets (dma_code, display_name, full_name, primary_state, states_covered, population, rank) VALUES")
    vals = []
    for code in sorted(NEW_DMA, key=int):
        st, covered, disp = NEW_DMA[code]
        rec = tv[code]
        full = rec["Designated Market Area (DMA)"]
        rank = int(rec["Rank"])
        pop = round(int(rec["TV Homes"]) * 2.5)  # TV-homes → population estimate
        vals.append(f"  ({sql_str(code)}, {sql_str(disp)}, {sql_str(full)}, {sql_str(st)}, {sql_arr(covered)}, {pop}, {rank})")
    lines.append(",\n".join(vals))
    lines.append("ON CONFLICT (dma_code) DO NOTHING;")
    lines.append("")
    lines.append("-- pi_metros city -> DMA crosswalk (idempotent; overwrites the principal-city name-match).")
    for (st, city), code in sorted(CITY_DMA.items()):
        lines.append(f"UPDATE public.pi_metros SET dma_code = {sql_str(code)} WHERE state_abbr = {sql_str(st)} AND metro_name = {sql_str(city)};")
    OUT.write_text("\n".join(lines) + "\n")
    print(f"\nWrote {OUT} ({len(NEW_DMA)} DMA inserts + {len(CITY_DMA)} crosswalk updates)")


if __name__ == "__main__":
    main()
