<?php
declare(strict_types=1);

const SESSION_COOKIE = 'sr_session';
const OAUTH_STATE_COOKIE = 'sr_oauth_state';
const SESSION_DAYS = 30;
const MAX_JSON_BODY = 524288;
const MAX_STORY_RESPONSE_BODY = 5242880;
const STORY_PROXY_RATE_LIMIT = 120;
const DEFAULT_ANALYTICS_ADMIN_EMAILS = ['nguyentranhaiphong2@gmail.com'];

header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('Cache-Control: no-store');

function config(): array
{
    $path = dirname(__DIR__, 2) . '/web_read_config.php';
    if (!is_file($path)) {
        return [];
    }
    $value = require $path;
    return is_array($value) ? $value : [];
}

function configured(array $config): bool
{
    foreach (['google_client_id', 'google_client_secret', 'google_redirect_uri', 'app_session_secret', 'db_host', 'db_name', 'db_user', 'db_password'] as $key) {
        if (trim((string)($config[$key] ?? '')) === '') {
            return false;
        }
    }
    return true;
}

function online_story_base(array $config): string
{
    $value = trim((string)($config['online_story_upstream_base'] ?? getenv('ONLINE_STORY_UPSTREAM_BASE') ?: ''));
    return rtrim($value, '/');
}

function online_story_proxy_configured(array $config): bool
{
    return online_story_base($config) !== '';
}

function online_story_provider(array $config): string
{
    $configured = strtolower(trim((string)($config['online_story_provider'] ?? getenv('ONLINE_STORY_PROVIDER') ?: '')));
    if ($configured !== '') {
        return $configured;
    }
    $host = strtolower((string)parse_url(online_story_base($config), PHP_URL_HOST));
    if ($host === 'truyenhh3d.com') {
        return 'hh3d';
    }
    return $host === 'truyenfull.live' ? 'truyenfull' : 'legacy';
}

function online_story_cache_path(string $action, array $params): string
{
    $directory = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'web_read_story_cache';
    if (!is_dir($directory)) {
        @mkdir($directory, 0700, true);
    }
    return $directory . DIRECTORY_SEPARATOR . hash('sha256', $action . '|' . json_encode($params)) . '.json';
}

function online_story_cache_get(string $action, array $params): ?array
{
    $path = online_story_cache_path($action, $params);
    if (!is_file($path)) {
        return null;
    }
    $cached = json_decode((string)@file_get_contents($path), true);
    if (!is_array($cached) || (int)($cached['expires'] ?? 0) <= time() || !is_array($cached['payload'] ?? null)) {
        @unlink($path);
        return null;
    }
    return $cached['payload'];
}

function online_story_cache_put(string $action, array $params, array $payload, int $ttl): void
{
    $path = online_story_cache_path($action, $params);
    $temporary = $path . '.' . bin2hex(random_bytes(4)) . '.tmp';
    $body = json_encode(['expires' => time() + $ttl, 'payload' => $payload], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (@file_put_contents($temporary, $body, LOCK_EX) !== false) {
        @rename($temporary, $path);
    }
    @unlink($temporary);
}

function online_story_rate_allowed(): bool
{
    $client = substr((string)($_SERVER['REMOTE_ADDR'] ?? 'unknown'), 0, 100);
    $path = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'web_read_story_rate_' . hash('sha256', $client) . '.json';
    $handle = @fopen($path, 'c+');
    if ($handle === false) {
        return true;
    }
    try {
        if (!flock($handle, LOCK_EX)) {
            return true;
        }
        $raw = stream_get_contents($handle);
        $events = json_decode($raw === false ? '[]' : $raw, true);
        $cutoff = microtime(true) - 60;
        $events = array_values(array_filter(is_array($events) ? $events : [], static function ($timestamp) use ($cutoff): bool {
            return is_numeric($timestamp) && (float)$timestamp >= $cutoff;
        }));
        if (count($events) >= STORY_PROXY_RATE_LIMIT) {
            flock($handle, LOCK_UN);
            return false;
        }
        $events[] = microtime(true);
        rewind($handle);
        ftruncate($handle, 0);
        fwrite($handle, json_encode($events));
        fflush($handle);
        flock($handle, LOCK_UN);
        return true;
    } finally {
        fclose($handle);
    }
}

function online_story_identifier_valid(string $value): bool
{
    return $value !== '' && strlen($value) <= 300 && !preg_match('/[\x00-\x1F\x7F]/', $value);
}

function online_story_request_json(array $config, string $url, array $params): array
{
    $body = '';
    $curl = curl_init($url . '?' . http_build_query($params));
    $curlOptions = [
        CURLOPT_CONNECTTIMEOUT => 4,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_HTTPHEADER => ['Accept: application/json', 'User-Agent: StealthReader/1.0'],
        CURLOPT_WRITEFUNCTION => static function ($handle, string $chunk) use (&$body): int {
            if (strlen($body) + strlen($chunk) > MAX_STORY_RESPONSE_BODY) {
                return 0;
            }
            $body .= $chunk;
            return strlen($chunk);
        },
    ];
    $caBundle = trim((string)($config['online_story_ca_bundle'] ?? getenv('ONLINE_STORY_CA_BUNDLE') ?: ''));
    if ($caBundle !== '' && is_file($caBundle)) {
        $curlOptions[CURLOPT_CAINFO] = $caBundle;
    }
    curl_setopt_array($curl, $curlOptions);
    $completed = curl_exec($curl);
    $status = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);

    if ($completed === false || $status !== 200) {
        throw new RuntimeException('upstream_unavailable', $status);
    }
    $payload = json_decode($body, true);
    if (!is_array($payload)) {
        throw new RuntimeException('invalid_upstream_response');
    }
    return $payload;
}

