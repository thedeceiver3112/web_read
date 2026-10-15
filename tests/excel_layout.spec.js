const { test, expect } = require('@playwright/test');

function makeLongExcelStory() {
  const paragraphs = Array.from({ length: 520 }, (_, index) => {
    if (index === 450) {
      return `Dòng ${index + 1}: ${'NOIDUNGRATDAIKHONGCODAUCACH'.repeat(35)} kết thúc đoạn kiểm thử.`;
    }
    return `Dòng ${index + 1}: Nội dung truyện dùng để kiểm tra bố cục Excel.`;
  });
  return {
    name: 'kiem-thu-excel-520-dong.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(paragraphs.join('\n\n'), 'utf8')
  };
}

test('Excel không để nội dung dài ở dòng 450 tràn sang các cột khác', async ({ page }) => {
  await page.goto('/excel.html');
  await page.locator('#file-pdf-input').setInputFiles(makeLongExcelStory());
  await expect(page.locator('#loading-spinner')).toBeHidden({ timeout: 20000 });

  await page.evaluate(() => jumpToChunk(450));
  const metrics = await page.locator('#story-cell-450').evaluate(cell => {
    const style = getComputedStyle(cell);
    const row = cell.closest('tr');
    const nextCell = cell.nextElementSibling;
    const cellRect = cell.getBoundingClientRect();
    const nextRect = nextCell.getBoundingClientRect();
    return {
      whiteSpace: style.whiteSpace,
      overflowX: style.overflowX,
      overflowWrap: style.overflowWrap,
      cellRight: cellRect.right,
      nextCellLeft: nextRect.left,
      cellScrollWidth: cell.scrollWidth,
      cellClientWidth: cell.clientWidth,
      rowHeight: row.getBoundingClientRect().height,
      cellScrollHeight: cell.scrollHeight
    };
  });

  expect(metrics.whiteSpace).toBe('pre-wrap');
  expect(metrics.overflowX).toBe('hidden');
  expect(metrics.overflowWrap).toBe('anywhere');
  expect(metrics.cellRight).toBeLessThanOrEqual(metrics.nextCellLeft + 1);
  expect(metrics.cellScrollWidth).toBeLessThanOrEqual(metrics.cellClientWidth + 1);
  expect(metrics.rowHeight).toBeGreaterThanOrEqual(metrics.cellScrollHeight - 1);
});

test('Excel theme loads authentic desktop 365 navbar, ribbon and formula bar matching screenshot', async ({ page }) => {
  await page.goto('/excel.html');
  await page.waitForLoadState('domcontentloaded');

  // 1. Verify Title Bar (#107c41 green)
  const titleBar = page.locator('.excel-title-bar');
  await expect(titleBar).toBeVisible();
  const titleBg = await titleBar.evaluate(el => getComputedStyle(el).backgroundColor);
  expect(titleBg).toBe('rgb(16, 124, 65)'); // #107c41

  // Title name & app
  const docTitle = page.locator('#excel-doc-title');
  await expect(docTitle).toHaveText('Copy of Salary formula (Gửi IT).xlsx');
  await expect(page.locator('.doc-app-suffix')).toHaveText(' - Excel');

  // Search box
  const searchInput = page.locator('.excel-title-bar .search-box input');
  await expect(searchInput).toHaveAttribute('placeholder', 'Search');

  // NT Avatar
  const userAvatar = page.locator('.excel-user-avatar');
  await expect(userAvatar).toHaveText('NT');

  // Quick access buttons
  await expect(page.locator('#excel-btn-undo')).toBeVisible();

  // 2. Verify Ribbon Tabs Bar
  const ribbonTabs = page.locator('.excel-ribbon-tabs');
  await expect(ribbonTabs).toBeVisible();
  const homeTab = page.locator('.excel-ribbon-tabs .tab-item.active');
  await expect(homeTab).toHaveText('Home');

  const shareBtn = page.locator('.excel-share-btn');
  await expect(shareBtn).toBeVisible();
  await expect(shareBtn).toContainText('Share');

  // 3. Verify Ribbon Body & 8 Groups
  const groups = page.locator('.excel-ribbon-body .ribbon-group');
  expect(await groups.count()).toBe(8);

  // Group 1: Clipboard
  await expect(page.locator('.paste-btn-large')).toBeVisible();
  await expect(page.locator('.paste-btn-label')).toContainText('Paste');

  // Group 2: Font
  const fontSelect = page.locator('#excel-select-font-family');
  await expect(fontSelect.locator('option[value="Times New Roman"]')).toHaveText('Times New Roman');
  const sizeSelect = page.locator('#excel-select-font-size');
  await expect(sizeSelect.locator('option[value="10"]')).toHaveText('10');
  await expect(page.locator('#excel-btn-bold')).toBeVisible();

  // Group 3: Alignment
  await expect(page.locator('#excel-btn-wrap')).toContainText('Wrap Text');

  // Group 4: Number
  const numberSelect = page.locator('.ribbon-select.number-format');
  await expect(numberSelect).toHaveValue('Custom');

  // Group 5: Styles (Accent cards)
  const accent4 = page.locator('.style-card .accent4');
  await expect(accent4).toHaveText('Accent4');
  const accent5 = page.locator('.style-card .accent5');
  await expect(accent5).toHaveText('Accent5');
  const accent6 = page.locator('.style-card .accent6');
  await expect(accent6).toHaveText('Accent6');

  // Group 6: Cells
  await expect(page.locator('.cell-action-btn').first()).toContainText('Insert');

  // Group 7: Editing
  await expect(page.locator('.edit-action-btn').first()).toContainText('AutoSum');

  // Group 8: Add-ins
  await expect(page.locator('.addins-btn-large')).toContainText('Add-ins');

  // 4. Verify Formula Bar matching desktop Excel 365
  const formulaBar = page.locator('#main-formula-bar');
  await expect(formulaBar).toBeVisible();
  const cellAddress = page.locator('#active-cell-address');
  await expect(cellAddress).toBeVisible();
  await expect(page.locator('.formula-actions .cancel')).toBeVisible();
  await expect(page.locator('.formula-actions .enter')).toBeVisible();
  await expect(page.locator('.formula-actions .fx-symbol')).toHaveText('fx');
  const formulaInput = page.locator('#formula-input');
  await expect(formulaInput).toBeVisible();
  await expect(page.locator('.formula-expand-btn')).toBeVisible();
});

