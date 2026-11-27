<?php
declare(strict_types=1);

// Isolated provider: the caller owns dispatch, caching and response serialization.
function online_story_xtruyen_limit(): int
{
    return defined('MAX_STORY_RESPONSE_BODY') ? (int)constant('MAX_STORY_RESPONSE_BODY') : 5242880;
}

function online_story_xtruyen_invalid(): never
{
    throw new RuntimeException('invalid_upstream_response');
}

function online_story_xtruyen_slug(string $slug): string
{
    if (strlen($slug) > 200 || !preg_match('/\A[a-z0-9]+(?:-[a-z0-9]+)*\z/D', $slug)) {
        online_story_xtruyen_invalid();
    }
    return $slug;
}

/** Accept only canonical, same-host public paths; never follow a supplied URL. */
function online_story_xtruyen_path(string $url): ?string
{
    $parts = parse_url($url);
    if ($parts === false || isset($parts['user'])
        || isset($parts['pass']) || isset($parts['port']) || isset($parts['query']) || isset($parts['fragment'])) {
        return null;
    }
    if (isset($parts['host'])) {
        if (strtolower($parts['host']) !== 'xtruyen.vn'
            || (isset($parts['scheme']) && strtolower($parts['scheme']) !== 'https')) {
            return null;
        }
    } elseif (isset($parts['scheme']) || !str_starts_with($url, '/') || str_starts_with($url, '//')) {
        return null;
    }
    $path = $parts['path'] ?? '';
    return preg_match('~\A/truyen/[a-z0-9]+(?:-[a-z0-9]+)*(?:/[a-z0-9]+(?:-[a-z0-9]+)*)?/?\z~D', $path)
        ? $path : null;
}

function online_story_xtruyen_request(array $config, string $path, array $post = []): string
{
    $isSearch = $path === '/wp-admin/admin-ajax.php';
    $isToc = $path === '/api/api-chapters.php';
    if ((!$isSearch && !$isToc && online_story_xtruyen_path($path) !== $path)
        || (($isSearch || $isToc) !== ($post !== []))) {
        online_story_xtruyen_invalid();
    }
    $body = '';
    $curl = curl_init('https://xtruyen.vn' . $path);
    if ($curl === false) {
        throw new RuntimeException('upstream_unavailable');
    }
    $headers = ['Accept: application/json,text/html;q=0.9', 'User-Agent: Mozilla/5.0',
        'Referer: https://xtruyen.vn/'];
    if ($isSearch || $isToc) {
        $headers[] = 'X-Requested-With: XMLHttpRequest';
    }
    if ($isToc) {
        // Public header used by the site's own chapter-list client.
        $headers[] = 'X-Custom-Auth: abC0000011111';
    }
    $options = [
        CURLOPT_CONNECTTIMEOUT => 4, CURLOPT_TIMEOUT => 20,
        CURLOPT_FOLLOWLOCATION => false, CURLOPT_MAXREDIRS => 0,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
        CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_WRITEFUNCTION => static function ($handle, string $chunk) use (&$body): int {
            if (strlen($body) + strlen($chunk) > online_story_xtruyen_limit()) {
                return 0;
            }
            $body .= $chunk;
            return strlen($chunk);
        },
    ];
    if ($post !== []) {
        $options[CURLOPT_POST] = true;
        $options[CURLOPT_POSTFIELDS] = http_build_query($post, '', '&', PHP_QUERY_RFC3986);
    }
    $ca = trim((string)($config['online_story_ca_bundle'] ?? getenv('ONLINE_STORY_CA_BUNDLE') ?: ''));
    if ($ca !== '') {
        if (!is_file($ca) || !is_readable($ca)) {
            curl_close($curl);
            throw new RuntimeException('upstream_unavailable');
        }
        $options[CURLOPT_CAINFO] = $ca;
    }
    try {
        curl_setopt_array($curl, $options);
        $ok = curl_exec($curl);
        $status = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);
    } finally {
        curl_close($curl);
    }
    if ($ok === false || $status !== 200) {
        throw new RuntimeException('upstream_unavailable', $status);
    }
    return $body;
}

