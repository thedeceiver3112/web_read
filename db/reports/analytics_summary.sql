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

-- Visits by Vietnam local hour (UTC+7). A visit is a newly opened browser-tab session.
SELECT
  HOUR(DATE_ADD(occurred_at, INTERVAL 7 HOUR)) AS usage_hour,
  COUNT(*) AS visits,
  COUNT(DISTINCT visitor_hash) AS unique_browsers
FROM analytics_events
WHERE event_type = 'visit'
  AND occurred_at >= UTC_TIMESTAMP() - INTERVAL @days DAY
GROUP BY usage_hour
ORDER BY usage_hour;

-- Visits by time slots of day (Vietnam UTC+7): Đêm, Sáng, Chiều, Tối.
SELECT
  CASE
    WHEN HOUR(DATE_ADD(occurred_at, INTERVAL 7 HOUR)) BETWEEN 0 AND 5 THEN '1. Đêm (00:00 - 05:59)'
    WHEN HOUR(DATE_ADD(occurred_at, INTERVAL 7 HOUR)) BETWEEN 6 AND 11 THEN '2. Buổi sáng (06:00 - 11:59)'
    WHEN HOUR(DATE_ADD(occurred_at, INTERVAL 7 HOUR)) BETWEEN 12 AND 17 THEN '3. Buổi chiều (12:00 - 17:59)'
    ELSE '4. Buổi tối (18:00 - 23:59)'
  END AS time_slot,
  COUNT(*) AS visits,
  COUNT(DISTINCT visitor_hash) AS unique_browsers,
  ROUND(COUNT(*) * 100.0 / NULLIF(totals.total_visits, 0), 1) AS percent_visits
FROM analytics_events
CROSS JOIN (
  SELECT COUNT(*) AS total_visits
  FROM analytics_events
  WHERE event_type = 'visit'
    AND occurred_at >= UTC_TIMESTAMP() - INTERVAL @days DAY
) AS totals
WHERE event_type = 'visit'
  AND occurred_at >= UTC_TIMESTAMP() - INTERVAL @days DAY
GROUP BY time_slot, totals.total_visits
ORDER BY time_slot;

-- Visits during office hours vs outside office hours (08:00 - 17:00 UTC+7).
SELECT
  CASE
    WHEN HOUR(DATE_ADD(occurred_at, INTERVAL 7 HOUR)) BETWEEN 8 AND 16 THEN 'Giờ làm việc (08:00 - 17:00)'
    ELSE 'Ngoài giờ làm việc'
  END AS period_type,
  COUNT(*) AS visits,
  COUNT(DISTINCT visitor_hash) AS unique_browsers,
  ROUND(COUNT(*) * 100.0 / NULLIF(totals.total_visits, 0), 1) AS percent_visits
FROM analytics_events
CROSS JOIN (
  SELECT COUNT(*) AS total_visits
  FROM analytics_events
  WHERE event_type = 'visit'
    AND occurred_at >= UTC_TIMESTAMP() - INTERVAL @days DAY
) AS totals
WHERE event_type = 'visit'
  AND occurred_at >= UTC_TIMESTAMP() - INTERVAL @days DAY
GROUP BY period_type, totals.total_visits
ORDER BY period_type;

-- Theme popularity (Overall for the period).
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

-- Theme popularity by day (Thống kê theme theo ngày).
SELECT
  DATE(occurred_at) AS usage_date,
  theme,
  COUNT(*) AS theme_views,
  COUNT(DISTINCT visitor_hash) AS unique_browsers
FROM analytics_events
WHERE event_type = 'theme_view'
  AND occurred_at >= UTC_TIMESTAMP() - INTERVAL @days DAY
  AND theme <> ''
GROUP BY usage_date, theme
ORDER BY usage_date DESC, theme_views DESC;

-- Hourly traffic trend by day (Thống kê khung giờ theo từng ngày).
SELECT
  DATE(DATE_ADD(occurred_at, INTERVAL 7 HOUR)) AS usage_date,
  HOUR(DATE_ADD(occurred_at, INTERVAL 7 HOUR)) AS usage_hour,
  COUNT(*) AS visits,
  COUNT(DISTINCT visitor_hash) AS unique_browsers
FROM analytics_events
WHERE event_type = 'visit'
  AND occurred_at >= UTC_TIMESTAMP() - INTERVAL @days DAY
GROUP BY usage_date, usage_hour
ORDER BY usage_date DESC, usage_hour ASC;
