/**
 * ROBOT INTELLIGENCE DATABASE SCHEMA
 * PostgreSQL schema for OEM partner API access
 * Synced from Firebase every 5 minutes
 */

-- Robot intelligence training data
CREATE TABLE IF NOT EXISTS robot_intelligence (
  id SERIAL PRIMARY KEY,
  
  -- Firebase metadata
  firebase_id VARCHAR(255) UNIQUE NOT NULL,
  synced_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Task information
  task_id VARCHAR(255),
  location_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  organization_id VARCHAR(255) NOT NULL,
  
  -- Performance metrics
  completion_time INTEGER,  -- seconds
  accuracy DECIMAL(5,2),    -- percentage
  errors INTEGER DEFAULT 0,
  
  -- Media
  video_url TEXT,
  thumbnail_url TEXT,
  
  -- Annotations (JSONB for flexible schema)
  annotations JSONB,
  
  -- Metadata
  file_size BIGINT,         -- bytes
  duration INTEGER,         -- seconds
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_organization ON robot_intelligence(organization_id);
CREATE INDEX IF NOT EXISTS idx_location ON robot_intelligence(location_id);
CREATE INDEX IF NOT EXISTS idx_created_at ON robot_intelligence(created_at);
CREATE INDEX IF NOT EXISTS idx_updated_at ON robot_intelligence(updated_at);
CREATE INDEX IF NOT EXISTS idx_task ON robot_intelligence(task_id);

-- API keys for OEM partners
CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  
  -- Key information
  key_hash VARCHAR(255) UNIQUE NOT NULL,  -- sha256 hash of API key
  key_prefix VARCHAR(10) NOT NULL,         -- First 10 chars for identification
  
  -- Organization
  organization_id VARCHAR(255) NOT NULL,
  organization_name VARCHAR(255) NOT NULL,
  
  -- Permissions
  permissions JSONB DEFAULT '{"read": true}'::jsonb,
  
  -- Rate limiting
  rate_limit_per_hour INTEGER DEFAULT 1000,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_by VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP
);

-- Indexes for api_keys
CREATE INDEX IF NOT EXISTS idx_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);

-- Usage tracking
CREATE TABLE IF NOT EXISTS api_usage (
  id SERIAL PRIMARY KEY,
  
  organization_id VARCHAR(255) NOT NULL,
  
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  
  status_code INTEGER,
  response_time_ms INTEGER,
  
  -- Request metadata
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for api_usage
CREATE INDEX IF NOT EXISTS idx_api_usage_org ON api_usage(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created ON api_usage(created_at);