function online_story_xtruyen_dom(string $html): DOMDocument
{
    if ($html === '' || strlen($html) > online_story_xtruyen_limit() || !preg_match('//u', $html)) {
        online_story_xtruyen_invalid();
    }
    $previous = libxml_use_internal_errors(true);
    try {
        $dom = new DOMDocument();
        // No DTD loading, entity substitution, script execution or external I/O.
        if (!$dom->loadHTML('<?xml encoding="UTF-8">' . $html, LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING)) {
            online_story_xtruyen_invalid();
        }
        return $dom;
    } finally {
        libxml_clear_errors();
        libxml_use_internal_errors($previous);
    }
}

function online_story_xtruyen_text(string $text): string
{
    return trim((string)preg_replace('/[\s\x{00a0}]+/u', ' ', $text));
}

function online_story_xtruyen_label(string $html): string
{
    return online_story_xtruyen_text(online_story_xtruyen_dom($html)->textContent);
}

function online_story_xtruyen_json(string $body): array
{
    if (strlen($body) > online_story_xtruyen_limit()) {
        online_story_xtruyen_invalid();
    }
    try {
        $value = json_decode($body, true, 64, JSON_THROW_ON_ERROR);
    } catch (JsonException $e) {
        online_story_xtruyen_invalid();
    }
    if (!is_array($value)) {
        online_story_xtruyen_invalid();
    }
    return $value;
}

function online_story_xtruyen_search(string $body): array
{
    $payload = online_story_xtruyen_json($body);
    $shape = json_decode($body);
    if (!is_object($shape) || !is_array($shape->data ?? null)
        || ($payload['success'] ?? null) !== true || !is_array($payload['data'] ?? null) || !array_is_list($payload['data'])) {
        online_story_xtruyen_invalid();
    }
    $items = $seen = [];
    foreach ($payload['data'] as $row) {
        if (!is_array($row) || ($row['type'] ?? '') !== 'text' || !is_string($row['url'] ?? null)
            || !is_string($row['title'] ?? null)) {
            continue;
        }
        $path = online_story_xtruyen_path($row['url']);
        if ($path === null || !preg_match('~\A/truyen/([^/]+)/?\z~D', $path, $m) || isset($seen[$m[1]])) {
            continue;
        }
        $slug = online_story_xtruyen_slug($m[1]);
        $title = online_story_xtruyen_label($row['title']);
        $count = 0;
        if (preg_match('/\s*\(([0-9]{1,8})\s+chương\)\s*(?:FULL)?\s*$/iu', $title, $suffix)) {
            $count = (int)$suffix[1];
            $title = trim(substr($title, 0, -strlen($suffix[0])));
        }
        if ($title === '') {
            continue;
        }
        $seen[$slug] = true;
        $items[] = ['source' => 'xtruyen', 'story_id' => $slug, 'title' => $title, 'author' => '',
            'latest_chapter' => $count > 0 ? 'Chương ' . $count : '', 'chapter_count' => $count];
    }
    return ['success' => true, 'total' => count($items), 'data' => $items];
}

/** Read a JSON string literal from a JS property, without evaluating JavaScript. */
function online_story_xtruyen_js_string(string $object, string $key): string
{
    $literal = '"(?:[^"\\\\\x00-\x1f]|\\\\.)*"';
    if (!preg_match('~(?:\{|,)\s*(?:"' . preg_quote($key, '~') . '"|' . preg_quote($key, '~') . ')\s*:\s*(' . $literal . ')~s', $object, $m)) {
        online_story_xtruyen_invalid();
    }
    try {
        $value = json_decode($m[1], true, 8, JSON_THROW_ON_ERROR);
    } catch (JsonException $e) {
        online_story_xtruyen_invalid();
    }
    if (!is_string($value) || $value === '') {
        online_story_xtruyen_invalid();
    }
    return $value;
}

function online_story_xtruyen_script_object(DOMDocument $dom, string $name): string
{
    foreach ($dom->getElementsByTagName('script') as $script) {
        if (!$script->hasAttribute('src') && preg_match('~\b(?:window\.)?' . preg_quote($name, '~') . '\s*=\s*(\{.*)~s', $script->textContent, $m)) {
            return $m[1];
        }
    }
    online_story_xtruyen_invalid();
}

