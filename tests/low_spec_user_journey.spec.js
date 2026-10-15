const { test, expect } = require('@playwright/test');

const BOOKS = [
  { name: 'Hanh_Trinh_Phuong_Bac.txt', marker: 'PHUONG BAC' },
  { name: 'Thanh_Pho_Trong_Suong.txt', marker: 'THANH PHO' },
  { name: 'Nguoi_Giu_Thu_Vien.txt', marker: 'THU VIEN' }
];

function makeStoryFile({ name, marker }, paragraphCount = 1040) {
  const paragraphs = Array.from({ length: paragraphCount }, (_, index) => (
    `${marker} - đoạn ${index + 1}. Đây là nội dung mô phỏng một truyện dài để kiểm tra thao tác đọc, chuyển trang và khôi phục tiến độ trên máy cấu hình yếu.`
  ));
  return {
    name,
    mimeType: 'text/plain',
    buffer: Buffer.from(paragraphs.join('\n\n'), 'utf8')
  };
}

async function readPagesLikeUser(page, count) {
  const durations = [];
  for (let turn = 0; turn < count; turn += 1) {
    const before = await page.evaluate(() => ({
      page: state.currentPage,
      index: state.currentGlobalIndex
    }));
    const startedAt = Date.now();

    await page.keyboard.press('PageDown');
    await expect.poll(
      () => page.evaluate(() => state.currentPage),
      { timeout: 5000 }
    ).toBeGreaterThan(before.page);

    const after = await page.evaluate(() => ({
      page: state.currentPage,
      index: state.currentGlobalIndex
    }));
    expect(after.index).toBeGreaterThan(before.index);
    durations.push(Date.now() - startedAt);
  }

  // The real app coalesces progress writes for 400 ms while a user reads.
  await page.waitForTimeout(500);
  return durations;
}

async function switchBookLikeUser(page, fileName) {
  const startedAt = Date.now();
  await page.locator('#univ-btn-switch-book').click();
  const menu = page.locator('#univ-books-dropdown-menu');
  await expect(menu).toBeVisible();
  await menu.locator('.unav-dropdown-item', { hasText: fileName }).click();
  await expect(menu).toBeHidden();
  await expect(page.locator('#univ-file-name')).toContainText(fileName);
  await expect(page.locator('#loading-spinner')).toBeHidden({ timeout: 10000 });
  return Date.now() - startedAt;
}

function percentile(values, ratio) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
}

test('user thật đọc nhiều truyện từng trang trên máy cấu hình yếu', async ({ page }, testInfo) => {
  test.setTimeout(120000);
  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, 'deviceMemory', { configurable: true, get: () => 2 });
    Object.defineProperty(window.navigator, 'hardwareConcurrency', { configurable: true, get: () => 2 });
  });

  await page.goto('/index.html?portal=1');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });

  const uploadStartedAt = Date.now();
  await page.locator('#portal-file-input').setInputFiles(BOOKS.map(book => makeStoryFile(book)));
  await expect(page.locator('.portal-book-item')).toHaveCount(BOOKS.length, { timeout: 30000 });
  await expect(page.locator('#portal-upload-progress')).toBeHidden({ timeout: 30000 });
  const uploadDurationMs = Date.now() - uploadStartedAt;

  await page.locator('.portal-book-item', { hasText: BOOKS[0].name }).click();
  await expect(page.locator('.portal-book-item', { hasText: BOOKS[0].name })).toHaveClass(/selected/);
  await page.locator('#btn-portal-enter').click();
  await expect(page).toHaveURL(/googlesheets\.html/);
  await expect(page.locator('html')).toHaveClass(/performance-lite/);
  await expect(page.locator('#univ-file-name')).toContainText(BOOKS[0].name);

  const firstTurns = await readPagesLikeUser(page, 6);
  const firstProgress = await page.evaluate(() => ({
    page: state.currentPage,
    index: state.currentGlobalIndex
  }));

  const switchDurations = [];
  switchDurations.push(await switchBookLikeUser(page, BOOKS[1].name));
  const secondTurns = await readPagesLikeUser(page, 5);
  const secondProgress = await page.evaluate(() => ({
    page: state.currentPage,
    index: state.currentGlobalIndex
  }));

  switchDurations.push(await switchBookLikeUser(page, BOOKS[2].name));
  const thirdTurns = await readPagesLikeUser(page, 4);
  const thirdProgress = await page.evaluate(() => ({
    page: state.currentPage,
    index: state.currentGlobalIndex
  }));

  switchDurations.push(await switchBookLikeUser(page, BOOKS[0].name));
  await expect.poll(() => page.evaluate(() => state.currentGlobalIndex)).toBe(firstProgress.index);

  switchDurations.push(await switchBookLikeUser(page, BOOKS[1].name));
  await expect.poll(() => page.evaluate(() => state.currentGlobalIndex)).toBe(secondProgress.index);

  switchDurations.push(await switchBookLikeUser(page, BOOKS[2].name));
  await expect.poll(() => page.evaluate(() => state.currentGlobalIndex)).toBe(thirdProgress.index);

  const metrics = await page.evaluate(() => ({
    currentBook: state.pdfFileName,
    totalChunks: state.allChunks.length,
    renderedItems: state.renderedCount - state.renderStartIndex,
    renderedRows: document.querySelectorAll('#story-tbody > tr').length,
    liteMode: document.documentElement.classList.contains('performance-lite'),
    heapMb: performance.memory
      ? Math.round(performance.memory.usedJSHeapSize / 1048576)
      : null
  }));
  const pageTurnDurations = [...firstTurns, ...secondTurns, ...thirdTurns];
  const report = {
    uploadDurationMs,
    pageTurns: pageTurnDurations.length,
    maxPageTurnMs: Math.max(...pageTurnDurations),
    averagePageTurnMs: Math.round(pageTurnDurations.reduce((sum, value) => sum + value, 0) / pageTurnDurations.length),
    maxBookSwitchMs: Math.max(...switchDurations),
    averageBookSwitchMs: Math.round(switchDurations.reduce((sum, value) => sum + value, 0) / switchDurations.length),
    progress: [firstProgress, secondProgress, thirdProgress],
    ...metrics
  };
  console.log(`LOW_SPEC_USER_JOURNEY ${JSON.stringify(report)}`);

  await page.screenshot({ path: testInfo.outputPath('low-spec-multi-book-final.png'), fullPage: false });

  expect(metrics.liteMode).toBe(true);
  expect(metrics.currentBook).toBe(BOOKS[2].name);
  expect(metrics.totalChunks).toBeGreaterThan(1000);
  expect(metrics.renderedItems).toBeLessThanOrEqual(600);
  expect(metrics.renderedRows).toBeLessThanOrEqual(600);
  expect(report.maxPageTurnMs).toBeLessThan(5000);
  expect(report.maxBookSwitchMs).toBeLessThan(10000);
});

