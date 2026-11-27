<?php
declare(strict_types=1);

// Standalone, offline tests. Every title and narrative below is synthetic.
const MAX_STORY_RESPONSE_BODY = 5242880;
require_once dirname(__DIR__) . '/api/xtruyen.php';

$checks = 0;
function same($expected, $actual): void
{
    global $checks;
    ++$checks;
    if ($expected !== $actual) {
        throw new RuntimeException('Assertion ' . $checks . ' failed: ' . var_export($actual, true));
    }
}
function rejects(callable $call): void
{
    global $checks;
    ++$checks;
    try {
        $call();
    } catch (RuntimeException $e) {
        if (in_array($e->getMessage(), ['invalid_upstream_response', 'upstream_unavailable'], true)) {
            return;
        }
        throw $e;
    }
    throw new RuntimeException('Expected rejection at assertion ' . $checks);
}
function transport(string $html): string
{
    return strtr(base64_encode(gzcompress($html)),
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
        'pNRzya673WkGnLJofwlDOEuhv4Q_CSiAxt0VgBH2d-PZsXMU8Ijbcre19qmF5KTY');
}
function chapter_fixture(string $content): string
{
    return '<div id="chapter-reading-content" data-seo-preview="1">Preview only</div>'
        . '<script>window.readingChapterConfig = {encodedData: ' . json_encode(transport($content)) . '};</script>'
        . '<script>window.chapterConfig = {novelSlug: "sample-story", novelTitle: "Sổ thử nghiệm", chapterTitle: "Chương 1: Kiểm tra"};</script>';
}
function story_fixture(string $groups): string
{
    return '<div class="post-title center"><h1>Truyện kiểm thử</h1></div>'
        . '<a href="https://xtruyen.vn/tacgia/Test-Author/">Tác giả thử nghiệm</a><ul>' . $groups . '</ul>'
        . '<script>var manga = {"manga_id":"12345"};</script>';
}
function group_fixture(int $from, int $to, bool $filled = false, bool $terminal = false): string
{
    $html = '<li class="has-child" data-value="' . $from . '-to-' . ($terminal ? $from . 'm' : $to) . '">'
        . '<div class="ch-to">Chương ' . $to . ($terminal ? ' ++' : '') . '</div><ul>';
    if ($filled) {
        for ($i = $from; $i <= $to; ++$i) {
            $html .= '<li class="wp-manga-chapter"><a href="https://xtruyen.vn/truyen/sample-story/chuong-' . $i . '/">Chương ' . $i . ': Mục thử</a></li>';
        }
    }
    return $html . '</ul></li>';
}

$results = online_story_xtruyen_search(json_encode(['success' => true, 'data' => [
    ['type' => 'text', 'title' => 'Tên thử (4143 chương) FULL', 'url' => 'https://xtruyen.vn/truyen/sample-story/'],
    ['type' => 'text', 'title' => 'Duplicate', 'url' => '/truyen/sample-story/'],
    ['type' => 'text', 'title' => 'Writer', 'url' => 'https://xtruyen.vn/tacgia/test/'],
    ['type' => 'text', 'title' => 'External', 'url' => 'https://evil.test/truyen/other/'],
    ['type' => 'text', 'title' => 'User info', 'url' => 'https://evil@xtruyen.vn/truyen/other/'],
    ['type' => 'text', 'title' => 'Port', 'url' => 'https://xtruyen.vn:443/truyen/other/'],
    ['type' => 'text', 'title' => 'Chapter', 'url' => '/truyen/sample-story/chuong-1/'],
    ['type' => 'comic', 'title' => 'Comic', 'url' => '/truyen/comic/'],
    ['type' => 'text', 'title' => 'Bộ khác (7 chương)', 'url' => '/truyen/other/'],
    ['type' => 'text', 'title' => 'Chưa có số', 'url' => '/truyen/no-count/'],
]]));
same(3, $results['total']);
same(['source' => 'xtruyen', 'story_id' => 'sample-story', 'title' => 'Tên thử', 'author' => '',
    'latest_chapter' => 'Chương 4143', 'chapter_count' => 4143], $results['data'][0]);
same(7, $results['data'][1]['chapter_count']);
same('', $results['data'][2]['latest_chapter']);
same([], online_story_xtruyen_search('{"success":true,"data":[]}')['data']);
foreach (['{}', '{"success":false,"data":[]}', '{"success":true,"data":{}}', 'null', 'not-json'] as $invalid) {
    rejects(fn() => online_story_xtruyen_search($invalid));
}

