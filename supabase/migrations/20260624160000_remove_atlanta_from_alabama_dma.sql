-- ============================================================================
-- Atlanta (DMA 524) should not appear as an Alabama market.
--
-- The state DMA dropdown (/api/dma-markets?state=AL) returns DMAs where
-- primary_state = 'AL' OR states_covered contains 'AL'. Atlanta's
-- states_covered was [GA, AL] (the Nielsen Atlanta DMA nips a few small
-- east-AL counties), so it surfaced as an Alabama market — but it is not a
-- meaningful AL market for plaintiff-firm targeting, and selecting it returns
-- empty AL data (no AL pi_metro maps to DMA 524).
--
-- Columbus GA (DMA 522) intentionally stays AL-covered: it includes Phenix
-- City / Auburn, which are real Alabama population centers.
--
-- Dropdown-only correction. The firm roster keys off pi_metros (4 AL metros,
-- no Atlanta), so this does not change get_state_firm_roster.
-- ============================================================================

UPDATE public.dma_markets
SET states_covered = array_remove(states_covered, 'AL'),
    updated_at = now()
WHERE dma_code = '524'
  AND primary_state = 'GA'
  AND 'AL' = ANY(states_covered);
