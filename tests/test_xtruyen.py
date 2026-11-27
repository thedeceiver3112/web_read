import base64
import json
import os
import unittest
import zlib
from unittest.mock import patch

import online_story_proxy as proxy
import online_story_xtruyen as x


def chapter_html(body):
    data = base64.b64encode(zlib.compress(body.encode())).decode().translate(str.maketrans(x.STANDARD_ALPHABET, x.ALPHABET))
    return '<script>window.readingChapterConfig = {encodedData: ' + json.dumps(data) + '};</script><div data-seo-preview="1">Only a preview...</div>'


def story_html():
    return '''<h1>Book</h1><a href="/tacgia/author/">Author</a>
    <script>var manga={"manga_id":"123"};</script>
    <li class="has-child" data-value="1-to-100"></li>
    <li class="has-child" data-value="101-to-101m"><div class="ch-to">Chương 103 ++</div></li>'''


class XTruyenTests(unittest.TestCase):
    def test_full_content_preserves_every_paragraph_and_inline_text(self):
        html = '<p>Đầu <em>chương</em> &amp; tiếp.</p>' + ''.join(f'<p>Đoạn {n}.</p>' for n in range(130)) + '<p>Cuối chương.</p>'
        result = x.decode_chapter(chapter_html(html))
        self.assertEqual(result, ['Đầu chương & tiếp.'] + [f'Đoạn {n}.' for n in range(130)] + ['Cuối chương.'])
        self.assertNotIn('Only a preview', ''.join(result))

    def test_corrupt_or_truncated_payload_never_returns_preview(self):
        for html in ['<div data-seo-preview="1">Partial text</div>', '<script>encodedData:"invalid!"</script>', chapter_html('<p>Text</p>').replace('encodedData:', 'other:')]:
            with self.subTest(html=html), self.assertRaises(RuntimeError):
                x.decode_chapter(html)

    def test_truncated_zlib_and_expansion_limit_are_rejected(self):
        raw = zlib.compress(b'<p>hello</p>')[:-2]
        encoded = base64.b64encode(raw).decode().translate(str.maketrans(x.STANDARD_ALPHABET, x.ALPHABET))
        with self.assertRaises(RuntimeError):
            x.decode_chapter('encodedData:' + json.dumps(encoded))
        with patch.object(x, 'MAX_BYTES', 20), self.assertRaises(RuntimeError):
            x.decode_chapter(chapter_html('<p>' + 'a' * 500 + '</p>'))
        with self.assertRaises(RuntimeError):
            x.decode_chapter(chapter_html('<div data-seo-preview="1">Partial</div>'))

    def test_nonparagraph_and_nested_blocks_keep_narrative(self):
        self.assertEqual(x._paragraphs('Mở<div><p>Một <b>hai</b></p><p>Ba<br>Bốn</p></div>Kết<script>bad()</script><div class="aam-ad">Ad</div>'), ['Mở', 'Một hai', 'Ba', 'Bốn', 'Kết'])

    @patch.object(x, '_request')
    def test_search_filters_author_external_links_and_decorations(self, request):
        request.return_value = json.dumps({'success': True, 'data': [
            {'title': 'Mao Sơn (4143 chương) FULL', 'url': 'https://xtruyen.vn/truyen/mao-son/'},
            {'title': 'Tác giả', 'url': 'https://xtruyen.vn/tacgia/author'},
            {'title': 'External', 'url': 'https://evil.test/truyen/evil/'},
            {'title': 'Again', 'url': 'https://xtruyen.vn/truyen/mao-son/'},
        ]})
        result = x.fetch_xtruyen('search', {'q': 'mao sơn'})
        self.assertEqual(len(result['data']), 1)
        self.assertEqual(result['data'][0]['title'], 'Mao Sơn')
        self.assertEqual(result['data'][0]['source'], 'xtruyen')
        self.assertEqual(request.call_args.args[0], '/wp-admin/admin-ajax.php')
        self.assertEqual(request.call_args.args[1], {'action': 'wp-manga-search-manga', 'title': 'mao sơn'})

    @patch.object(x, '_request')
    def test_paged_toc_loads_actual_ids_and_last_group_without_guessing(self, request):
        request.side_effect = [story_html(), json.dumps([{'s': f'chuong-{n}', 'n': f'Chương {n}', 'e': 'Tên'} for n in range(101, 104)])]
        data = x.fetch_xtruyen('story', {'story': 'book', 'page': '2'})['data']
        self.assertEqual((data['chapter_count'], data['chapter_pages'], data['chapter_page_size']), (103, 2, 100))
        self.assertEqual([c['chapter_id'] for c in data['chapters']], ['chuong-101', 'chuong-102', 'chuong-103'])
        self.assertEqual(request.call_args.args[1], {'manga_id': '123', 'from': '101', 'to': '103', 'vol': '0'})

    @patch.object(x, '_request')
    def test_incomplete_duplicate_or_unsafe_toc_is_rejected(self, request):
        for items in [[{'s': 'chuong-101'}], [{'s': 'chuong-101'}] * 3, [{'s': '../escape'}] * 3]:
            request.side_effect = [story_html(), json.dumps(items)]
            with self.assertRaises(RuntimeError):
                x.fetch_xtruyen('story', {'story': 'book', 'page': '2'})

    @patch.object(x, '_request')
    def test_paths_cannot_escape_fixed_provider(self, request):
        for value in ['../book', 'https://evil.test', 'book?next=evil', '//evil']:
            with self.assertRaises(RuntimeError):
                x.fetch_xtruyen('story', {'story': value})
        request.assert_not_called()

    @patch('online_story_proxy.fetch_xtruyen')
    @patch('online_story_proxy._fetch_truyenfull')
    def test_search_backup_only_when_primary_fails_or_is_empty(self, primary, backup):
        backup.return_value = {'success': True, 'data': [{'source': 'xtruyen'}]}
        with patch.dict(os.environ, {'ONLINE_STORY_UPSTREAM_BASE': 'https://truyenfull.live', 'ONLINE_STORY_PROVIDER': 'truyenfull'}):
            for failure in [
                RuntimeError('upstream_http_403'),
                RuntimeError('upstream_http_502'),
                RuntimeError('upstream_blocked'),
                proxy.requests.Timeout('primary timed out'),
                proxy.requests.ConnectionError('connection refused'),
                ValueError('invalid response'),
                None,
            ]:
                primary.side_effect = failure
                primary.return_value = {'success': True, 'data': []}
                result = proxy._fetch_upstream('search', {'q': 'book', 'source': 'all'})
                self.assertTrue(result['backup'])
                self.assertEqual(result['data'][0]['source'], 'xtruyen')
            self.assertEqual(backup.call_count, 7)
            backup.reset_mock()
            primary.return_value = {'success': True, 'data': [{'source': 's1'}]}
            result = proxy._fetch_upstream('search', {'q': 'book', 'source': 'all'})
            self.assertEqual(result['data'][0]['source'], 's1')
            backup.assert_not_called()

    @patch('online_story_proxy.fetch_xtruyen')
    @patch('online_story_proxy._fetch_truyenfull', side_effect=RuntimeError('upstream_unavailable'))
    def test_never_silently_swaps_a_chapter_by_its_number(self, primary, backup):
        with patch.dict(os.environ, {'ONLINE_STORY_UPSTREAM_BASE': 'https://truyenfull.live', 'ONLINE_STORY_PROVIDER': 'truyenfull'}), self.assertRaises(RuntimeError):
            proxy._fetch_upstream('chapter', {'story': 'book', 'chapter': '10', 'source': 's1'})
        backup.assert_not_called()


if __name__ == '__main__':
    unittest.main()