$groups = group_fixture(1, 100, true) . group_fixture(101, 200) . group_fixture(201, 277, false, true);
$html = story_fixture($groups);
$data = online_story_xtruyen_story_metadata($html, 'sample-story', 1);
same('Truyện kiểm thử', $data['title']);
same('Tác giả thử nghiệm', $data['author']);
same('12345', $data['_manga_id']);
same(3, $data['chapter_pages']);
same(100, $data['chapter_page_size']);
same(277, $data['chapter_count']);
same(100, count(online_story_xtruyen_validate_chapters($data['chapters'], 1, 100)));
same([], online_story_xtruyen_story_metadata($html, 'sample-story', 2)['chapters']);
$last = online_story_xtruyen_story_metadata($html, 'sample-story', 3);
same(201, $last['_from']);
same(277, $last['_to']);
foreach ([0, 4] as $page) {
    rejects(fn() => online_story_xtruyen_story_metadata($html, 'sample-story', $page));
}
foreach ([group_fixture(1, 99) . group_fixture(101, 200), group_fixture(101, 200),
    group_fixture(1, 101), group_fixture(1, 100) . group_fixture(1, 100),
    group_fixture(1, 100, false, true) . group_fixture(101, 200),
    '<li class="has-child" data-value="1-to-1m"></li>',
    '<li class="has-child" data-value="1-to-1m"><div class="ch-to">Chương 101 ++</div></li>',
    '<li class="has-child" data-value="vol-1"></li>'] as $badGroups) {
    rejects(fn() => online_story_xtruyen_story_metadata(story_fixture($badGroups), 'sample-story', 1));
}
rejects(fn() => online_story_xtruyen_story_metadata(str_replace('"12345"', '"bad"', $html), 'sample-story', 1));

$rows = [];
for ($i = 277; $i >= 201; --$i) {
    $rows[] = ['s' => 'chuong-' . $i, 'n' => 'Chương ' . $i, 'e' => 'Mục thử'];
}
$chapters = online_story_xtruyen_validate_chapters(online_story_xtruyen_toc(json_encode($rows)), 201, 277);
same(77, count($chapters));
same('chuong-201', $chapters[0]['chapter_id']);
same('Chương 277: Mục thử', $chapters[76]['title']);
rejects(fn() => online_story_xtruyen_validate_chapters(array_slice($chapters, 1), 201, 277));
$duplicate = $chapters;
$duplicate[1] = $duplicate[0];
rejects(fn() => online_story_xtruyen_validate_chapters($duplicate, 201, 277));
$volume = $chapters;
$volume[0]['chapter_id'] = 'quyen-2-chuong-201';
rejects(fn() => online_story_xtruyen_validate_chapters($volume, 201, 277));
rejects(fn() => online_story_xtruyen_toc('[{"s":"../bad","n":"Test","e":""}]'));
rejects(fn() => online_story_xtruyen_toc('[{"s":"chuong-1","n":{},"e":""}]'));
rejects(fn() => online_story_xtruyen_toc('{}'));

$narrative = '<div>Raw <span>đầu</span><p>Một <em>đoạn</em> &amp; thử.</p>'
    . 'Giữa<br>Tiếp<br><br><div>Trong <span>lồng</span><p>Đoạn con</p>Đuôi trong</div>Đuôi ngoài'
    . '<script>bad()</script><style>bad</style><div class="ads-wrapper">ad text</div>'
    . '<div class="aam-ad-container"><div>ad nested</div></div><button>UI</button>'
    . '<div class="xt-story-group-section">group promotion</div></div>';
$expected = ['Raw đầu', 'Một đoạn & thử.', 'Giữa', 'Tiếp', 'Trong lồng', 'Đoạn con', 'Đuôi trong', 'Đuôi ngoài'];
same($narrative, online_story_xtruyen_decode(transport($narrative)));
same($expected, online_story_xtruyen_paragraphs($narrative));
$chapter = online_story_xtruyen_chapter(chapter_fixture($narrative), 'sample-story', 'chuong-1')['data'];
same($expected, $chapter['paragraphs']);
same(8, $chapter['total_lines']);
same('Sổ thử nghiệm', $chapter['truyen_title']);
same('Chương 1: Kiểm tra', $chapter['chapter_title']);
same($expected, online_story_xtruyen_paragraphs('<div id="chapter-reading-content">' . $narrative . '</div>'));
same(['a b', 'c'], online_story_xtruyen_paragraphs('<p>a&nbsp; b</p><div>c</div>'));
same('escaped " quote \\ slash', online_story_xtruyen_js_string('{title: "escaped \\" quote \\\\ slash"}', 'title'));
foreach (['', '!!!!', 'A', transport('<p>okay</p>') . 'x', substr(transport('<p>okay</p>'), 0, -4)] as $bad) {
    rejects(fn() => online_story_xtruyen_decode($bad));
}
$extra = strtr(base64_encode(gzcompress('<p>Test</p>') . 'tail'),
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
    'pNRzya673WkGnLJofwlDOEuhv4Q_CSiAxt0VgBH2d-PZsXMU8Ijbcre19qmF5KTY');
