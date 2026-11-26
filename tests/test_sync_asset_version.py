import json
from pathlib import Path
import stat
import tempfile
import unittest

from scripts.sync_asset_version import rewrite_html, sync_versions


class AssetVersionTests(unittest.TestCase):
    def test_local_assets_queries_fragments_and_checker(self):
        html = '''<script src="app.js?v=old"></script>
<link href='css/reader.css?mode=light&amp;v=old#sheet'>
<script src="version-check.js?v=old" data-app-version='old'></script>
<script src="/admin-analytics.js"></script>'''
        result = rewrite_html(html, "20261126.1")
        self.assertIn('app.js?v=20261126.1', result)
        self.assertIn('css/reader.css?mode=light&amp;v=20261126.1#sheet', result)
        self.assertIn('data-app-version="20261126.1"', result)
        self.assertIn('/admin-analytics.js?v=20261126.1', result)
        self.assertEqual(rewrite_html(result, "20261126.1"), result)

    def test_external_urls_images_and_comments_are_not_changed(self):
        html = '''<script src="https://cdn.example/app.js?v=keep"></script>
<link href="//fonts.example/style.css?v=keep">
<img src="static/icon.png?v=keep">
<!-- <script src="example.js?v=keep"></script> -->'''
        self.assertEqual(html, rewrite_html(html, "new"))

    def test_target_generation_preserves_files_permissions_and_line_endings(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "version.json").write_text(json.dumps({"version": "release-2"}))
            page = root / "index.html"
            original = b'<script src="version-check.js?v=old"></script>\r\n'
            page.write_bytes(original)
            mode = stat.S_IMODE(page.stat().st_mode)
            (root / ".htaccess").write_text("PassengerEnabled on\n")
            self.assertEqual(len(sync_versions(root, check=True)[1]), 1)
            self.assertEqual(page.read_bytes(), original)
            self.assertEqual(len(sync_versions(root)[1]), 1)
            self.assertIn(b'data-app-version="release-2"', page.read_bytes())
            self.assertTrue(page.read_bytes().endswith(b"\r\n"))
            self.assertEqual(stat.S_IMODE(page.stat().st_mode), mode)
            self.assertEqual((root / ".htaccess").read_text(), "PassengerEnabled on\n")
            self.assertEqual(sync_versions(root)[1], [])

    def test_invalid_version_fails_before_writing_html(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "version.json").write_text('{"version":"bad\\\"version"}')
            page = root / "index.html"
            page.write_text('<script src="app.js?v=old"></script>')
            original = page.read_bytes()
            with self.assertRaises(ValueError):
                sync_versions(root)
            self.assertEqual(page.read_bytes(), original)


if __name__ == "__main__":
    unittest.main()
