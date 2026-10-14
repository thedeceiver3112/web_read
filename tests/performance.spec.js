const { test, expect } = require('@playwright/test');

function makeLargeCachedDocument(chunkCount = 5000, currentGlobalIndex = 4800) {
  const chunks = Array.from({ length: chunkCount }, (_, index) => ({
    text: `Đoạn truyện hiệu năng ${index + 1}`,
    page: Math.floor(index / 20) + 1,
    indexInPage: index % 20,
    globalIndex: index
  }));
  const pageStartIndices = {};
  chunks.forEach(chunk => {
    if (chunk.indexInPage === 0) pageStartIndices[chunk.page] = chunk.globalIndex;
  });

  return {
    cacheVersion: 3,
    processingComplete: true,
    documentName: 'truyen-dai.txt',
    documentId: 'performance-document',
    fileSize: 123456,
    fileType: 'txt',
    chunks,
    rawText: '',
    pageStartIndices,
    documentToc: [],
    documentImages: {},
    totalPages: Math.ceil(chunkCount / 20),
    currentPage: Math.floor(currentGlobalIndex / 20) + 1,
    currentGlobalIndex,
    savedAt: Date.now()
  };
}

function makeHeavyTextFile(sizeInMegabytes = 12) {
  const targetBytes = sizeInMegabytes * 1024 * 1024;
  const paragraph = 'Đây là đoạn nội dung dùng để đo hiệu năng trên máy cấu hình yếu. Mỗi đoạn phải được giữ riêng để mô phỏng truyện dài.\n\n';
  const repeats = Math.ceil(targetBytes / Buffer.byteLength(paragraph, 'utf8'));
  const buffer = Buffer.from(paragraph.repeat(repeats), 'utf8').subarray(0, targetBytes);
  return { name: `truyen-nang-${sizeInMegabytes}mb.txt`, mimeType: 'text/plain', buffer };
}

test('khôi phục truyện dài chỉ render vùng gần vị trí đang đọc', async ({ page }) => {
  const cache = makeLargeCachedDocument();
  await page.addInitScript(payload => {
    sessionStorage.setItem('stealth_active_document_v2', JSON.stringify(payload));
  }, cache);

  await page.goto('/googlesheets.html');
  await expect(page.locator('#universal-reader-navbar')).toBeVisible();
  await expect.poll(() => page.evaluate(() => state.currentGlobalIndex)).toBe(4800);

  const metrics = await page.evaluate(() => ({
    renderStartIndex: state.renderStartIndex,
    renderedCount: state.renderedCount,
    renderedRows: document.querySelectorAll('#story-tbody > tr').length,
    totalChunks: state.allChunks.length,
    pdfLibraryLoaded: Boolean(window.pdfjsLib)
  }));

  expect(metrics.totalChunks).toBe(5000);
  expect(metrics.renderStartIndex).toBeGreaterThan(4600);
  expect(metrics.renderedCount - metrics.renderStartIndex).toBeLessThanOrEqual(160);
  expect(metrics.renderedRows).toBeLessThanOrEqual(160);
  expect(metrics.pdfLibraryLoaded).toBe(false);
});

test('máy ít tài nguyên tự tắt hiệu ứng GPU nặng', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, 'deviceMemory', { configurable: true, get: () => 2 });
    Object.defineProperty(window.navigator, 'hardwareConcurrency', { configurable: true, get: () => 2 });
  });

  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/performance-lite/);
  await expect(page.locator('#landing-portal')).toBeVisible();
});

test('benchmark TXT 12 MB trên CPU chậm 6 lần và máy 2 GB RAM', async ({ page }) => {
  test.setTimeout(120000);
  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, 'deviceMemory', { configurable: true, get: () => 2 });
    Object.defineProperty(window.navigator, 'hardwareConcurrency', { configurable: true, get: () => 2 });
  });

  await page.goto('/googlesheets.html');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });

  const openStartedAt = Date.now();
  await page.locator('#file-pdf-input').setInputFiles(makeHeavyTextFile());
  await expect(page.locator('#loading-spinner')).toBeHidden({ timeout: 90000 });
  const openDurationMs = Date.now() - openStartedAt;

  const openMetrics = await page.evaluate(() => ({
    chunks: state.allChunks.length,
    renderedItems: state.renderedCount - state.renderStartIndex,
    renderedRows: document.querySelectorAll('#story-tbody > tr').length,
    liteMode: document.documentElement.classList.contains('performance-lite'),
    heapMb: performance.memory
      ? Math.round(performance.memory.usedJSHeapSize / 1048576)
      : null
  }));

  const jumpStartedAt = Date.now();
  await page.evaluate(() => jumpToChunk(Math.max(0, state.allChunks.length - 100)));
  const jumpDurationMs = Date.now() - jumpStartedAt;
  const jumpMetrics = await page.evaluate(() => ({
    currentIndex: state.currentGlobalIndex,
    renderStartIndex: state.renderStartIndex,
    renderedItems: state.renderedCount - state.renderStartIndex,
    renderedRows: document.querySelectorAll('#story-tbody > tr').length
  }));

  await page.evaluate(() => persistDocumentCache());
  const reloadStartedAt = Date.now();
  await page.reload();
  await expect(page.locator('#univ-file-name')).toContainText('truyen-nang-12mb.txt', { timeout: 90000 });
  await expect.poll(() => page.evaluate(() => state.currentGlobalIndex), { timeout: 90000 }).toBe(jumpMetrics.currentIndex);
  const reloadDurationMs = Date.now() - reloadStartedAt;
  const reloadMetrics = await page.evaluate(() => ({
    renderedItemsAfterReload: state.renderedCount - state.renderStartIndex,
    renderedRowsAfterReload: document.querySelectorAll('#story-tbody > tr').length,
    heapAfterReloadMb: performance.memory
      ? Math.round(performance.memory.usedJSHeapSize / 1048576)
      : null
  }));

  console.log(`BENCHMARK_LOW_SPEC ${JSON.stringify({ openDurationMs, jumpDurationMs, reloadDurationMs, ...openMetrics, ...jumpMetrics, ...reloadMetrics })}`);

  expect(openMetrics.liteMode).toBe(true);
  expect(openMetrics.chunks).toBeGreaterThan(50000);
  expect(openMetrics.renderedRows).toBeLessThanOrEqual(160);
  expect(jumpMetrics.renderedRows).toBeLessThanOrEqual(160);
  expect(jumpMetrics.currentIndex).toBe(openMetrics.chunks - 100);
  expect(reloadMetrics.renderedRowsAfterReload).toBeLessThanOrEqual(160);
});