test('Cuộn lên tải các đoạn trước đó ngay lập tức mà không cần kéo xuống trước', async ({ page }) => {
  await page.goto('/excel.html');
  await page.locator('#file-pdf-input').setInputFiles(makeLongExcelStory());
  await expect(page.locator('#loading-spinner')).toBeHidden({ timeout: 20000 });

  // Jump deep into book so renderStartIndex > 0
  await page.evaluate(() => jumpToChunk(300));
  await page.waitForTimeout(1600);

  const startMetrics = await page.evaluate(() => ({
    renderStartIndex: state.renderStartIndex,
    currentGlobalIndex: state.currentGlobalIndex
  }));
  expect(startMetrics.renderStartIndex).toBeGreaterThan(100);

  // Scroll active container up to trigger upward loading
  await page.evaluate(() => {
    const container = document.getElementById('grid-scroll-container');
    container.scrollTop = 100;
    container.dispatchEvent(new Event('scroll'));
  });

  await expect.poll(async () => {
    return await page.evaluate(() => state.renderStartIndex);
  }, { timeout: 5000 }).toBeLessThan(startMetrics.renderStartIndex);
});

test('Lăn chuột lên khi ở đỉnh cũng kích hoạt tải các đoạn trước đó ngay lập tức', async ({ page }) => {
  await page.goto('/excel.html');
  await page.locator('#file-pdf-input').setInputFiles(makeLongExcelStory());
  await expect(page.locator('#loading-spinner')).toBeHidden({ timeout: 20000 });

  await page.evaluate(() => jumpToChunk(300));
  await page.waitForTimeout(1600);

  const startMetrics = await page.evaluate(() => ({
    renderStartIndex: state.renderStartIndex
  }));

  // Force container to scrollTop = 0 and send upward wheel event
  await page.evaluate(() => {
    const container = document.getElementById('grid-scroll-container');
    container.scrollTop = 0;
    window.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true }));
  });

  await expect.poll(async () => {
    return await page.evaluate(() => state.renderStartIndex);
  }, { timeout: 5000 }).toBeLessThan(startMetrics.renderStartIndex);
});

test('Tải vùng phía trước vẫn giữ nguyên điểm neo trên màn hình', async ({ page }) => {
  await page.goto('/excel.html');
  await page.locator('#file-pdf-input').setInputFiles(makeLongExcelStory());
  await expect(page.locator('#loading-spinner')).toBeHidden({ timeout: 20000 });

  await page.evaluate(() => jumpToChunk(300));
  await page.waitForTimeout(1700);

  const metrics = await page.evaluate(async () => {
    const container = document.getElementById('grid-scroll-container');
    const previousStart = state.renderStartIndex;
    container.scrollTop = 100;
    const anchor = container.querySelector(`[data-index="${previousStart}"]`);
    const beforeOffset = anchor.getBoundingClientRect().top - container.getBoundingClientRect().top;
    container.dispatchEvent(new Event('scroll'));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const restored = container.querySelector(`[data-index="${previousStart}"]`);
    return {
      previousStart,
      nextStart: state.renderStartIndex,
      beforeOffset,
      afterOffset: restored.getBoundingClientRect().top - container.getBoundingClientRect().top
    };
  });

  expect(metrics.nextStart).toBeLessThan(metrics.previousStart);
  expect(Math.abs(metrics.afterOffset - metrics.beforeOffset)).toBeLessThanOrEqual(2);
});

test('Wheel cuộn mượt theo nhiều frame ở cả chiều lên và xuống', async ({ page }) => {
  await page.goto('/excel.html');
  await page.locator('#file-pdf-input').setInputFiles(makeLongExcelStory());
  await expect(page.locator('#loading-spinner')).toBeHidden({ timeout: 20000 });

  await page.evaluate(() => jumpToChunk(300));
  await page.waitForTimeout(1700);

  const result = await page.evaluate(async () => {
    const container = document.getElementById('grid-scroll-container');
    container.scrollTop = Math.max(300, Math.min(900, (container.scrollHeight - container.clientHeight) / 3));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const sampleWheel = async deltaY => {
      const start = container.scrollTop;
      container.dispatchEvent(new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true }));
      const samples = [];
      for (let frame = 0; frame < 18; frame += 1) {
        await new Promise(resolve => requestAnimationFrame(resolve));
        samples.push(Math.round(container.scrollTop * 10) / 10);
      }
      return { start, end: container.scrollTop, samples };
    };

    const down = await sampleWheel(600);
    const up = await sampleWheel(-600);
    return { down, up };
  });

  const distinctDown = new Set(result.down.samples).size;
  const distinctUp = new Set(result.up.samples).size;
  console.log(`SMOOTH_WHEEL_METRICS ${JSON.stringify(result)}`);
  expect(result.down.end).toBeGreaterThan(result.down.start);
  expect(result.up.end).toBeLessThan(result.up.start);
  expect(distinctDown).toBeGreaterThan(4);
  expect(distinctUp).toBeGreaterThan(4);
});
