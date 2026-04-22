-- Fix Olympus scopes timeline: MTMP Spring 2026 is in Las Vegas (Wynn, Apr 15-17),
-- not New Orleans. Correcting both location and month.
-- Safe to re-run (WHERE-clause is idempotent).

update public.olympus_device_failure_timeline
set
  event_date = 'Apr 2026',
  event      = 'MTMP Spring 2026 (Las Vegas, Apr 15–17) features Olympus scopes breakout session — Burnett Law Firm & Hurwitz Law presenting'
where event ilike '%MTMP Spring 2026%New Orleans%'
   or event ilike '%MTMP Spring 2026 (New Orleans)%';