function online_story_xtruyen_story_metadata(string $html, string $storyId, int $page): array
{
    online_story_xtruyen_slug($storyId);
    $dom = online_story_xtruyen_dom($html);
    $xp = new DOMXPath($dom);
    $titles = $xp->query('//h1[contains(concat(" ",normalize-space(@class)," ")," post-title ")] | //*[contains(concat(" ",normalize-space(@class)," ")," post-title ")]//h1');
    $title = online_story_xtruyen_text($titles->item(0)?->textContent ?? '');
    $manga = online_story_xtruyen_json(online_story_xtruyen_manga_json($dom));
    $id = $manga['manga_id'] ?? null;
    if ($title === '' || (!is_string($id) && !is_int($id)) || !preg_match('/\A[1-9][0-9]{0,11}\z/D', (string)$id)) {
        online_story_xtruyen_invalid();
    }
    $author = '';
    foreach ($xp->query('//a[@href]') as $a) {
        if (preg_match('~\A(?:https://xtruyen\.vn)?/tacgia/[A-Za-z0-9_-]+/\z~D', $a->getAttribute('href'))) {
            $author = online_story_xtruyen_text($a->textContent);
            break;
        }
    }
    $groups = [];
    foreach ($xp->query('//li[contains(concat(" ",normalize-space(@class)," ")," has-child ")]') as $node) {
        $range = $node->getAttribute('data-value');
        if (!preg_match('/\A([1-9][0-9]{0,7})-to-([1-9][0-9]{0,7})(m?)\z/D', $range, $m)) {
            online_story_xtruyen_invalid();
        }
        $from = (int)$m[1];
        $to = (int)$m[2];
        $terminal = $m[3] === 'm';
        if ($terminal) {
            $labels = $xp->query('.//*[contains(concat(" ",normalize-space(@class)," ")," ch-to ")]', $node);
            if ($labels->length !== 1 || !preg_match('/\AChương\s+([1-9][0-9]{0,7})\s*(?:\+\+)?\z/iu', online_story_xtruyen_text($labels->item(0)->textContent), $label)) {
                online_story_xtruyen_invalid();
            }
            $to = (int)$label[1];
        }
        $previous = $groups ? $groups[count($groups) - 1] : null;
        if ($from !== count($groups) * 100 + 1 || $to < $from || $to > $from + 99
            || ($previous !== null && ($previous['to'] !== $from - 1 || $previous['terminal']))) {
            online_story_xtruyen_invalid();
        }
        $groups[] = ['from' => $from, 'to' => $to, 'node' => $node, 'terminal' => $terminal];
    }
    if (!$groups || $page < 1 || $page > count($groups)) {
        online_story_xtruyen_invalid();
    }
    $selected = $groups[$page - 1];
    $chapters = [];
    foreach ($xp->query('.//li[contains(concat(" ",normalize-space(@class)," ")," wp-manga-chapter ")]/a[@href]', $selected['node']) as $a) {
        $path = online_story_xtruyen_path($a->getAttribute('href'));
        if ($path === null || !preg_match('~\A/truyen/' . preg_quote($storyId, '~') . '/([^/]+)/?\z~D', $path, $m)) {
            online_story_xtruyen_invalid();
        }
        $chapters[] = ['chapter_id' => online_story_xtruyen_slug($m[1]), 'title' => online_story_xtruyen_text($a->textContent)];
    }
    return ['source' => 'xtruyen', 'story_id' => $storyId, 'title' => $title, 'author' => $author,
        'chapters' => $chapters, 'paged' => true, 'chapter_page' => $page, 'chapter_pages' => count($groups),
        'chapter_page_size' => 100, 'chapter_count' => $groups[count($groups) - 1]['to'],
        '_manga_id' => (string)$id, '_from' => $selected['from'], '_to' => $selected['to']];
}

function online_story_xtruyen_manga_json(DOMDocument $dom): string
{
    foreach ($dom->getElementsByTagName('script') as $script) {
        if (!$script->hasAttribute('src') && preg_match('~\b(?:var\s+|window\.)manga\s*=\s*(\{[^;]*\})\s*;~s', $script->textContent, $m)) {
            return $m[1];
        }
    }
    online_story_xtruyen_invalid();
}

