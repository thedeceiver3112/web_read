<?php
declare(strict_types=1);

const SESSION_COOKIE = 'sr_session';
const OAUTH_STATE_COOKIE = 'sr_oauth_state';
const SESSION_DAYS = 30;
const MAX_JSON_BODY = 524288;

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
        json_response(200, ['ok' => true, 'pdfExtraction' => false, 'hybridSync' => configured($config), 'runtime' => 'php']);
    }
    if ($path === '/api/auth/status' && $method === 'GET') {
        if (!configured($config)) json_response(200, ['enabled' => false, 'authenticated' => false]);
        $session = current_session($config);
        if (!$session) json_response(200, ['enabled' => true, 'authenticated' => false]);
        json_response(200, ['enabled' => true, 'authenticated' => true, 'csrfToken' => $session['csrf_token'], 'user' => ['email' => $session['email'], 'displayName' => $session['display_name'], 'avatarUrl' => $session['avatar_url']]]);
    }
    if (!configured($config)) json_response(503, ['error' => 'Google Sync chưa được cấu hình trên server']);
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
    json_response(500, ['error' => 'Không thể xử lý đồng bộ. Kiểm tra cấu hình và database trên server.']);
}
