import os
import unittest
from unittest.mock import patch

import online_story_proxy as proxy


class FakeResponse:
    def __init__(self, payload, status_code=200):
        self.status_code = status_code
        self._body = payload.encode("utf-8")
        self.closed = False

    def iter_content(self, chunk_size=65536):
        yield self._body

    def close(self):
        self.closed = True


class OnlineStoryProxyTests(unittest.TestCase):
    def setUp(self):
        self.previous_base = os.environ.get("ONLINE_STORY_UPSTREAM_BASE")
        os.environ["ONLINE_STORY_UPSTREAM_BASE"] = "https://upstream.invalid/api"
        proxy._cache.clear()
        proxy._rate_windows.clear()

    def tearDown(self):
        if self.previous_base is None:
            os.environ.pop("ONLINE_STORY_UPSTREAM_BASE", None)
        else:
            os.environ["ONLINE_STORY_UPSTREAM_BASE"] = self.previous_base
        proxy._cache.clear()
        proxy._rate_windows.clear()

    @patch("online_story_proxy.requests.get")
    def test_search_is_cached_and_only_calls_configured_upstream(self, request_get):
        request_get.return_value = FakeResponse('{"success":true,"data":[]}')

        first = proxy.handle_online_story_proxy(
            "GET", "/api/online-story/search?q=mao+son&source=all", "127.0.0.1"
        )
        second = proxy.handle_online_story_proxy(
            "GET", "/api/online-story/search?q=mao+son&source=all", "127.0.0.1"
        )

        self.assertEqual(first.status, 200)
        self.assertEqual(second.status, 200)
        self.assertEqual(request_get.call_count, 1)
        called_url = request_get.call_args.args[0]
        self.assertEqual(called_url, "https://upstream.invalid/api/search")

    @patch("online_story_proxy.requests.get")
    def test_invalid_action_and_parameters_never_reach_upstream(self, request_get):
        unknown = proxy.handle_online_story_proxy(
            "GET", "/api/online-story/arbitrary?url=https://example.test", "client-a"
        )
        short_query = proxy.handle_online_story_proxy(
            "GET", "/api/online-story/search?q=x", "client-a"
        )

        self.assertEqual(unknown.status, 404)
        self.assertEqual(short_query.status, 400)
        request_get.assert_not_called()

    @patch("online_story_proxy.requests.get")
    def test_upstream_errors_do_not_reveal_provider_url(self, request_get):
        request_get.return_value = FakeResponse("Service unavailable", status_code=503)

        response = proxy.handle_online_story_proxy(
            "GET", "/api/online-story/story?story=test-story&source=s1", "client-b"
        )
        body = response.body().decode("utf-8")

        self.assertEqual(response.status, 502)
        self.assertNotIn("upstream.invalid", body)
        self.assertNotIn("http", body)

    def test_missing_configuration_returns_generic_service_error(self):
        os.environ.pop("ONLINE_STORY_UPSTREAM_BASE", None)
        response = proxy.handle_online_story_proxy(
            "GET", "/api/online-story/chapter?story=test&chapter=chapter-1&source=s1", "client-c"
        )
        self.assertEqual(response.status, 503)
        self.assertNotIn("ONLINE_STORY_UPSTREAM_BASE", response.body().decode("utf-8"))


if __name__ == "__main__":
    unittest.main()