function online_story_xtruyen_toc(string $json): array
{
    $rows = online_story_xtruyen_json($json);
    if (!str_starts_with(ltrim($json), '[') || !array_is_list($rows)) {
        online_story_xtruyen_invalid();
    }
    $chapters = [];
    foreach ($rows as $row) {
        if (!is_array($row) || !is_string($row['s'] ?? null) || !is_string($row['n'] ?? null)
            || !is_string($row['e'] ?? null)) {
            online_story_xtruyen_invalid();
        }
        $name = online_story_xtruyen_label($row['n']);
        $extension = $row['e'] === '' ? '' : online_story_xtruyen_label($row['e']);
        $chapters[] = ['chapter_id' => online_story_xtruyen_slug($row['s']),
            'title' => $name . ($extension !== '' ? ': ' . $extension : '')];
    }
    return $chapters;
}

/** Numeric single-volume lists only. Do not infer missing rows or chapter URLs. */
function online_story_xtruyen_validate_chapters(array $chapters, int $from, int $to): array
{
    if (count($chapters) !== $to - $from + 1) {
        online_story_xtruyen_invalid();
    }
    $seen = [];
    foreach ($chapters as $chapter) {
        if (!preg_match('/\Achuong-([1-9][0-9]{0,7})\z/D', $chapter['chapter_id'], $m)
            || (int)$m[1] < $from || (int)$m[1] > $to || isset($seen[$chapter['chapter_id']]) || $chapter['title'] === '') {
            online_story_xtruyen_invalid();
        }
        $seen[$chapter['chapter_id']] = true;
    }
    usort($chapters, static fn(array $a, array $b): int => (int)substr($a['chapter_id'], 7) <=> (int)substr($b['chapter_id'], 7));
    return $chapters;
}

