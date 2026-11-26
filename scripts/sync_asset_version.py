"""Synchronize local JS/CSS URLs using version.json, without changing source code."""
import argparse
from html import escape, unescape
import json
import os
from pathlib import Path
import re
import stat
import tempfile
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parent.parent
ATTR = re.compile(r"(?<![\w:-])(src|href)(\s*=\s*)([\"'])(.*?)\3", re.IGNORECASE)
APP_VERSION = re.compile(r"\bdata-app-version\s*=\s*([\"']).*?\1", re.IGNORECASE)


def load_version(path):
    data = json.loads(Path(path).read_text(encoding="utf-8-sig"))
    version = data.get("version") if isinstance(data, dict) else None
    if not isinstance(version, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,127}", version):
        raise ValueError("version.json must contain a non-empty version using letters, digits, dots, underscores or hyphens")
    return version


def rewrite_html(text, version):
    def rewrite_tag(match):
        tag = match.group(0)
        version_checker = False

        def rewrite_attribute(attribute):
            nonlocal version_checker
            url = urlsplit(unescape(attribute.group(4)))
            if url.scheme or url.netloc or not url.path.lower().endswith((".js", ".css")):
                return attribute.group(0)
            version_checker |= url.path.rsplit("/", 1)[-1] == "version-check.js"
            pairs = parse_qsl(url.query, keep_blank_values=True)
            pairs = [(key, value) for key, value in pairs if key != "v"]
            pairs.append(("v", version))
            updated = urlunsplit(("", "", url.path, urlencode(pairs), url.fragment))
            return f'{attribute.group(1)}{attribute.group(2)}{attribute.group(3)}{escape(updated, quote=True)}{attribute.group(3)}'

        tag = ATTR.sub(rewrite_attribute, tag)
        if version_checker:
            if APP_VERSION.search(tag):
                tag = APP_VERSION.sub(f'data-app-version="{version}"', tag)
            else:
                tag = tag[:-1] + f' data-app-version="{version}">'
        return tag

    # Comments may contain examples: leave them untouched.
    return re.sub(r"<!--[\s\S]*?-->|<(?:script|link)\b[^>]*>",
                  lambda m: m.group(0) if m.group(0).startswith("<!--") else rewrite_tag(m),
                  text, flags=re.IGNORECASE)


def sync_versions(target=ROOT, version_file=None, check=False):
    target = Path(target).resolve()
    version = load_version(version_file or target / "version.json")
    pages = sorted(target.glob("*.html"))
    if not pages:
        raise ValueError(f"No HTML pages found in {target}")
    changes = []
    for page in pages:
        original = page.read_bytes()
        updated = rewrite_html(original.decode("utf-8"), version).encode("utf-8")
        if original != updated:
            changes.append((page, updated))
    if not check:
        for page, updated in changes:
            # Preserve permissions and existing cPanel files; replace only HTML.
            mode = stat.S_IMODE(page.stat().st_mode)
            with tempfile.NamedTemporaryFile(dir=target, prefix=".asset-version-", delete=False) as handle:
                temporary = Path(handle.name)
                handle.write(updated)
            try:
                os.chmod(temporary, mode)
                temporary.replace(page)
            finally:
                if temporary.exists():
                    temporary.unlink()
    return version, [page for page, _ in changes]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target", type=Path, default=ROOT, help="HTML directory (also contains version.json)")
    parser.add_argument("--check", action="store_true", help="Check without writing; exit 1 if pages are out of date")
    args = parser.parse_args()
    try:
        version, changes = sync_versions(args.target, check=args.check)
    except (ValueError, OSError) as error:
        parser.exit(2, f"Version sync failed: {error}\n")
    print(f"Version {version}: {len(changes)} HTML page(s) {'need updating' if args.check else 'updated'}")
    return int(args.check and bool(changes))


if __name__ == "__main__":
    raise SystemExit(main())
