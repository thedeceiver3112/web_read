import os
import unittest
from unittest.mock import patch

import online_story_proxy as proxy


class FakeResponse:
    def __init__(self, payload, status_code=200):
        self.status_code = status_code
        self._body = payload.encode("utf-8")
        self.encoding = "utf-8"
        self.closed = False

    def iter_content(self, chunk_size=65536):
        yield self._body

    def close(self):
        self.closed = True


class OnlineStoryProxyTests(unittest.TestCase):
    def setUp(self):
        self.previous_base = os.environ.get("ONLINE_STORY_UPSTREAM_BASE")
        self.previous_provider = os.environ.get("ONLINE_STORY_PROVIDER")
        os.environ["ONLINE_STORY_UPSTREAM_BASE"] = "https://upstream.invalid/api"
        os.environ.pop("ONLINE_STORY_PROVIDER", None)
        proxy._cache.clear()
        proxy._rate_windows.clear()

    def tearDown(self):
        if self.previous_base is None:
            os.environ.pop("ONLINE_STORY_UPSTREAM_BASE", None)
        else:
            os.environ["ONLINE_STORY_UPSTREAM_BASE"] = self.previous_base
        if self.previous_provider is None:
            os.environ.pop("ONLINE_STORY_PROVIDER", None)
        else:
            os.environ["ONLINE_STORY_PROVIDER"] = self.previous_provider
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

    @patch("online_story_proxy.requests.get")
    def test_hh3d_search_is_normalized_without_cookie(self, request_get):
        os.environ["ONLINE_STORY_UPSTREAM_BASE"] = "https://truyenhh3d.com"
        os.environ["ONLINE_STORY_PROVIDER"] = "hh3d"
        request_get.return_value = FakeResponse(
            '{"items":[{"slug":"mao-son","title":"Mao Sơn",'
            '"author":"Thanh Tử","chapters":3641}]}'
        )

        response = proxy.handle_online_story_proxy(
            "GET", "/api/online-story/search?q=mao+son&source=all", "client-hh3d"
        )
        payload = response.payload

        self.assertEqual(response.status, 200)
        self.assertEqual(payload["data"][0]["source"], "hh3d")
        self.assertEqual(payload["data"][0]["story_id"], "mao-son")
        self.assertEqual(payload["data"][0]["latest_chapter"], "Chương 3641")
        self.assertEqual(request_get.call_args.args[0], "https://truyenhh3d.com/api/suggest")
        self.assertNotIn("Cookie", request_get.call_args.kwargs["headers"])

    @patch("online_story_proxy.requests.get")
    def test_hh3d_story_builds_numeric_chapter_list(self, request_get):
        os.environ["ONLINE_STORY_UPSTREAM_BASE"] = "https://truyenhh3d.com"
        os.environ["ONLINE_STORY_PROVIDER"] = "hh3d"
        request_get.return_value = FakeResponse(
            '{"ok":true,"idx":1,"total":3,"title":"Khởi đầu",'
            '"novel":{"title":"Mao Sơn","author":"Thanh Tử"},"paragraphs":["Đoạn 1"]}'
        )

        response = proxy.handle_online_story_proxy(
            "GET", "/api/online-story/story?story=mao-son&source=hh3d", "client-story"
        )
        chapters = response.payload["data"]["chapters"]

        self.assertEqual(response.status, 200)
        self.assertEqual(len(chapters), 3)
        self.assertEqual(chapters[-1], {"title": "Chương 3", "chapter_id": "3"})
        self.assertEqual(request_get.call_args.kwargs["params"], {"slug": "mao-son", "idx": "1"})

    @patch("online_story_proxy.requests.get")
    def test_hh3d_chapter_decodes_text_entities(self, request_get):
        os.environ["ONLINE_STORY_UPSTREAM_BASE"] = "https://truyenhh3d.com"
        os.environ["ONLINE_STORY_PROVIDER"] = "hh3d"
        request_get.return_value = FakeResponse(
            '{"ok":true,"idx":2,"total":3,"title":"Khai quan",'
            '"novel":{"title":"Mao Sơn","author":"Thanh Tử"},'
            '"paragraphs":["Lão đạo nói &quot;được&quot;.","  "]}'
        )

        response = proxy.handle_online_story_proxy(
            "GET", "/api/online-story/chapter?story=mao-son&chapter=2&source=hh3d", "client-chapter"
        )
        data = response.payload["data"]

        self.assertEqual(response.status, 200)
        self.assertEqual(data["chapter_title"], "Chương 2: Khai quan")
        self.assertEqual(data["paragraphs"], ['Lão đạo nói "được".'])
        self.assertEqual(data["total_lines"], 1)

    @patch("online_story_proxy.requests.get")
    def test_truyenfull_search_normalizes_quick_search_html(self, request_get):
        os.environ["ONLINE_STORY_UPSTREAM_BASE"] = "https://truyenfull.live"
        os.environ["ONLINE_STORY_PROVIDER"] = "truyenfull"
        request_get.return_value = FakeResponse(
            '<a href="https://truyenfull.live/van-co-chi-ton/" '
            'class="list-group-item" title="Vạn Cổ Chí Tôn">Vạn Cổ Chí Tôn</a>'
        )

        response = proxy.handle_online_story_proxy(
            "GET", "/api/online-story/search?q=van+co&source=all", "client-truyenfull-search"
        )

        self.assertEqual(response.status, 200)
        self.assertEqual(response.payload["data"][0]["story_id"], "van-co-chi-ton")
        self.assertEqual(response.payload["data"][0]["title"], "Vạn Cổ Chí Tôn")
        self.assertEqual(request_get.call_args.args[0], "https://truyenfull.live/ajax.php")
        self.assertEqual(
            request_get.call_args.kwargs["params"],
            {"type": "quick_search", "str": "van co"},
        )

    @patch("online_story_proxy.requests.get")
    def test_truyenfull_story_loads_only_requested_and_last_chapter_pages(self, request_get):
        os.environ["ONLINE_STORY_UPSTREAM_BASE"] = "https://truyenfull.live"
        os.environ["ONLINE_STORY_PROVIDER"] = "truyenfull"
        first_page = """
            <h3 class="title" itemprop="name">Vạn Cổ Chí Tôn</h3>
            <a itemprop="author">Thái Nhất Sinh Thủy</a>
            <a href="https://truyenfull.live/van-co-chi-ton/chuong-1/" title="Vạn Cổ Chí Tôn - Chương 1: Mở đầu">1</a>
            <a href="https://truyenfull.live/van-co-chi-ton/chuong-2/" title="Vạn Cổ Chí Tôn - Chương 2: Thức tỉnh">2</a>
            <input id="total-page" type="hidden" value="2">
        """
        last_page = """
            <a href="https://truyenfull.live/van-co-chi-ton/chuong-51/" title="Chương 51: Cuối">51</a>
            <input id="total-page" type="hidden" value="2">
        """
        request_get.side_effect = [FakeResponse(first_page), FakeResponse(last_page)]

        response = proxy.handle_online_story_proxy(
            "GET", "/api/online-story/story?story=van-co-chi-ton&page=1&source=truyenfull",
            "client-truyenfull-story",
        )
        data = response.payload["data"]

        self.assertEqual(response.status, 200)
        self.assertTrue(data["paged"])
        self.assertEqual(data["chapter_pages"], 2)
        self.assertEqual(data["chapter_count"], 51)
        self.assertEqual(data["chapters"][0]["chapter_id"], "1")
        self.assertEqual(request_get.call_count, 2)

    @patch("online_story_proxy.requests.get")
    def test_truyenfull_chapter_extracts_paragraphs_and_navigation(self, request_get):
        os.environ["ONLINE_STORY_UPSTREAM_BASE"] = "https://truyenfull.live"
        os.environ["ONLINE_STORY_PROVIDER"] = "truyenfull"
        request_get.return_value = FakeResponse("""
            <a class="truyen-title">Vạn Cổ Chí Tôn</a>
            <h2><a class="chapter-title"><span class="chapter-text"><span>Chương </span></span>2044: Thiết khấu tử (2)</a></h2>
            <a id="prev_chap" href="https://truyenfull.live/van-co-chi-ton/chuong-2043/">Trước</a>
            <div id="chapter-c" class="chapter-c"><div id="ads-chapter-top"></div>
              Đoạn thứ nhất &amp; nội dung.<br><br>Đoạn thứ hai.
            <hr class="chapter-end">
            <a id="next_chap" href="https://truyenfull.live/van-co-chi-ton/chuong-2045/">Sau</a>
        """)

        response = proxy.handle_online_story_proxy(
            "GET",
            "/api/online-story/chapter?story=van-co-chi-ton&chapter=2044&source=truyenfull",
            "client-truyenfull-chapter",
        )
        data = response.payload["data"]

        self.assertEqual(response.status, 200)
        self.assertEqual(data["chapter_title"], "Chương 2044: Thiết khấu tử (2)")
        self.assertEqual(data["paragraphs"], ["Đoạn thứ nhất & nội dung.", "Đoạn thứ hai."])
        self.assertEqual(data["previous_chapter_id"], "2043")
        self.assertEqual(data["next_chapter_id"], "2045")


if __name__ == "__main__":
    unittest.main()
