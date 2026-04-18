-- Broadcast Stations: FCC OPIF station data for market intelligence

CREATE TABLE broadcast_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id TEXT NOT NULL UNIQUE,
  call_sign TEXT NOT NULL,
  service_type TEXT NOT NULL,
  rf_channel TEXT,
  virtual_channel TEXT,
  community_city TEXT NOT NULL,
  community_state TEXT NOT NULL,
  nielsen_dma TEXT,
  network_affil TEXT,
  band TEXT,
  party_name TEXT,
  party_address TEXT,
  party_city TEXT,
  party_state TEXT,
  party_zip TEXT,
  party_phone TEXT,
  party_email TEXT,
  status TEXT,
  license_expiration TEXT,
  active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE broadcast_stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read broadcast stations"
  ON broadcast_stations
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE INDEX idx_broadcast_stations_dma ON broadcast_stations(nielsen_dma);
CREATE INDEX idx_broadcast_stations_state ON broadcast_stations(community_state);
CREATE INDEX idx_broadcast_stations_call ON broadcast_stations(call_sign);