rejects(fn() => online_story_xtruyen_decode($extra));
$compressed = gzcompress('<p>Checksum test</p>');
$compressed[strlen($compressed) - 1] = chr(ord($compressed[strlen($compressed) - 1]) ^ 1);
$corrupt = strtr(base64_encode($compressed),
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
    'pNRzya673WkGnLJofwlDOEuhv4Q_CSiAxt0VgBH2d-PZsXMU8Ijbcre19qmF5KTY');
rejects(fn() => online_story_xtruyen_decode($corrupt));
rejects(fn() => online_story_xtruyen_decode(str_repeat('p', MAX_STORY_RESPONSE_BODY + 1)));
rejects(fn() => online_story_xtruyen_decode(transport(str_repeat('x', MAX_STORY_RESPONSE_BODY + 1))));
rejects(fn() => online_story_xtruyen_paragraphs('<div data-seo-preview="1">Preview</div>'));
rejects(fn() => online_story_xtruyen_paragraphs('<div id="chapter-seo-preview">Preview</div>'));
rejects(fn() => online_story_xtruyen_paragraphs('<script>only script</script>'));
rejects(fn() => online_story_xtruyen_chapter('<div data-seo-preview="1">Preview</div>', 'sample-story', 'chuong-1'));
rejects(fn() => online_story_xtruyen_chapter(str_replace('encodedData:', 'missingData:', chapter_fixture($narrative)), 'sample-story', 'chuong-1'));
rejects(fn() => online_story_xtruyen_chapter(str_replace(json_encode(transport($narrative)), '"broken"', chapter_fixture($narrative)), 'sample-story', 'chuong-1'));
rejects(fn() => online_story_xtruyen_chapter(chapter_fixture($narrative), 'different-story', 'chuong-1'));
rejects(fn() => online_story_xtruyen_dom(str_repeat('x', MAX_STORY_RESPONSE_BODY + 1)));
rejects(fn() => online_story_xtruyen_dom("\xff"));

foreach (['../secret', 'https://evil.test', 'a/b', 'a%2fb', 'a?x', "bad\n", '', str_repeat('a', 201)] as $slug) {
    rejects(fn() => online_story_xtruyen_slug($slug));
}
foreach (['https://evil.test/truyen/test/', '//evil.test/truyen/test/', 'https://xtruyen.vn.evil/truyen/test/',
    'https://xtruyen.vn/truyen/test/?x=1', 'http://xtruyen.vn/truyen/test/', '/truyen/../test/',
    '/truyen/%74est/', '/truyen/test/#anchor', '/wp-admin/admin-ajax.php'] as $path) {
    same(null, online_story_xtruyen_path($path));
}
rejects(fn() => online_story_xtruyen_request([], 'https://evil.test/truyen/test/'));
rejects(fn() => online_story_xtruyen_request([], '/api/api-chapters.php'));
rejects(fn() => online_story_xtruyen_request([], '/truyen/test/', ['unexpected' => 'post']));
rejects(fn() => online_story_xtruyen_request(['online_story_ca_bundle' => __DIR__ . '/nonexistent-ca.pem'], '/truyen/test/'));
rejects(fn() => online_story_fetch_xtruyen([], 'invalid-action', []));
rejects(fn() => online_story_fetch_xtruyen([], 'search', ['q' => []]));
rejects(fn() => online_story_fetch_xtruyen([], 'story', ['story' => '../bad']));
rejects(fn() => online_story_fetch_xtruyen([], 'story', ['story' => 'test', 'page' => '2abc']));
rejects(fn() => online_story_fetch_xtruyen([], 'chapter', ['story' => 'test', 'chapter' => '../bad']));
echo 'PASS: ' . $checks . " assertions (synthetic fixtures, no network)\n";