function online_story_request_text(array $config, string $url, array $params = []): string
{
    $body = '';
    $requestUrl = $url . ($params ? '?' . http_build_query($params) : '');
    $curl = curl_init($requestUrl);
    $curlOptions = [
        CURLOPT_CONNECTTIMEOUT => 4,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_HTTPHEADER => [
            'Accept: text/html,application/xhtml+xml',
            'Accept-Language: vi,en-US;q=0.8,en;q=0.7',
            'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/155.0 Safari/537.36',
        ],
        CURLOPT_WRITEFUNCTION => static function ($handle, string $chunk) use (&$body): int {
            if (strlen($body) + strlen($chunk) > MAX_STORY_RESPONSE_BODY) {
                return 0;
            }
            $body .= $chunk;
            return strlen($chunk);
        },
    ];
    $caBundle = trim((string)($config['online_story_ca_bundle'] ?? getenv('ONLINE_STORY_CA_BUNDLE') ?: ''));
    if ($caBundle !== '' && is_file($caBundle)) {
        $curlOptions[CURLOPT_CAINFO] = $caBundle;
    }
    curl_setopt_array($curl, $curlOptions);
    $completed = curl_exec($curl);
    $status = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);
    if ($completed === false || $status !== 200) {
        throw new RuntimeException('upstream_unavailable', $status);
    }
    return $body;
}

function online_story_html_text(string $html): string
{
    $html = (string)preg_replace('~<(script|style)\b[^>]*>.*?</\1>~is', ' ', $html);
    $html = (string)preg_replace('~<br\s*/?>~i', "\n", $html);
    $text = html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $text = str_replace("\xC2\xA0", ' ', $text);
    $text = (string)preg_replace('/[ \t\f\v]+/', ' ', $text);
    $text = (string)preg_replace('/\s*\R\s*/u', "\n", $text);
    return trim((string)preg_replace('/\n{3,}/', "\n\n", $text));
}

function online_story_html_attr(string $tag, string $name): string
{
    if (!preg_match('~\b' . preg_quote($name, '~') . '\s*=\s*(["\'])(.*?)\1~is', $tag, $match)) {
        return '';
    }
    return trim(html_entity_decode((string)$match[2], ENT_QUOTES | ENT_HTML5, 'UTF-8'));
}

function online_story_truyenfull_slug(string $value): string
{
    if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $value)) {
        throw new RuntimeException('invalid_upstream_response');
    }
    return $value;
}

function online_story_truyenfull_chapters(string $html, string $storyId): array
{
    $pattern = '~<a\b(?P<tag>[^>]*href=["\'](?:https://truyenfull\.live)?/'
        . preg_quote($storyId, '~')
        . '/chuong-(?P<chapter>\d+)/?["\'][^>]*)>(?P<body>.*?)</a>~is';
    preg_match_all($pattern, $html, $matches, PREG_SET_ORDER);
    $chapters = [];
    $seen = [];
    foreach ($matches as $match) {
        $chapterId = (string)$match['chapter'];
        if (isset($seen[$chapterId])) {
            continue;
        }
        $seen[$chapterId] = true;
        $title = online_story_html_attr((string)$match['tag'], 'title');
        $separator = strpos($title, ' - ');
        if ($separator !== false) {
            $title = substr($title, $separator + 3);
        }
        if ($title === '') {
            $title = online_story_html_text((string)$match['body']);
        }
        $chapters[] = [
            'title' => $title !== '' ? $title : 'Chương ' . $chapterId,
            'chapter_id' => $chapterId,
        ];
    }
    return $chapters;
}

