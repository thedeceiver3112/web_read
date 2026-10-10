# Hybrid sync setup

The reader remains local-first. PDF, EPUB, and TXT contents stay in browser
IndexedDB. The server stores only document metadata, reading position,
bookmarks, and reader settings.

## 1. Create the database manually

1. Create a MySQL database and user in cPanel.
2. Grant that user privileges only on this database.
3. Review and run `db/migrations/001_hybrid_sync.sql` in phpMyAdmin.

The application does not run migrations or create tables automatically.

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
