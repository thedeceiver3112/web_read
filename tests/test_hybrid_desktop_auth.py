import os
import unittest
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

import hybrid_sync


TEST_ENV = {
    "GOOGLE_CLIENT_ID": "web-client-id",
    "GOOGLE_CLIENT_SECRET": "web-client-secret",
    "GOOGLE_REDIRECT_URI": "https://example.test/api/auth/google/callback",
    "APP_SESSION_SECRET": "test-session-secret-with-enough-entropy",
    "DB_HOST": "localhost",
    "DB_NAME": "reader",
    "DB_USER": "reader",
    "DB_PASSWORD": "password",
}


class DesktopGoogleAuthTests(unittest.TestCase):
    def test_bearer_token_takes_priority_over_cookie(self):
        token = hybrid_sync._session_token({
            "authorization": "Bearer desktop-token",
            "cookie": f"{hybrid_sync.SESSION_COOKIE}=browser-token",
        })
        self.assertEqual(token, "desktop-token")

    @patch.dict(os.environ, TEST_ENV, clear=False)
    def test_desktop_start_returns_google_redirect_with_signed_challenge(self):
        challenge = "a" * 64
        response = hybrid_sync.handle_api_request(
            "GET",
            f"/api/auth/desktop/start?challenge={challenge}",
            {"x-forwarded-proto": "https"},
        )
        self.assertEqual(response.status, 302)
        headers = dict(response.headers or [])
        location = headers["Location"]
        state = parse_qs(urlsplit(location).query)["state"][0]
        decoded = hybrid_sync._verify_oauth_state(state, TEST_ENV["APP_SESSION_SECRET"])
        self.assertEqual(decoded["desktopChallenge"], challenge)
        self.assertIn(hybrid_sync.OAUTH_STATE_COOKIE, headers["Set-Cookie"])

    @patch.dict(os.environ, TEST_ENV, clear=False)
    def test_desktop_callback_creates_session_from_challenge_hash(self):
        challenge = "b" * 64
        state = hybrid_sync._signed_oauth_state(
            "/",
            TEST_ENV["APP_SESSION_SECRET"],
            {"desktopChallenge": challenge},
        )
        captured = {}

        def capture_session(_config, claims, token_hash):
            captured.update({"claims": claims, "token_hash": token_hash})

        path = f"/api/auth/google/callback?code=test-code&state={state}"
        headers = {"cookie": f"{hybrid_sync.OAUTH_STATE_COOKIE}={state}", "x-forwarded-proto": "https"}
        claims = {"sub": "google-user", "email": "reader@example.test", "email_verified": True}
        with patch.object(hybrid_sync, "_exchange_google_code", return_value=claims), patch.object(
            hybrid_sync, "_create_login_session_with_hash", side_effect=capture_session
        ):
            response = hybrid_sync.handle_api_request("GET", path, headers)

        self.assertEqual(response.status, 302)
        self.assertEqual(dict(response.headers or [])["Location"], "/desktop-auth-complete.html")
        self.assertEqual(captured["token_hash"], challenge)
        self.assertEqual(captured["claims"]["sub"], "google-user")


if __name__ == "__main__":
    unittest.main()
