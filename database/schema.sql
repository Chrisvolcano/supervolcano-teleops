-- ============================================
-- SQL Schema for Robot Intelligence Database
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- SYNCED TABLES (from Firestore)
-- ============================================

-- Locations (synced from Firestore)
CREATE TABLE IF NOT EXISTS locations (
    id VARCHAR(255) PRIMARY KEY,
    organization_id VARCHAR(255) NOT NULL,
    organization_name VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    contact_name VARCHAR(255),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(255),
    access_instructions TEXT,
    metadata JSONB, -- Store any additional Firestore fields
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_locations_org ON locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_locations_name ON locations(name);

-- Shifts (synced from Firestore sessions)
CREATE TABLE IF NOT EXISTS shifts (
    id VARCHAR(255) PRIMARY KEY,
    organization_id VARCHAR(255) NOT NULL,
    location_id VARCHAR(255) NOT NULL REFERENCES locations(id),
    location_name VARCHAR(255),
    teleoperator_id VARCHAR(255),
    teleoperator_name VARCHAR(255),
    shift_date DATE NOT NULL,
    total_tasks INTEGER DEFAULT 0,
    total_duration_minutes INTEGER DEFAULT 0,
    first_task_started_at TIMESTAMP,
    last_task_completed_at TIMESTAMP,
    metadata JSONB,
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shifts_location ON shifts(location_id);
CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_shifts_org ON shifts(organization_id);

-- Tasks (synced from Firestore)
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(255) PRIMARY KEY,
    location_id VARCHAR(255) NOT NULL REFERENCES locations(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    estimated_duration_minutes INTEGER,
    priority VARCHAR(50),
    metadata JSONB,
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_location ON tasks(location_id);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_title ON tasks USING gin(to_tsvector('english', title));

-- ============================================
-- NEW TABLES (Robot Intelligence)
-- ============================================

-- Moments - Atomic units of robot-executable work
CREATE TABLE IF NOT EXISTS moments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relationships
    organization_id VARCHAR(255) NOT NULL,
    location_id VARCHAR(255) NOT NULL REFERENCES locations(id),
    shift_id VARCHAR(255) REFERENCES shifts(id),
    task_id VARCHAR(255) NOT NULL REFERENCES tasks(id),
    
    -- Identity
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    
    -- Classification
    moment_type VARCHAR(50) NOT NULL, -- action, observation, decision, navigation, manipulation
    action_verb VARCHAR(100) NOT NULL, -- wipe, open, place, fold, spray
    object_target VARCHAR(100), -- counter, fridge, towel, bed
    room_location VARCHAR(100), -- kitchen, bedroom_1, bathroom
    
    -- Sequencing
    sequence_order INTEGER NOT NULL,
    estimated_duration_seconds INTEGER,
    
    -- Searchability
    tags TEXT[] NOT NULL DEFAULT '{}',
    keywords TEXT[] NOT NULL DEFAULT '{}',
    
    -- Quality metrics
    source VARCHAR(50) NOT NULL, -- manual_entry, task_instruction, video_ai, robot_learning
    human_verified BOOLEAN DEFAULT FALSE,
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    
    -- Robot execution metrics
    robot_execution_count INTEGER DEFAULT 0,
    robot_success_count INTEGER DEFAULT 0,
    robot_success_rate DECIMAL(3,2) GENERATED ALWAYS AS (
        CASE WHEN robot_execution_count > 0 
        THEN ROUND(robot_success_count::DECIMAL / robot_execution_count, 2)
        ELSE 0 END
    ) STORED,
    average_execution_seconds DECIMAL(10,2),
    
    -- Metadata
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for robot queries
CREATE INDEX IF NOT EXISTS idx_moments_location ON moments(location_id);
CREATE INDEX IF NOT EXISTS idx_moments_task ON moments(task_id);
CREATE INDEX IF NOT EXISTS idx_moments_shift ON moments(shift_id);
CREATE INDEX IF NOT EXISTS idx_moments_type ON moments(moment_type);
CREATE INDEX IF NOT EXISTS idx_moments_verb ON moments(action_verb);
CREATE INDEX IF NOT EXISTS idx_moments_room ON moments(room_location);
CREATE INDEX IF NOT EXISTS idx_moments_verified ON moments(human_verified);
CREATE INDEX IF NOT EXISTS idx_moments_tags ON moments USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_moments_keywords ON moments USING gin(keywords);
CREATE INDEX IF NOT EXISTS idx_moments_sequence ON moments(task_id, sequence_order);

-- Full text search on title and description
CREATE INDEX IF NOT EXISTS idx_moments_fulltext ON moments 
    USING gin(to_tsvector('english', title || ' ' || description));

-- Media - Videos, images, annotations
CREATE TABLE IF NOT EXISTS media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relationships
    organization_id VARCHAR(255) NOT NULL,
    location_id VARCHAR(255) NOT NULL REFERENCES locations(id),
    shift_id VARCHAR(255) REFERENCES shifts(id),
    task_id VARCHAR(255) REFERENCES tasks(id),
    
    -- Media details
    media_type VARCHAR(50) NOT NULL, -- video, image, annotation, point_cloud
    storage_url TEXT NOT NULL,
    thumbnail_url TEXT,
    
    -- Video-specific
    duration_seconds INTEGER,
    resolution VARCHAR(50),
    fps INTEGER,
    
    -- Processing
    processing_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    ai_processed BOOLEAN DEFAULT FALSE,
    moments_extracted INTEGER DEFAULT 0,
    
    -- Metadata
    uploaded_by VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tags TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_media_location ON media(location_id);
CREATE INDEX IF NOT EXISTS idx_media_shift ON media(shift_id);
CREATE INDEX IF NOT EXISTS idx_media_task ON media(task_id);
CREATE INDEX IF NOT EXISTS idx_media_type ON media(media_type);
CREATE INDEX IF NOT EXISTS idx_media_status ON media(processing_status);

-- Moment-Media junction table (many-to-many)
CREATE TABLE IF NOT EXISTS moment_media (
    moment_id UUID NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
    media_id UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    media_role VARCHAR(50), -- primary_video, reference_image, annotation, etc.
    time_offset_seconds INTEGER, -- Start time in video if applicable
    PRIMARY KEY (moment_id, media_id)
);

CREATE INDEX IF NOT EXISTS idx_moment_media_moment ON moment_media(moment_id);
CREATE INDEX IF NOT EXISTS idx_moment_media_media ON moment_media(media_id);

-- Location-specific preferences
CREATE TABLE IF NOT EXISTS location_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    location_id VARCHAR(255) NOT NULL REFERENCES locations(id),
    moment_id UUID REFERENCES moments(id),
    task_id VARCHAR(255) REFERENCES tasks(id),
    
    -- Preference details
    preference_type VARCHAR(50) NOT NULL, -- custom_instruction, media_override, sequence_change
    custom_instruction TEXT,
    override_data JSONB,
    
    -- Who and when
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_location_pref_location ON location_preferences(location_id);
CREATE INDEX IF NOT EXISTS idx_location_pref_moment ON location_preferences(moment_id);
CREATE INDEX IF NOT EXISTS idx_location_pref_task ON location_preferences(task_id);

-- Robot execution logs
CREATE TABLE IF NOT EXISTS robot_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    moment_id UUID NOT NULL REFERENCES moments(id),
    robot_id VARCHAR(255) NOT NULL,
    location_id VARCHAR(255) NOT NULL REFERENCES locations(id),
    
    -- Execution details
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    duration_seconds INTEGER,
    
    -- Result
    success BOOLEAN NOT NULL,
    error_message TEXT,
    execution_notes TEXT,
    
    -- Metadata
    robot_type VARCHAR(100),
    software_version VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_robot_exec_moment ON robot_executions(moment_id);
CREATE INDEX IF NOT EXISTS idx_robot_exec_location ON robot_executions(location_id);
CREATE INDEX IF NOT EXISTS idx_robot_exec_robot ON robot_executions(robot_id);
CREATE INDEX IF NOT EXISTS idx_robot_exec_success ON robot_executions(success);
CREATE INDEX IF NOT EXISTS idx_robot_exec_date ON robot_executions(started_at);

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- View: Moments with media counts
CREATE OR REPLACE VIEW moments_enriched AS
SELECT 
    m.*,
    COUNT(DISTINCT mm.media_id) as media_count,
    ARRAY_AGG(DISTINCT med.media_type) FILTER (WHERE med.media_type IS NOT NULL) as available_media_types,
    l.name as location_name,
    t.title as task_title,
    EXISTS(
        SELECT 1 FROM location_preferences lp 
        WHERE lp.moment_id = m.id
    ) as has_location_preference
FROM moments m
LEFT JOIN moment_media mm ON m.id = mm.moment_id
LEFT JOIN media med ON mm.media_id = med.id
JOIN locations l ON m.location_id = l.id
JOIN tasks t ON m.task_id = t.id
GROUP BY m.id, l.name, t.title;

-- View: Task completion rates by location
CREATE OR REPLACE VIEW task_performance AS
SELECT 
    t.id as task_id,
    t.title as task_title,
    l.id as location_id,
    l.name as location_name,
    COUNT(DISTINCT m.id) as moment_count,
    AVG(m.robot_success_rate) as avg_success_rate,
    SUM(m.robot_execution_count) as total_executions,
    MAX(m.updated_at) as last_updated
FROM tasks t
JOIN locations l ON t.location_id = l.id
LEFT JOIN moments m ON t.id = m.task_id
GROUP BY t.id, t.title, l.id, l.name;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function: Update moment execution stats
CREATE OR REPLACE FUNCTION update_moment_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE moments SET
        robot_execution_count = (
            SELECT COUNT(*) FROM robot_executions 
            WHERE moment_id = NEW.moment_id
        ),
        robot_success_count = (
            SELECT COUNT(*) FROM robot_executions 
            WHERE moment_id = NEW.moment_id AND success = TRUE
        ),
        average_execution_seconds = (
            SELECT AVG(duration_seconds) FROM robot_executions 
            WHERE moment_id = NEW.moment_id AND success = TRUE
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.moment_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update stats after robot execution
DROP TRIGGER IF EXISTS trigger_update_moment_stats ON robot_executions;
CREATE TRIGGER trigger_update_moment_stats
AFTER INSERT ON robot_executions
FOR EACH ROW
EXECUTE FUNCTION update_moment_stats();

-- Function: Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update updated_at
DROP TRIGGER IF EXISTS trigger_moments_updated_at ON moments;
CREATE TRIGGER trigger_moments_updated_at
BEFORE UPDATE ON moments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_location_pref_updated_at ON location_preferences;
CREATE TRIGGER trigger_location_pref_updated_at
BEFORE UPDATE ON location_preferences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

