-- PlanetScale Database Schema for Nebulosa Bot
-- Free tier: 10GB storage, 1 billion reads/month

-- Users table for OAuth and bot interactions
CREATE TABLE users (
    id BIGINT PRIMARY KEY,
    telegram_user_id BIGINT UNIQUE NOT NULL,
    telegram_username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    language_code VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_telegram_user_id (telegram_user_id)
);

-- OAuth tokens table (encrypted storage)
CREATE TABLE oauth_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'zoom',
    access_token TEXT NOT NULL, -- Encrypted
    refresh_token TEXT, -- Encrypted  
    token_type VARCHAR(50) DEFAULT 'Bearer',
    expires_at TIMESTAMP,
    scope TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_provider (user_id, provider),
    INDEX idx_expires_at (expires_at)
);

-- Bot usage analytics
CREATE TABLE bot_analytics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT,
    command VARCHAR(100) NOT NULL,
    platform VARCHAR(50) NOT NULL, -- railway, vercel, render
    response_time_ms INT,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_command (command),
    INDEX idx_platform (platform),
    INDEX idx_created_at (created_at),
    INDEX idx_user_command (user_id, command)
);

-- Zoom meeting sessions
CREATE TABLE zoom_sessions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    meeting_id VARCHAR(255) NOT NULL,
    meeting_uuid VARCHAR(255),
    topic VARCHAR(500),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration_minutes INT,
    participants_count INT DEFAULT 0,
    multipin_enabled BOOLEAN DEFAULT FALSE,
    automation_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_meeting_id (meeting_id),
    INDEX idx_start_time (start_time)
);

-- Platform health monitoring
CREATE TABLE platform_health (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    platform VARCHAR(50) NOT NULL, -- railway, vercel, render
    status VARCHAR(20) NOT NULL, -- healthy, degraded, down
    response_time_ms INT,
    error_count INT DEFAULT 0,
    uptime_percentage DECIMAL(5,2),
    last_check TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_platform (platform),
    INDEX idx_last_check (last_check),
    INDEX idx_status (status)
);

-- Configuration settings
CREATE TABLE bot_config (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    config_type VARCHAR(50) DEFAULT 'string', -- string, json, encrypted
    description TEXT,
    updated_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_config_key (config_key)
);

-- ============================================================
-- Sticker Draft, Review, and Disposal System
-- ============================================================

-- Sticker drafts: every generated or received sticker starts here
CREATE TABLE sticker_drafts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    chat_id BIGINT NOT NULL,
    source_file_id VARCHAR(255) NOT NULL,         -- original Telegram file_id sent by user
    generated_file_id VARCHAR(255),               -- file_id produced after any generation step
    file_type VARCHAR(20) NOT NULL DEFAULT 'photo', -- 'photo' or 'sticker'
    status VARCHAR(20) NOT NULL DEFAULT 'draft',  -- draft | approved | rejected | archived | expired | published
    message_id BIGINT,                            -- bot message id that shows the action buttons
    linked_style_id VARCHAR(100),                 -- optional link to a style preset
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,                         -- auto-expire timestamp (default: 7 days after creation)
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_sd_user_id (user_id),
    INDEX idx_sd_status (status),
    INDEX idx_sd_expires_at (expires_at)
);

-- Approved sticker collections: only curated, approved stickers live here
CREATE TABLE sticker_collections (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'personal', -- 'personal' | 'shared'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_sc_user_id (user_id)
);

-- Items inside a collection
CREATE TABLE sticker_collection_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    collection_id BIGINT NOT NULL,
    draft_id BIGINT NOT NULL,
    telegram_file_id VARCHAR(255),
    position INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (collection_id) REFERENCES sticker_collections(id) ON DELETE CASCADE,
    FOREIGN KEY (draft_id) REFERENCES sticker_drafts(id) ON DELETE CASCADE,
    INDEX idx_sci_collection_id (collection_id)
);

-- Trash / disposal: rejected and expired drafts land here before final deletion
CREATE TABLE sticker_trash (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    draft_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    reason VARCHAR(255),
    scheduled_delete_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (draft_id) REFERENCES sticker_drafts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_st_user_id (user_id),
    INDEX idx_st_scheduled_delete_at (scheduled_delete_at)
);

-- Insert default configuration
INSERT INTO bot_config (config_key, config_value, config_type, description) VALUES
('bot_version', '1.0.0', 'string', 'Current bot version'),
('max_meeting_duration', '480', 'string', 'Maximum meeting duration in minutes'),
('multipin_enabled', 'true', 'string', 'Enable multipin automation feature'),
('analytics_enabled', 'true', 'string', 'Enable usage analytics collection'),
('maintenance_mode', 'false', 'string', 'Bot maintenance mode flag'),
('platform_priority', '["railway", "vercel", "render"]', 'json', 'Platform failover priority order');

-- Create read-only user for analytics (optional)
-- CREATE USER 'nebulosa_readonly'@'%' IDENTIFIED BY 'generated_password';
-- GRANT SELECT ON nebulosa.bot_analytics TO 'nebulosa_readonly'@'%';
-- GRANT SELECT ON nebulosa.platform_health TO 'nebulosa_readonly'@'%';