test('truyện trên 500 trang cuộn tuần tự 400 trang trên máy cấu hình yếu', async ({ page }, testInfo) => {
  test.setTimeout(600000);
  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, 'deviceMemory', { configurable: true, get: () => 2 });
    Object.defineProperty(window.navigator, 'hardwareConcurrency', { configurable: true, get: () => 2 });
  });

  await page.goto('/index.html?portal=1');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });

  const longBook = makeStoryFile(
    { name: 'Truyen_Dai_520_Trang.txt', marker: 'TRUYEN DAI' },
    41600
  );
  const uploadStartedAt = Date.now();
  await page.locator('#portal-file-input').setInputFiles(longBook);
  await expect(page.locator('#portal-upload-progress')).toBeHidden({ timeout: 90000 });
  await expect(page.locator('.portal-book-item')).toHaveCount(1, { timeout: 90000 });
  const uploadDurationMs = Date.now() - uploadStartedAt;

  await page.locator('#btn-portal-enter').click();
  await expect(page).toHaveURL(/googlesheets\.html/);
  await expect(page.locator('html')).toHaveClass(/performance-lite/);
  await expect(page.locator('#univ-file-name')).toContainText(longBook.name);

  const initial = await page.evaluate(() => ({
    page: state.currentPage,
    index: state.currentGlobalIndex,
    totalPages: state.totalPages,
    totalChunks: state.allChunks.length
  }));
  expect(initial.page).toBe(1);
  expect(initial.totalPages).toBeGreaterThanOrEqual(520);

  const pageTurnDurations = [];
  const checkpoints = [];
  for (let turn = 1; turn <= 400; turn += 1) {
    const expectedPage = turn + 1;
    const startedAt = Date.now();
    await page.keyboard.press('PageDown');
    await expect.poll(
      () => page.evaluate(() => state.currentPage),
      { timeout: 5000, intervals: [20, 50, 100] }
    ).toBe(expectedPage);
    pageTurnDurations.push(Date.now() - startedAt);

    if (turn % 25 === 0) {
      const checkpoint = await page.evaluate(() => ({
        page: state.currentPage,
        index: state.currentGlobalIndex,
        renderedItems: state.renderedCount - state.renderStartIndex,
        renderedRows: document.querySelectorAll('#story-tbody > tr').length
      }));
      expect(checkpoint.page).toBe(expectedPage);
      expect(checkpoint.renderedItems).toBeLessThanOrEqual(600);
      expect(checkpoint.renderedRows).toBeLessThanOrEqual(600);
      checkpoints.push(checkpoint);
    }
  }

  await page.waitForTimeout(500);
  const finalMetrics = await page.evaluate(() => ({
    page: state.currentPage,
    index: state.currentGlobalIndex,
    totalPages: state.totalPages,
    totalChunks: state.allChunks.length,
    renderedItems: state.renderedCount - state.renderStartIndex,
    renderedRows: document.querySelectorAll('#story-tbody > tr').length,
    liteMode: document.documentElement.classList.contains('performance-lite'),
    heapMb: performance.memory
      ? Math.round(performance.memory.usedJSHeapSize / 1048576)
      : null
  }));
  const totalTurnDurationMs = pageTurnDurations.reduce((sum, value) => sum + value, 0);
  const report = {
    uploadDurationMs,
    turns: pageTurnDurations.length,
    totalTurnDurationMs,
    averagePageTurnMs: Math.round(totalTurnDurationMs / pageTurnDurations.length),
    p95PageTurnMs: percentile(pageTurnDurations, 0.95),
    maxPageTurnMs: Math.max(...pageTurnDurations),
    checkpoints: checkpoints.length,
    ...finalMetrics
  };
  console.log(`LOW_SPEC_520_PAGE_STRESS ${JSON.stringify(report)}`);

  await page.screenshot({ path: testInfo.outputPath('low-spec-page-401-of-520.png'), fullPage: false });

  expect(finalMetrics.liteMode).toBe(true);
  expect(finalMetrics.page).toBe(401);
  expect(finalMetrics.index).toBe(32000);
  expect(finalMetrics.totalPages).toBe(520);
  expect(finalMetrics.totalChunks).toBe(41600);
  expect(finalMetrics.renderedItems).toBeLessThanOrEqual(600);
  expect(finalMetrics.renderedRows).toBeLessThanOrEqual(600);
  expect(report.p95PageTurnMs).toBeLessThan(5000);
});