function online_story_fetch_truyenfull(array $config, string $action, array $params, string $base): array
{
    if (strtolower((string)parse_url($base, PHP_URL_HOST)) !== 'truyenfull.live') {
        throw new RuntimeException('invalid_upstream_response');
    }
    $base = rtrim($base, '/');

    if ($action === 'search') {
        $html = online_story_request_text($config, $base . '/ajax.php', [
            'type' => 'quick_search',
            'str' => $params['q'],
        ]);
        preg_match_all('~<a\b(?P<tag>[^>]*)>(?P<body>.*?)</a>~is', $html, $matches, PREG_SET_ORDER);
        $items = [];
        $seen = [];
        foreach ($matches as $match) {
            $href = online_story_html_attr((string)$match['tag'], 'href');
            $host = strtolower((string)parse_url($href, PHP_URL_HOST));
            if ($host !== '' && $host !== 'truyenfull.live') {
                continue;
            }
            $path = $host !== '' ? (string)parse_url($href, PHP_URL_PATH) : $href;
            if (!preg_match('~^/([a-z0-9]+(?:-[a-z0-9]+)*)/?$~', $path, $slugMatch)) {
                continue;
            }
            $storyId = (string)$slugMatch[1];
            if (isset($seen[$storyId])) {
                continue;
            }
            $seen[$storyId] = true;
            $title = online_story_html_attr((string)$match['tag'], 'title');
            if ($title === '') {
                $title = online_story_html_text((string)$match['body']);
            }
            $items[] = [
                'source' => 's1',
                'story_id' => $storyId,
                'title' => $title !== '' ? $title : ucwords(str_replace('-', ' ', $storyId)),
                'author' => '',
                'latest_chapter' => '',
            ];
        }
        return ['success' => true, 'total' => count($items), 'data' => $items];
    }

    $storyId = online_story_truyenfull_slug((string)$params['story']);
    if ($action === 'story') {
        $requestedPage = max(1, (int)($params['page'] ?? 1));
        $path = $requestedPage === 1 ? '/' . $storyId . '/' : '/' . $storyId . '/trang-' . $requestedPage . '/';
        $html = online_story_request_text($config, $base . $path);
        preg_match('~<h3\b[^>]*class=["\'][^"\']*\btitle\b[^"\']*["\'][^>]*>(.*?)</h3>~is', $html, $titleMatch);
        preg_match('~<a\b[^>]*itemprop=["\']author["\'][^>]*>(.*?)</a>~is', $html, $authorMatch);
        preg_match('~<input\b[^>]*id=["\']total-page["\'][^>]*value=["\'](\d+)["\']~is', $html, $totalMatch);
        $pageCount = max(1, (int)($totalMatch[1] ?? 1));
        if ($requestedPage > $pageCount) {
            throw new RuntimeException('invalid_upstream_response');
        }
        $chapters = online_story_truyenfull_chapters($html, $storyId);
        if (!$chapters) {
            throw new RuntimeException('invalid_upstream_response');
        }
        $chapterCount = $requestedPage === $pageCount ? ($pageCount - 1) * 50 + count($chapters) : 0;
        if ($requestedPage === 1 && $pageCount > 1) {
            $lastHtml = online_story_request_text($config, $base . '/' . $storyId . '/trang-' . $pageCount . '/');
            $lastChapters = online_story_truyenfull_chapters($lastHtml, $storyId);
            if ($lastChapters) {
                $chapterCount = ($pageCount - 1) * 50 + count($lastChapters);
            }
        }
        $data = [
            'source' => 's1',
            'story_id' => $storyId,
            'title' => isset($titleMatch[1]) ? online_story_html_text((string)$titleMatch[1]) : ucwords(str_replace('-', ' ', $storyId)),
            'author' => isset($authorMatch[1]) ? online_story_html_text((string)$authorMatch[1]) : '',
            'chapters' => $chapters,
            'paged' => true,
            'chapter_page' => $requestedPage,
            'chapter_pages' => $pageCount,
            'chapter_page_size' => 50,
        ];
        if ($chapterCount > 0) {
            $data['chapter_count'] = $chapterCount;
        }
        return ['success' => true, 'data' => $data];
    }

    $chapterId = (string)$params['chapter'];
    if (!preg_match('/^\d{1,8}$/', $chapterId) || (int)$chapterId < 1) {
        throw new RuntimeException('invalid_upstream_response');
    }
    $html = online_story_request_text($config, $base . '/' . $storyId . '/chuong-' . $chapterId . '/');
    if (!preg_match('~<div\b[^>]*id=["\']chapter-c["\'][^>]*>(.*?)<hr\b[^>]*class=["\'][^"\']*chapter-end~is', $html, $contentMatch)) {
        throw new RuntimeException('invalid_upstream_response');
    }
    $content = (string)preg_replace('~<div\b[^>]*id=["\']ads-chapter-top["\'][^>]*>.*?</div>~is', '', (string)$contentMatch[1]);
    $parts = preg_split('~(?:<br\s*/?>\s*){2,}~is', $content) ?: [];
    $paragraphs = [];
    foreach ($parts as $part) {
        $text = online_story_html_text((string)$part);
        if ($text !== '') {
            $paragraphs[] = $text;
        }
    }
    if (!$paragraphs) {
        throw new RuntimeException('invalid_upstream_response');
    }
    preg_match('~<a\b[^>]*class=["\'][^"\']*chapter-title[^"\']*["\'][^>]*>(.*?)</a>~is', $html, $chapterTitleMatch);
    preg_match('~<a\b[^>]*class=["\'][^"\']*truyen-title[^"\']*["\'][^>]*>(.*?)</a>~is', $html, $storyTitleMatch);
    $data = [
        'source' => 's1',
        'story_id' => $storyId,
        'chapter_id' => $chapterId,
        'truyen_title' => isset($storyTitleMatch[1]) ? online_story_html_text((string)$storyTitleMatch[1]) : ucwords(str_replace('-', ' ', $storyId)),
        'chapter_title' => isset($chapterTitleMatch[1]) ? online_story_html_text((string)$chapterTitleMatch[1]) : 'Chương ' . $chapterId,
        'total_lines' => count($paragraphs),
        'paragraphs' => $paragraphs,
    ];
    foreach (['previous_chapter_id' => 'prev_chap', 'next_chapter_id' => 'next_chap'] as $key => $elementId) {
        if (preg_match('~<a\b(?=[^>]*\bid=["\']' . $elementId . '["\'])[^>]*>~is', $html, $tagMatch)) {
            $href = online_story_html_attr((string)$tagMatch[0], 'href');
            if (preg_match('~/chuong-(\d+)/?~', $href, $navigationMatch)) {
                $data[$key] = (string)$navigationMatch[1];
            }
        }
    }
    return ['success' => true, 'data' => $data];
}

