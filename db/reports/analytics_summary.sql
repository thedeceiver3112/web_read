-- Usage report for phpMyAdmin. This script is read-only.
-- Change 30 below to the reporting period you need.
SET @days := 30;

-- Overall traffic. A visitor means one browser profile, not necessarily one person.
SELECT
  COUNT(DISTINCT CASE WHEN event_type = 'visit' THEN visitor_hash END) AS unique_browsers,
  COUNT(DISTINCT CASE WHEN event_type = 'visit' THEN session_hash END) AS visits,
  COUNT(DISTINCT user_id) AS signed_in_users,
  MIN(occurred_at) AS first_event,
  MAX(occurred_at) AS last_event
FROM analytics_events
WHERE occurred_at >= UTC_TIMESTAMP() - INTERVAL @days DAY;

-- Daily traffic trend.
SELECT
  DATE(occurred_at) AS usage_date,
  COUNT(DISTINCT CASE WHEN event_type = 'visit' THEN visitor_hash END) AS unique_browsers,
  COUNT(DISTINCT CASE WHEN event_type = 'visit' THEN session_hash END) AS visits,
  COUNT(DISTINCT user_id) AS signed_in_users
FROM analytics_events
WHERE occurred_at >= UTC_TIMESTAMP() - INTERVAL @days DAY
GROUP BY DATE(occurred_at)
ORDER BY usage_date DESC;

-- Theme popularity. Each theme counts at most once per browser tab session.
SELECT
  grouped.theme,
  grouped.theme_sessions,
  grouped.unique_browsers,
  grouped.signed_in_users,
  ROUND(grouped.theme_sessions * 100.0 / NULLIF(totals.total_sessions, 0), 2) AS usage_percent
FROM (
  SELECT
    theme,
    COUNT(*) AS theme_sessions,
    COUNT(DISTINCT visitor_hash) AS unique_browsers,
    COUNT(DISTINCT user_id) AS signed_in_users
  FROM analytics_events
  WHERE event_type = 'theme_view'
    AND occurred_at >= UTC_TIMESTAMP() - INTERVAL @days DAY
  GROUP BY theme
) AS grouped
CROSS JOIN (
  SELECT COUNT(*) AS total_sessions
  FROM analytics_events
  WHERE event_type = 'theme_view'
    AND occurred_at >= UTC_TIMESTAMP() - INTERVAL @days DAY
) AS totals
ORDER BY grouped.theme_sessions DESC, grouped.theme ASC;

