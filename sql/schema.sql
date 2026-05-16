-- ═══════════════════════════════════════════════════════
-- Matatu Route Intelligence Agent — Supabase Schema
-- Run this in the Supabase SQL Editor to bootstrap the DB.
-- ═══════════════════════════════════════════════════════

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
-- ROUTES TABLE
-- Static matatu route reference data
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS routes (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  route_number  TEXT NOT NULL UNIQUE,
  route_name    TEXT NOT NULL,
  boarding_stages TEXT[] NOT NULL DEFAULT '{}',
  key_stops     TEXT[] NOT NULL DEFAULT '{}',
  terminus      TEXT NOT NULL,
  major_road    TEXT,
  fare_range_low  INTEGER DEFAULT 30,
  fare_range_high INTEGER DEFAULT 150,
  operating_hours TEXT DEFAULT '05:00-22:00',
  region        TEXT CHECK (region IN ('westlands','eastlands','south','north','central')),
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_routes_number ON routes(route_number);
CREATE INDEX idx_routes_region ON routes(region);

-- ─────────────────────────────────────────
-- LIVE REPORTS TABLE
-- Crowd-sourced real-time transit conditions
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS live_reports (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type                TEXT NOT NULL CHECK (type IN ('traffic','accident','breakdown','police','weather','robbery','other')),
  severity            TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  location_name       TEXT NOT NULL,
  coordinates         JSONB,          -- { lat, lng } if available
  description         TEXT,
  reporter_phone_hash TEXT NOT NULL,   -- SHA-256 hashed phone for privacy
  route_number        TEXT,
  verified            BOOLEAN DEFAULT false,
  upvotes             INTEGER DEFAULT 0,
  expires_at          TIMESTAMPTZ NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_expires ON live_reports(expires_at);
CREATE INDEX idx_reports_type ON live_reports(type);
CREATE INDEX idx_reports_route ON live_reports(route_number);
CREATE INDEX idx_reports_reporter ON live_reports(reporter_phone_hash);

-- ─────────────────────────────────────────
-- MESSAGE LOG TABLE
-- Analytics & audit trail for all SMS interactions
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_log (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  phone_hash        TEXT NOT NULL,
  inbound_sms       TEXT NOT NULL,
  classified_intent TEXT NOT NULL,
  confidence        REAL DEFAULT 0,
  outbound_sms      TEXT NOT NULL,
  processing_time_ms INTEGER,
  entities          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_msglog_intent ON message_log(classified_intent);
CREATE INDEX idx_msglog_created ON message_log(created_at DESC);

-- ─────────────────────────────────────────
-- RPC: Atomic upvote increment
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_upvote(report_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE live_reports
  SET upvotes = upvotes + 1,
      verified = CASE WHEN upvotes + 1 >= 3 THEN true ELSE verified END
  WHERE id = report_id;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_log ENABLE ROW LEVEL SECURITY;

-- Public read access to routes
CREATE POLICY "Routes are publicly readable"
  ON routes FOR SELECT USING (true);

-- Public read access to non-expired reports
CREATE POLICY "Active reports are publicly readable"
  ON live_reports FOR SELECT
  USING (expires_at > NOW());

-- Service role can insert reports
CREATE POLICY "Service role can insert reports"
  ON live_reports FOR INSERT
  WITH CHECK (true);

-- Service role can update reports (upvotes)
CREATE POLICY "Service role can update reports"
  ON live_reports FOR UPDATE
  USING (true);

-- Service role can insert message logs
CREATE POLICY "Service role can insert logs"
  ON message_log FOR INSERT
  WITH CHECK (true);

-- ─────────────────────────────────────────
-- ENABLE REALTIME on live_reports
-- ─────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE live_reports;

-- ─────────────────────────────────────────
-- AUTO-UPDATE updated_at trigger
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER routes_updated_at
  BEFORE UPDATE ON routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