function online_story_xtruyen_decode(string $encoded): string
{
    if ($encoded === '' || strlen($encoded) > online_story_xtruyen_limit()
        || !preg_match('/\A[A-Za-z0-9_-]+={0,2}\z/D', $encoded) || strlen($encoded) % 4 === 1) {
        online_story_xtruyen_invalid();
    }
    $standard = strtr($encoded, 'pNRzya673WkGnLJofwlDOEuhv4Q_CSiAxt0VgBH2d-PZsXMU8Ijbcre19qmF5KTY',
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/');
    $binary = base64_decode($standard, true);
    if ($binary === false || rtrim(base64_encode($binary), '=') !== rtrim($standard, '=')) {
        online_story_xtruyen_invalid();
    }
    $html = @gzuncompress($binary, online_story_xtruyen_limit());
    if (!is_string($html) || $html === '' || strlen($html) > online_story_xtruyen_limit()) {
        online_story_xtruyen_invalid();
    }
    // gzuncompress accepts trailing bytes. Verify one complete zlib stream only;
    // its expansion has already passed the bounded decompression above.
    $stream = inflate_init(ZLIB_ENCODING_DEFLATE);
    if ($stream === false || @inflate_add($stream, $binary, ZLIB_FINISH) === false
        || inflate_get_status($stream) !== ZLIB_STREAM_END || inflate_get_read_len($stream) !== strlen($binary)) {
        online_story_xtruyen_invalid();
    }
    return $html;
}

function online_story_xtruyen_paragraphs(string $html): array
{
    $dom = online_story_xtruyen_dom($html);
    $xp = new DOMXPath($dom);
    if ($xp->query('//*[@data-seo-preview="1" or @id="chapter-seo-preview"]')->length > 0) {
        online_story_xtruyen_invalid();
    }
    $root = $xp->query('//*[@id="chapter-reading-content"]')->item(0) ?? $dom->getElementsByTagName('body')->item(0);
    if ($root === null) {
        online_story_xtruyen_invalid();
    }
    $paragraphs = [];
    $buffer = '';
    $flush = static function () use (&$buffer, &$paragraphs): void {
        $text = online_story_xtruyen_text($buffer);
        if ($text !== '') {
            $paragraphs[] = $text;
        }
        $buffer = '';
    };
    $walk = static function (DOMNode $node) use (&$walk, &$buffer, $flush): void {
        if ($node instanceof DOMText) {
            $buffer .= $node->textContent;
            return;
        }
        if (!($node instanceof DOMElement)) {
            return;
        }
        $tag = strtolower($node->tagName);
        if (in_array($tag, ['script', 'style', 'iframe', 'noscript', 'template', 'object', 'embed', 'button'], true)
            || in_array('xt-story-group-section', preg_split('/\s+/', $node->getAttribute('class')), true)
            || preg_match('/(?:^|[\s_-])(?:ads?|adsbygoogle|advertisement|advertising|aam)(?:$|[\s_-])/i', $node->getAttribute('class') . ' ' . $node->getAttribute('id'))) {
            return;
        }
        if ($tag === 'br') {
            $flush();
            return;
        }
        $block = in_array($tag, ['p', 'div', 'section', 'article', 'blockquote', 'li', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'hr', 'pre', 'table', 'tr'], true);
        if ($block) {
            $flush();
        }
        foreach ($node->childNodes as $child) {
            $walk($child);
        }
        if ($block) {
            $flush();
        }
    };
    $walk($root);
    $flush();
    if (!$paragraphs) {
        online_story_xtruyen_invalid();
    }
    return $paragraphs;
}

function online_story_xtruyen_chapter(string $html, string $storyId, string $chapterId): array
{
    online_story_xtruyen_slug($storyId);
    online_story_xtruyen_slug($chapterId);
    $dom = online_story_xtruyen_dom($html);
    $config = online_story_xtruyen_script_object($dom, 'chapterConfig');
    if (online_story_xtruyen_js_string($config, 'novelSlug') !== $storyId) {
        online_story_xtruyen_invalid();
    }
    $novelTitle = online_story_xtruyen_text(online_story_xtruyen_js_string($config, 'novelTitle'));
    $chapterTitle = online_story_xtruyen_text(online_story_xtruyen_js_string($config, 'chapterTitle'));
    if ($novelTitle === '' || $chapterTitle === '') {
        online_story_xtruyen_invalid();
    }
    $reading = online_story_xtruyen_script_object($dom, 'readingChapterConfig');
    $paragraphs = online_story_xtruyen_paragraphs(online_story_xtruyen_decode(online_story_xtruyen_js_string($reading, 'encodedData')));
    return ['success' => true, 'data' => ['source' => 'xtruyen', 'story_id' => $storyId, 'chapter_id' => $chapterId,
        'truyen_title' => $novelTitle, 'chapter_title' => $chapterTitle, 'total_lines' => count($paragraphs), 'paragraphs' => $paragraphs]];
}

function online_story_fetch_xtruyen(array $config, string $action, array $params): array
{
    if (!in_array($action, ['search', 'story', 'chapter'], true)) {
        online_story_xtruyen_invalid();
    }
    if ($action === 'search') {
        $query = $params['q'] ?? null;
        if (!is_string($query) || trim($query) === '' || strlen($query) > 300 || preg_match('/[\x00-\x1f\x7f]/', $query)) {
            online_story_xtruyen_invalid();
        }
        return online_story_xtruyen_search(online_story_xtruyen_request($config, '/wp-admin/admin-ajax.php',
            ['action' => 'wp-manga-search-manga', 'title' => trim($query)]));
    }
    if (!is_string($params['story'] ?? null)) {
        online_story_xtruyen_invalid();
    }
    $story = online_story_xtruyen_slug($params['story']);
    if ($action === 'chapter') {
        if (!is_string($params['chapter'] ?? null)) {
            online_story_xtruyen_invalid();
        }
        $chapter = online_story_xtruyen_slug($params['chapter']);
        return online_story_xtruyen_chapter(online_story_xtruyen_request($config, '/truyen/' . $story . '/' . $chapter . '/'), $story, $chapter);
    }
    $page = $params['page'] ?? 1;
    if ((!is_int($page) && !is_string($page)) || !preg_match('/\A[1-9][0-9]{0,6}\z/D', (string)$page)) {
        online_story_xtruyen_invalid();
    }
    $data = online_story_xtruyen_story_metadata(online_story_xtruyen_request($config, '/truyen/' . $story . '/'), $story, (int)$page);
    if (!$data['chapters']) {
        $data['chapters'] = online_story_xtruyen_toc(online_story_xtruyen_request($config, '/api/api-chapters.php',
            ['manga_id' => $data['_manga_id'], 'from' => $data['_from'], 'to' => $data['_to'], 'vol' => 0]));
    }
    $data['chapters'] = online_story_xtruyen_validate_chapters($data['chapters'], $data['_from'], $data['_to']);
    unset($data['_manga_id'], $data['_from'], $data['_to']);
    return ['success' => true, 'data' => $data];
}
