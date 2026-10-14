-- Review and run this file manually in cPanel phpMyAdmin.
-- The application never creates or alters database tables automatically.
-- No story content, filenames, raw IP addresses, or raw browser identifiers are stored.

CREATE TABLE analytics_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_key CHAR(64) NOT NULL,
  visitor_hash CHAR(64) NOT NULL,
  session_hash CHAR(64) NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  event_type VARCHAR(24) NOT NULL,
  theme VARCHAR(64) NOT NULL DEFAULT '',
  path VARCHAR(255) NOT NULL DEFAULT '/',
  occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_analytics_event_key (event_key),
  KEY ix_analytics_occurred_at (occurred_at),
  KEY ix_analytics_visitor (visitor_hash, occurred_at),
  KEY ix_analytics_session (session_hash),
  KEY ix_analytics_theme (event_type, theme, occurred_at),
  KEY ix_analytics_user (user_id, occurred_at),
  CONSTRAINT fk_analytics_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

