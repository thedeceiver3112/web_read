<?php
declare(strict_types=1);

// Exercise the real dispatcher without booting the HTTP router or database.
$source = file_get_contents(__DIR__ . '/../api/index.php');
if (!preg_match('~function online_story_fetch\(.*?\r?\n\}\r?\n~s', $source, $match)) {
    throw new RuntimeException('Dispatcher not found');
}
eval($match[0]);
$primary = ['success' => true, 'data' => [['source' => 's1']]];
$backupCalls = 0;
function online_story_provider(array $config): string { return 'truyenfull'; }
function online_story_fetch_truyenfull(...$args): array {
    global $primary;
    if ($primary instanceof Throwable) { throw $primary; }
    return $primary;
}
function online_story_fetch_xtruyen(...$args): array {
    global $backupCalls;
    $backupCalls++;
    return ['success' => true, 'data' => [['source' => 'xtruyen']]];
}
function check(bool $value): void {
    if (!$value) { throw new RuntimeException('Dispatch assertion failed'); }
}
$params = ['q' => 'book', 'source' => 'all'];
$result = online_story_fetch([], 'search', $params, 'https://truyenfull.live');
check($result['data'][0]['source'] === 's1' && $backupCalls === 0);
foreach ([['success' => true, 'data' => []], new RuntimeException('upstream_unavailable'), new RuntimeException('upstream_http_403'), new RuntimeException('upstream_http_502'), new RuntimeException('upstream_blocked'), new RuntimeException('upstream_timeout')] as $primary) {
    $result = online_story_fetch([], 'search', $params, 'https://truyenfull.live');
    check($result['backup'] === true && $result['data'][0]['source'] === 'xtruyen');
}
check($backupCalls === 6);
$primary = new RuntimeException('upstream_unavailable');
try {
    online_story_fetch([], 'chapter', ['story' => 'book', 'chapter' => '10', 'source' => 's1'], 'https://truyenfull.live');
    throw new LogicException('Chapter should not be silently swapped');
} catch (RuntimeException $error) {
    check($error->getMessage() === 'upstream_unavailable' && $backupCalls === 6);
}
$result = online_story_fetch([], 'search', ['q' => 'book', 'source' => 'xtruyen'], 'https://truyenfull.live');
check($backupCalls === 7 && $result['data'][0]['source'] === 'xtruyen');
echo "PASS: PHP primary/backup dispatch, no network or database\n";