function online_story_fetch_hh3d(array $config, string $action, array $params, string $base): array
{
    if ($action === 'search') {
        $upstream = online_story_request_json($config, $base . '/api/suggest', ['q' => $params['q']]);
        if (!is_array($upstream['items'] ?? null)) {
            throw new RuntimeException('invalid_upstream_response');
        }
        $items = [];
        foreach ($upstream['items'] as $item) {
            if (!is_array($item) || trim((string)($item['slug'] ?? '')) === '') {
                continue;
            }
            $chapterCount = max(0, (int)($item['chapters'] ?? 0));
            $items[] = [
                'source' => 'hh3d',
                'story_id' => (string)$item['slug'],
                'title' => (string)($item['title'] ?? 'Chưa có tên'),
                'author' => (string)($item['author'] ?? ''),
                'latest_chapter' => $chapterCount > 0 ? 'Chương ' . $chapterCount : '',
                'chapter_count' => $chapterCount,
            ];
        }
        return ['success' => true, 'total' => count($items), 'data' => $items];
    }

    $chapterId = (string)($params['chapter'] ?? '1');
    $upstream = online_story_request_json(
        $config,
        $base . '/api/doc-len/chuong',
        ['slug' => $params['story'], 'idx' => $chapterId]
    );
    if (($upstream['ok'] ?? false) !== true) {
        throw new RuntimeException('invalid_upstream_response');
    }
    $total = max(0, (int)($upstream['total'] ?? 0));
    $novel = is_array($upstream['novel'] ?? null) ? $upstream['novel'] : [];

    if ($action === 'story') {
        $chapters = [];
        for ($index = 1; $index <= $total; $index++) {
            $chapters[] = ['title' => 'Chương ' . $index, 'chapter_id' => (string)$index];
        }
        return ['success' => true, 'data' => [
            'source' => 'hh3d',
            'story_id' => $params['story'],
            'title' => (string)($novel['title'] ?? $params['story']),
            'author' => (string)($novel['author'] ?? ''),
            'chapters' => $chapters,
        ]];
    }

    if (!is_array($upstream['paragraphs'] ?? null)) {
        throw new RuntimeException('invalid_upstream_response');
    }
    $chapterNumber = (int)($upstream['idx'] ?? $chapterId);
    $chapterTitle = trim((string)($upstream['title'] ?? ''));
    $displayTitle = 'Chương ' . $chapterNumber;
    if ($chapterTitle !== '') {
        $displayTitle .= ': ' . html_entity_decode($chapterTitle, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }
    $paragraphs = [];
    foreach ($upstream['paragraphs'] as $paragraph) {
        $text = trim(html_entity_decode((string)$paragraph, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        if ($text !== '') {
            $paragraphs[] = $text;
        }
    }
    return ['success' => true, 'data' => [
        'source' => 'hh3d',
        'story_id' => $params['story'],
        'chapter_id' => (string)$chapterNumber,
        'truyen_title' => (string)($novel['title'] ?? $params['story']),
        'chapter_title' => $displayTitle,
        'total_lines' => count($paragraphs),
        'paragraphs' => $paragraphs,
    ]];
}

function online_story_fetch(array $config, string $action, array $params, string $base): array
{
    $provider = online_story_provider($config);
    if ($provider === 'hh3d') {
        return online_story_fetch_hh3d($config, $action, $params, $base);
    }
    if ($provider === 'truyenfull') {
        return online_story_fetch_truyenfull($config, $action, $params, $base);
    }
    $payload = online_story_request_json($config, $base . '/' . $action, $params);
    if (($payload['success'] ?? false) !== true || !array_key_exists('data', $payload)) {
        throw new RuntimeException('invalid_upstream_response');
    }
    return $payload;
}

function handle_online_story_proxy(array $config, string $path, string $method): void
{
    if ($method !== 'GET') {
        json_response(405, ['success' => false, 'error' => 'Phương thức không được hỗ trợ.']);
    }
    if (!online_story_rate_allowed()) {
        json_response(429, ['success' => false, 'error' => 'Bạn thao tác quá nhanh. Hãy thử lại sau.']);
    }

    $action = trim(substr($path, strlen('/api/online-story/')), '/');
    $rules = [
        'search' => ['required' => ['q'], 'ttl' => 300],
        'story' => ['required' => ['story'], 'ttl' => 3600],
        'chapter' => ['required' => ['story', 'chapter'], 'ttl' => 21600],
    ];
    if (!isset($rules[$action])) {
        json_response(404, ['success' => false, 'error' => 'API không tồn tại.']);
    }

    $params = [];
    foreach (['q', 'story', 'chapter', 'source', 'page'] as $key) {
        $params[$key] = trim((string)($_GET[$key] ?? ''));
    }
    foreach ($rules[$action]['required'] as $required) {
        if ($params[$required] === '') {
            json_response(400, ['success' => false, 'error' => 'Thiếu tham số ' . $required . '.']);
        }
    }
    if ($action === 'search' && (strlen($params['q']) < 2 || strlen($params['q']) > 300)) {
        json_response(400, ['success' => false, 'error' => 'Từ khóa tìm kiếm phải có từ 2 đến 100 ký tự.']);
    }
    if ($action !== 'search' && !online_story_identifier_valid($params['story'])) {
        json_response(400, ['success' => false, 'error' => 'Mã truyện không hợp lệ.']);
    }
    if ($action === 'chapter' && !online_story_identifier_valid($params['chapter'])) {
        json_response(400, ['success' => false, 'error' => 'Mã chương không hợp lệ.']);
    }
    if ($action === 'story' && $params['page'] !== '' && (!ctype_digit($params['page']) || (int)$params['page'] < 1 || (int)$params['page'] > 5000)) {
        json_response(400, ['success' => false, 'error' => 'Trang danh sách chương không hợp lệ.']);
    }
    $params['source'] = $params['source'] === '' ? 'all' : $params['source'];
    if (!in_array($params['source'], ['all', 's1', 's2', 'hh3d', 'truyenfull'], true)) {
        json_response(400, ['success' => false, 'error' => 'Nguồn truyện không hợp lệ.']);
    }
    $optional = $action === 'story' ? ['source', 'page'] : ['source'];
    $params = array_intersect_key($params, array_flip(array_merge($rules[$action]['required'], $optional)));

    $cached = online_story_cache_get($action, $params);
    if ($cached !== null) {
        json_response(200, $cached);
    }

    $base = online_story_base($config);
    if ($base === '') {
        json_response(503, ['success' => false, 'error' => 'Nguồn truyện chưa được cấu hình trên máy chủ.']);
    }

    try {
        $payload = online_story_fetch($config, $action, $params, $base);
    } catch (RuntimeException $error) {
        $status = $error->getCode();
        $responseStatus = $status === 429 ? 429 : 502;
        $message = $status === 429 ? 'Nguồn truyện đang giới hạn truy cập.' : 'Nguồn truyện tạm thời không khả dụng.';
        json_response($responseStatus, ['success' => false, 'error' => $message]);
    }
    if (($payload['success'] ?? false) !== true || !array_key_exists('data', $payload)) {
        json_response(502, ['success' => false, 'error' => 'Nguồn truyện tạm thời không khả dụng.']);
    }

    online_story_cache_put($action, $params, $payload, (int)$rules[$action]['ttl']);
    json_response(200, $payload);
}

function json_response(int $status, array $payload): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function redirect_response(string $location): void
{
    header('Location: ' . $location, true, 302);
    exit;
}

function request_path(): string
{
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
    return is_string($path) ? $path : '/';
}

function is_https(): bool
{
    $forwarded = strtolower(trim(explode(',', $_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')[0]));
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || $forwarded === 'https';
}

function set_secure_cookie(string $name, string $value, int $maxAge): void
{
    $parts = [
        $name . '=' . $value,
        'Path=/',
        'Max-Age=' . max(0, $maxAge),
        'Expires=' . gmdate('D, d M Y H:i:s T', $maxAge > 0 ? time() + $maxAge : time() - 3600),
        'HttpOnly',
        'SameSite=Lax',
    ];
    if (is_https()) {
        $parts[] = 'Secure';
    }
    header('Set-Cookie: ' . implode('; ', $parts), false);
}

function base64url_encode(string $value): string
{
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

function base64url_decode(string $value): string
{
    $decoded = base64_decode(strtr($value, '-_', '+/') . str_repeat('=', (4 - strlen($value) % 4) % 4), true);
    return $decoded === false ? '' : $decoded;
}

function safe_return_path(string $value): string
{
    if ($value === '' || $value[0] !== '/' || strpos($value, '//') === 0) {
        return '/';
    }
    $parts = parse_url($value);
    if ($parts === false || isset($parts['scheme']) || isset($parts['host'])) {
        return '/';
    }
    return $value;
}

function signed_state(string $returnPath, string $secret): string
{
    $payload = base64url_encode(json_encode([
        'nonce' => base64url_encode(random_bytes(20)),
        'return' => safe_return_path($returnPath),
        'expires' => time() + 600,
    ], JSON_UNESCAPED_SLASHES));
    return $payload . '.' . base64url_encode(hash_hmac('sha256', $payload, $secret, true));
}

function verify_state(string $value, string $secret): ?array
{
    $parts = explode('.', $value, 2);
    if (count($parts) !== 2) {
        return null;
    }
    $expected = hash_hmac('sha256', $parts[0], $secret, true);
    if (!hash_equals($expected, base64url_decode($parts[1]))) {
        return null;
    }
    $data = json_decode(base64url_decode($parts[0]), true);
    return is_array($data) && (int)($data['expires'] ?? 0) >= time() ? $data : null;
}

function db(array $config): PDO
{
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $config['db_host'], (int)($config['db_port'] ?? 3306), $config['db_name']);
    return new PDO($dsn, $config['db_user'], $config['db_password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
}

function current_session(array $config): ?array
{
    $token = (string)($_COOKIE[SESSION_COOKIE] ?? '');
    if ($token === '') {
        return null;
    }
    $pdo = db($config);
    $stmt = $pdo->prepare('SELECT s.id AS session_id, s.csrf_token, u.id, u.email, u.display_name, u.avatar_url FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP() LIMIT 1');
    $stmt->execute([hash('sha256', $token)]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function require_csrf(array $session): void
{
    $token = (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if ($token === '' || !hash_equals((string)$session['csrf_token'], $token)) {
        json_response(403, ['error' => 'CSRF token không hợp lệ']);
    }
}

function google_claims(array $config, string $code): array
{
    $post = http_build_query([
        'code' => $code,
        'client_id' => $config['google_client_id'],
        'client_secret' => $config['google_client_secret'],
        'redirect_uri' => $config['google_redirect_uri'],
        'grant_type' => 'authorization_code',
    ]);
    $curl = curl_init('https://oauth2.googleapis.com/token');
    curl_setopt_array($curl, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => $post, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15]);
    $body = curl_exec($curl);
    $status = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);
    $token = json_decode((string)$body, true);
    if ($status !== 200 || !is_array($token) || empty($token['id_token'])) {
        throw new RuntimeException('Google không trả về ID token');
    }
    $verifyUrl = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . rawurlencode($token['id_token']);
    $curl = curl_init($verifyUrl);
    curl_setopt_array($curl, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15]);
    $body = curl_exec($curl);
    $status = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);
    $claims = json_decode((string)$body, true);
    $issuer = (string)($claims['iss'] ?? '');
    if ($status !== 200 || !is_array($claims) || !in_array($issuer, ['accounts.google.com', 'https://accounts.google.com'], true)
        || !hash_equals((string)$config['google_client_id'], (string)($claims['aud'] ?? ''))
        || !in_array($claims['email_verified'] ?? false, [true, 'true', '1', 1], true)
        || (int)($claims['exp'] ?? 0) <= time()) {
        throw new RuntimeException('ID token Google không hợp lệ');
    }
    return $claims;
}

function create_session(array $config, array $claims): string
{
    $pdo = db($config);
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('INSERT INTO users (google_sub,email,display_name,avatar_url,last_login_at) VALUES (?,?,?,?,UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE email=VALUES(email),display_name=VALUES(display_name),avatar_url=VALUES(avatar_url),last_login_at=UTC_TIMESTAMP(),id=LAST_INSERT_ID(id)');
        $stmt->execute([(string)$claims['sub'], (string)($claims['email'] ?? ''), (string)($claims['name'] ?? ''), (string)($claims['picture'] ?? '')]);
        $userId = (int)$pdo->lastInsertId();
        $token = base64url_encode(random_bytes(48));
        $csrf = base64url_encode(random_bytes(32));
        $stmt = $pdo->prepare('INSERT INTO auth_sessions (user_id,token_hash,csrf_token,expires_at) VALUES (?,?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 30 DAY))');
        $stmt->execute([$userId, hash('sha256', $token), $csrf]);
        $pdo->exec('DELETE FROM auth_sessions WHERE expires_at<=UTC_TIMESTAMP()');
        $pdo->commit();
        return $token;
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }
}

function json_body(): array
{
    $raw = file_get_contents('php://input', false, null, 0, MAX_JSON_BODY + 1);
    if ($raw === false || strlen($raw) > MAX_JSON_BODY) {
        throw new InvalidArgumentException('Dữ liệu đồng bộ vượt giới hạn 512 KB');
    }
    $value = json_decode($raw === '' ? '{}' : $raw, true);
    if (!is_array($value)) {
        throw new InvalidArgumentException('JSON phải là một object');
    }
    return $value;
}

function decode_json_value($value, $fallback)
{
    if (is_array($value)) {
        return $value;
    }
    $decoded = json_decode((string)$value, true);
    return is_array($decoded) ? $decoded : $fallback;
}

function record_analytics_event(array $config, array $payload): bool
{
    $eventType = (string)($payload['eventType'] ?? '');
    if (!in_array($eventType, ['visit', 'theme_view', 'identify'], true)) {
        throw new InvalidArgumentException('Loại sự kiện thống kê không hợp lệ');
    }

    $visitorId = (string)($payload['visitorId'] ?? '');
    $sessionId = (string)($payload['sessionId'] ?? '');
    if (!preg_match('/^[A-Za-z0-9_-]{16,128}$/D', $visitorId)
        || !preg_match('/^[A-Za-z0-9_-]{16,128}$/D', $sessionId)) {
        throw new InvalidArgumentException('Mã phiên thống kê không hợp lệ');
    }

    $allowedThemes = [
        'googlesheets', 'googledocs', 'excel', 'vscode', 'photoshop', 'blender',
        'linkedin', 'autocad', 'zalo', 'figma', 'canva', 'powerpoint',
        'thuvienphapluat', 'premiere', 'claude', 'chatgpt', 'teams', 'revit',
        'misa', 'capcut', 'sap', 'gmail', 'outlook', 'jira', 'slack',
    ];
    $theme = $eventType === 'theme_view' ? (string)($payload['theme'] ?? '') : '';
    if ($eventType === 'theme_view' && !in_array($theme, $allowedThemes, true)) {
        throw new InvalidArgumentException('Giao diện thống kê không hợp lệ');
    }

    $path = substr((string)($payload['path'] ?? '/'), 0, 255);
    if ($path === '' || $path[0] !== '/') {
        $path = '/';
    }
    $secret = (string)$config['app_session_secret'];
    $visitorHash = hash_hmac('sha256', $visitorId, $secret);
    $sessionHash = hash_hmac('sha256', $sessionId, $secret);
    $eventKey = hash_hmac('sha256', implode('|', [$eventType, $visitorHash, $sessionHash, $theme]), $secret);
    $session = current_session($config);
    $userId = $session ? (int)$session['id'] : null;

    $pdo = db($config);
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            'INSERT INTO analytics_events (event_key,visitor_hash,session_hash,user_id,event_type,theme,path,occurred_at) '
            . 'VALUES (?,?,?,?,?,?,?,UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE user_id=COALESCE(user_id,VALUES(user_id))'
        );
        $stmt->execute([$eventKey, $visitorHash, $sessionHash, $userId, $eventType, $theme, $path]);
        $inserted = $stmt->rowCount() === 1;
        if ($userId !== null) {
            $stmt = $pdo->prepare('UPDATE analytics_events SET user_id=? WHERE visitor_hash=? AND user_id IS NULL');
            $stmt->execute([$userId, $visitorHash]);
        }
        $pdo->commit();
        return $inserted;
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }
}

function analytics_admin_emails(array $config): array
{
    $value = $config['analytics_admin_emails'] ?? DEFAULT_ANALYTICS_ADMIN_EMAILS;
    if (is_string($value)) {
        $value = preg_split('/[,;\s]+/', $value, -1, PREG_SPLIT_NO_EMPTY);
    }
    if (!is_array($value)) {
        return DEFAULT_ANALYTICS_ADMIN_EMAILS;
    }
    $emails = [];
    foreach ($value as $email) {
        $email = strtolower(trim((string)$email));
        if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $emails[$email] = true;
        }
    }
    return array_keys($emails);
}

function require_analytics_admin(array $config, array $session): void
{
    $email = strtolower(trim((string)($session['email'] ?? '')));
    if ($email === '' || !in_array($email, analytics_admin_emails($config), true)) {
        json_response(403, ['error' => 'Tài khoản này không có quyền xem thống kê']);
    }
}

function analytics_summary(array $config, int $days): array
{
    $startAt = gmdate('Y-m-d H:i:s', time() - (($days - 1) * 86400));
    $startAt = substr($startAt, 0, 10) . ' 00:00:00';
    $pdo = db($config);

    $stmt = $pdo->prepare(
        "SELECT COALESCE(SUM(event_type='visit'),0) AS visits, "
        . "COUNT(DISTINCT CASE WHEN event_type='visit' THEN visitor_hash END) AS unique_visitors, "
        . "COUNT(DISTINCT CASE WHEN event_type='visit' THEN session_hash END) AS sessions, "
        . "COUNT(DISTINCT CASE WHEN user_id IS NOT NULL THEN user_id END) AS authenticated_users, "
        . "COALESCE(SUM(event_type='theme_view'),0) AS theme_views "
        . 'FROM analytics_events WHERE occurred_at>=?'
    );
    $stmt->execute([$startAt]);
    $summary = $stmt->fetch() ?: [];

    $stmt = $pdo->prepare(
        "SELECT DATE(occurred_at) AS day, COALESCE(SUM(event_type='visit'),0) AS visits, "
        . "COUNT(DISTINCT CASE WHEN event_type='visit' THEN visitor_hash END) AS unique_visitors, "
        . "COUNT(DISTINCT CASE WHEN event_type='visit' THEN session_hash END) AS sessions, "
        . "COUNT(DISTINCT CASE WHEN user_id IS NOT NULL THEN user_id END) AS authenticated_users "
        . 'FROM analytics_events WHERE occurred_at>=? GROUP BY DATE(occurred_at) ORDER BY day'
    );
    $stmt->execute([$startAt]);
    $dailyRows = [];
    foreach ($stmt->fetchAll() as $row) {
        $dailyRows[(string)$row['day']] = $row;
    }
    $daily = [];
    $startTimestamp = strtotime(substr($startAt, 0, 10) . ' UTC');
    for ($offset = 0; $offset < $days; $offset++) {
        $day = gmdate('Y-m-d', $startTimestamp + ($offset * 86400));
        $row = $dailyRows[$day] ?? [];
        $daily[] = [
            'date' => $day,
            'visits' => (int)($row['visits'] ?? 0),
            'uniqueVisitors' => (int)($row['unique_visitors'] ?? 0),
            'sessions' => (int)($row['sessions'] ?? 0),
            'authenticatedUsers' => (int)($row['authenticated_users'] ?? 0),
        ];
    }

    $stmt = $pdo->prepare(
        "SELECT theme, COUNT(*) AS views, COUNT(DISTINCT visitor_hash) AS unique_visitors "
        . "FROM analytics_events WHERE occurred_at>=? AND event_type='theme_view' AND theme<>'' "
        . 'GROUP BY theme ORDER BY views DESC, theme ASC'
    );
    $stmt->execute([$startAt]);
    $themes = [];
    foreach ($stmt->fetchAll() as $row) {
        $themes[] = [
            'theme' => (string)$row['theme'],
            'views' => (int)$row['views'],
            'uniqueVisitors' => (int)$row['unique_visitors'],
        ];
    }

    $stmt = $pdo->prepare(
        "SELECT HOUR(DATE_ADD(occurred_at, INTERVAL 7 HOUR)) AS usage_hour, "
        . "COUNT(*) AS visits, COUNT(DISTINCT visitor_hash) AS unique_visitors "
        . "FROM analytics_events WHERE occurred_at>=? AND event_type='visit' "
        . 'GROUP BY usage_hour ORDER BY usage_hour'
    );
    $stmt->execute([$startAt]);
    $hourlyRows = [];
    foreach ($stmt->fetchAll() as $row) {
        $hourlyRows[(int)$row['usage_hour']] = $row;
    }
    $hourly = [];
    for ($hour = 0; $hour < 24; $hour++) {
        $row = $hourlyRows[$hour] ?? [];
        $hourly[] = [
            'hour' => $hour,
            'visits' => (int)($row['visits'] ?? 0),
            'uniqueVisitors' => (int)($row['unique_visitors'] ?? 0),
        ];
    }

    return [
        'ok' => true,
        'rangeDays' => $days,
        'timezone' => 'UTC',
        'hourlyTimezone' => 'UTC+7',
        'generatedAt' => gmdate('c'),
        'summary' => [
            'visits' => (int)($summary['visits'] ?? 0),
            'uniqueVisitors' => (int)($summary['unique_visitors'] ?? 0),
            'sessions' => (int)($summary['sessions'] ?? 0),
            'authenticatedUsers' => (int)($summary['authenticated_users'] ?? 0),
            'themeViews' => (int)($summary['theme_views'] ?? 0),
        ],
        'daily' => $daily,
        'hourly' => $hourly,
        'themes' => $themes,
    ];
}

function pull_document(array $config, int $userId, string $key): array
{
    $pdo = db($config);
    $stmt = $pdo->prepare('SELECT id,document_key,title,file_type,file_size,page_count,chapter_count FROM documents WHERE user_id=? AND document_key=?');
    $stmt->execute([$userId, $key]);
    $document = $stmt->fetch();
    $stmt = $pdo->prepare('SELECT settings_json,client_updated_ms FROM user_settings WHERE user_id=?');
    $stmt->execute([$userId]);
    $settings = $stmt->fetch();
    $result = ['document' => null, 'progress' => null, 'bookmarks' => [], 'settings' => $settings ? ['values' => decode_json_value($settings['settings_json'], []), 'updatedAt' => (int)$settings['client_updated_ms']] : null];
    if (!$document) {
        return $result;
    }
    $documentId = (int)$document['id'];
    unset($document['id']);
    $result['document'] = $document;
    $stmt = $pdo->prepare('SELECT locator_json,progress_percent,client_updated_ms FROM reading_progress WHERE document_id=?');
    $stmt->execute([$documentId]);
    $progress = $stmt->fetch();
    if ($progress) {
        $result['progress'] = ['location' => decode_json_value($progress['locator_json'], []), 'progressPercent' => (float)$progress['progress_percent'], 'updatedAt' => (int)$progress['client_updated_ms']];
    }
    $stmt = $pdo->prepare('SELECT bookmark_key,locator_json,label,note,excerpt,client_updated_ms FROM bookmarks WHERE document_id=? ORDER BY client_updated_ms DESC');
    $stmt->execute([$documentId]);
    foreach ($stmt->fetchAll() as $row) {
        $result['bookmarks'][] = ['id' => $row['bookmark_key'], 'location' => decode_json_value($row['locator_json'], []), 'label' => $row['label'], 'note' => $row['note'], 'excerpt' => $row['excerpt'], 'updatedAt' => (int)$row['client_updated_ms']];
    }
    return $result;
}

function push_document(array $config, int $userId, array $payload): void
{
    $document = is_array($payload['document'] ?? null) ? $payload['document'] : [];
    $progress = is_array($payload['progress'] ?? null) ? $payload['progress'] : [];
    $bookmarks = is_array($payload['bookmarks'] ?? null) ? $payload['bookmarks'] : [];
    $settings = is_array($payload['settings'] ?? null) ? $payload['settings'] : [];
    $key = substr((string)($document['documentId'] ?? ''), 0, 100);
    if ($key === '') {
        throw new InvalidArgumentException('Thiếu documentId');
    }
    if (count($bookmarks) > 200) {
        throw new InvalidArgumentException('Danh sách dấu trang không hợp lệ');
    }
    $pdo = db($config);
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('INSERT INTO documents (user_id,document_key,title,file_type,file_size,page_count,chapter_count,last_opened_at) VALUES (?,?,?,?,?,?,?,UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE title=VALUES(title),file_type=VALUES(file_type),file_size=VALUES(file_size),page_count=VALUES(page_count),chapter_count=VALUES(chapter_count),last_opened_at=UTC_TIMESTAMP(),id=LAST_INSERT_ID(id)');
        $stmt->execute([$userId, $key, substr((string)($document['title'] ?? ''), 0, 255), substr((string)($document['fileType'] ?? ''), 0, 16), max(0, (int)($document['fileSize'] ?? 0)), max(0, (int)($document['pageCount'] ?? 0)), max(0, (int)($document['chapterCount'] ?? 0))]);
        $documentId = (int)$pdo->lastInsertId();
        $stmt = $pdo->prepare('INSERT INTO reading_progress (document_id,locator_json,progress_percent,client_updated_ms) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE locator_json=IF(VALUES(client_updated_ms)>=client_updated_ms,VALUES(locator_json),locator_json),progress_percent=IF(VALUES(client_updated_ms)>=client_updated_ms,VALUES(progress_percent),progress_percent),client_updated_ms=GREATEST(client_updated_ms,VALUES(client_updated_ms))');
        $stmt->execute([$documentId, json_encode($progress['location'] ?? [], JSON_UNESCAPED_UNICODE), max(0, min(100, (float)($progress['progressPercent'] ?? 0))), max(0, (int)($progress['updatedAt'] ?? 0))]);
        $stmt = $pdo->prepare('DELETE FROM bookmarks WHERE document_id=?');
        $stmt->execute([$documentId]);
        $insert = $pdo->prepare('INSERT INTO bookmarks (document_id,bookmark_key,locator_json,label,note,excerpt,client_updated_ms) VALUES (?,?,?,?,?,?,?)');
        foreach ($bookmarks as $bookmark) {
            if (!is_array($bookmark)) continue;
            $bookmarkKey = substr((string)($bookmark['id'] ?? ''), 0, 100);
            if ($bookmarkKey === '') continue;
            $insert->execute([$documentId, $bookmarkKey, json_encode($bookmark['location'] ?? [], JSON_UNESCAPED_UNICODE), substr((string)($bookmark['label'] ?? ''), 0, 255), substr((string)($bookmark['note'] ?? ''), 0, 2000), substr((string)($bookmark['excerpt'] ?? ''), 0, 500), max(0, (int)($bookmark['updatedAt'] ?? 0))]);
        }
        $stmt = $pdo->prepare('INSERT INTO user_settings (user_id,settings_json,client_updated_ms) VALUES (?,?,?) ON DUPLICATE KEY UPDATE settings_json=IF(VALUES(client_updated_ms)>=client_updated_ms,VALUES(settings_json),settings_json),client_updated_ms=GREATEST(client_updated_ms,VALUES(client_updated_ms))');
        $stmt->execute([$userId, json_encode($settings['values'] ?? [], JSON_UNESCAPED_UNICODE), max(0, (int)($settings['updatedAt'] ?? 0))]);
        $pdo->commit();
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }
}

$path = request_path();
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$config = config();

try {
    if ($path === '/api/health' && $method === 'GET') {
        json_response(200, ['ok' => true, 'pdfExtraction' => false, 'hybridSync' => configured($config), 'onlineStoryProxy' => online_story_proxy_configured($config), 'runtime' => 'php']);
    }
    if (strpos($path, '/api/online-story/') === 0) {
        handle_online_story_proxy($config, $path, $method);
    }
    if ($path === '/api/auth/status' && $method === 'GET') {
        if (!configured($config)) json_response(200, ['enabled' => false, 'authenticated' => false]);
        $session = current_session($config);
        if (!$session) json_response(200, ['enabled' => true, 'authenticated' => false]);
        json_response(200, ['enabled' => true, 'authenticated' => true, 'csrfToken' => $session['csrf_token'], 'user' => ['email' => $session['email'], 'displayName' => $session['display_name'], 'avatarUrl' => $session['avatar_url']]]);
    }
    if (!configured($config)) json_response(503, ['error' => 'Google Sync chưa được cấu hình trên server']);
    if ($path === '/api/analytics/event' && $method === 'POST') {
        $inserted = record_analytics_event($config, json_body());
        json_response(202, ['ok' => true, 'recorded' => $inserted]);
    }
    if ($path === '/api/auth/google/start' && $method === 'GET') {
        $state = signed_state((string)($_GET['return'] ?? '/'), (string)$config['app_session_secret']);
        set_secure_cookie(OAUTH_STATE_COOKIE, $state, 600);
        redirect_response('https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query(['client_id' => $config['google_client_id'], 'redirect_uri' => $config['google_redirect_uri'], 'response_type' => 'code', 'scope' => 'openid email profile', 'state' => $state, 'prompt' => 'select_account', 'access_type' => 'online']));
    }
    if ($path === '/api/auth/google/callback' && $method === 'GET') {
        $state = (string)($_GET['state'] ?? '');
        $code = (string)($_GET['code'] ?? '');
        $stateData = verify_state($state, (string)$config['app_session_secret']);
        if (!$stateData || !hash_equals($state, (string)($_COOKIE[OAUTH_STATE_COOKIE] ?? '')) || $code === '') json_response(400, ['error' => 'Phiên đăng nhập Google không hợp lệ hoặc đã hết hạn']);
        $token = create_session($config, google_claims($config, $code));
        set_secure_cookie(SESSION_COOKIE, $token, SESSION_DAYS * 86400);
        set_secure_cookie(OAUTH_STATE_COOKIE, '', 0);
        redirect_response(safe_return_path((string)($stateData['return'] ?? '/')));
    }
    $session = current_session($config);
    if (!$session) json_response(401, ['error' => 'Chưa đăng nhập']);
    if ($path === '/api/admin/analytics' && $method === 'GET') {
        require_analytics_admin($config, $session);
        $days = (int)($_GET['range'] ?? 30);
        if (!in_array($days, [7, 30, 90], true)) {
            json_response(400, ['error' => 'Khoảng thời gian chỉ hỗ trợ 7, 30 hoặc 90 ngày']);
        }
        json_response(200, analytics_summary($config, $days));
    }
    if ($path === '/api/auth/logout' && $method === 'POST') {
        require_csrf($session);
        $pdo = db($config);
        $stmt = $pdo->prepare('DELETE FROM auth_sessions WHERE token_hash=?');
        $stmt->execute([hash('sha256', (string)($_COOKIE[SESSION_COOKIE] ?? ''))]);
        set_secure_cookie(SESSION_COOKIE, '', 0);
        json_response(200, ['ok' => true]);
    }
    if ($path === '/api/sync/document' && $method === 'GET') {
        $documentId = substr((string)($_GET['documentId'] ?? ''), 0, 100);
        if ($documentId === '') json_response(400, ['error' => 'Thiếu documentId']);
        json_response(200, array_merge(['ok' => true], pull_document($config, (int)$session['id'], $documentId)));
    }
    if ($path === '/api/sync/document' && $method === 'PUT') {
        require_csrf($session);
        push_document($config, (int)$session['id'], json_body());
        json_response(200, ['ok' => true, 'syncedAt' => (int)round(microtime(true) * 1000)]);
    }
    json_response(404, ['error' => 'API không tồn tại']);
} catch (InvalidArgumentException $error) {
    json_response(400, ['error' => $error->getMessage()]);
} catch (Throwable $error) {
    error_log('web_read API error at ' . $path . ': ' . $error->getMessage());
    json_response(500, ['error' => 'Không thể xử lý yêu cầu. Kiểm tra cấu hình và database trên server.']);
}
