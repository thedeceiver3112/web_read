# Hybrid sync setup

The reader remains local-first. PDF, EPUB, and TXT contents stay in browser
IndexedDB. The server stores only document metadata, reading position,
bookmarks, and reader settings.

## 1. Create the database manually

1. Create a MySQL database and user in cPanel.
2. Grant that user privileges only on this database.
3. Review and run `db/migrations/001_hybrid_sync.sql` in phpMyAdmin.

To enable privacy-friendly traffic and theme statistics, review and run
`db/migrations/002_usage_analytics.sql` after migration 001. This migration
creates one event table only. It does not store story content, filenames, raw
IP addresses, or raw browser identifiers.

The application does not run migrations or create tables automatically.

## Usage analytics

The browser records one `visit` per tab session and at most one `theme_view`
for each theme opened during that session. A persistent random browser ID and
the tab session ID are HMAC-hashed on the server before they are stored.
Authenticated events are associated with the corresponding Google account.

Run `db/reports/analytics_summary.sql` in phpMyAdmin to view:

- unique browser profiles and visits;
- signed-in Google users;
- daily traffic;
- theme popularity and usage percentage.

“Unique browser” is an approximation. Clearing browser storage or using a
different browser/device creates a new anonymous visitor.

The protected dashboard is available at `/admin-analytics.html`. Its API is
`GET /api/admin/analytics?range=30`, where `range` can be `7`, `30`, or `90`.
Only aggregate counts are returned; visitor and session hashes are never
included. Set `analytics_admin_emails` in `web_read_config.php` to the Google
accounts allowed to open the dashboard.

## 2. Create Google OAuth credentials

In Google Cloud Console, create an OAuth 2.0 Client ID of type **Web
application** and add this authorized redirect URI:

```text
https://thedeceiver.site/api/auth/google/callback
```

Only `openid email profile` scopes are requested. Google Drive access is not
used.

## 3. Configure cPanel environment variables

Add the variables shown in `.env.example` to the Python application's
Environment Variables section. Generate `APP_SESSION_SECRET` with:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Do not commit real credentials or paste them into source files.

## 4. Install and restart

Run **Run Pip Install** against `requirements.txt`, then restart the Python
application. Verify:

```text
GET /api/health
GET /api/auth/status
```

`/api/auth/status` should return `enabled: true`. The Google login button is
hidden automatically while configuration is incomplete.

## Sync behavior

- Browser writes local state immediately.
- Authenticated users push metadata after three seconds of inactivity.
- Offline/network failures never block reading; the local copy remains the
  source of truth until sync becomes available again.
- A SHA-256 fingerprint of file size/type plus the first and last 1 MiB is used
  to identify the same local file without uploading its contents.
