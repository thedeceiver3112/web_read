const { test, expect } = require('@playwright/test');

const CHATGPT_CACHE = {
  cacheVersion: 3,
  processingComplete: true,
  documentName: 'bao-cao-tong-hop-q3.pdf',
  documentId: 'chatgpt-theme-regression',
  fileSize: 2048,
  fileType: 'pdf',
  chunks: Array.from({ length: 16 }, (_, index) => ({
    text: `Nội dung phân tích phần ${index + 1}. Các chỉ số vận hành được tổng hợp từ báo cáo quý và cần được đối chiếu trước khi trình bày trong cuộc họp.`,
    page: Math.floor(index / 4) + 1,
    indexInPage: index % 4,
    globalIndex: index
  })),
  rawText: '',
  pageStartIndices: { 1: 0, 2: 4, 3: 8, 4: 12 },
  documentToc: [],
  documentImages: {},
  totalPages: 4,
  currentPage: 1,
  currentGlobalIndex: 0,
  savedAt: Date.now()
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(cache => {
    sessionStorage.setItem('stealth_active_document_v2', JSON.stringify(cache));
  }, CHATGPT_CACHE);
});

test('theme ChatGPT giống bố cục web hiện tại và vẫn đọc được tài liệu', async ({ page }) => {
  await page.goto('/chatgpt.html');

  await expect(page.locator('.gpt-sidebar')).toBeVisible();
  await expect(page.locator('.gpt-wordmark')).toHaveText('ChatGPT');
  await expect(page.locator('.gpt-composer')).toBeVisible();
  await expect(page.locator('#chatgpt-story-stream .gpt-para')).toHaveCount(16);

  const layout = await page.evaluate(() => {
    const sidebar = document.querySelector('.gpt-sidebar').getBoundingClientRect();
    const topbar = document.querySelector('.gpt-topbar').getBoundingClientRect();
    const composer = document.querySelector('.gpt-composer').getBoundingClientRect();
    const thread = document.querySelector('.gpt-thread').getBoundingClientRect();
    const bodyStyle = getComputedStyle(document.body);
    return {
      sidebarWidth: sidebar.width,
      topbarY: topbar.y,
      composerWidth: composer.width,
      threadWidth: thread.width,
      bodyBackground: bodyStyle.backgroundColor,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    };
  });

  expect(layout.sidebarWidth).toBe(260);
  expect(layout.topbarY).toBe(0);
  expect(layout.composerWidth).toBeLessThanOrEqual(768);
  expect(layout.threadWidth).toBeLessThanOrEqual(768);
  expect(layout.bodyBackground).toBe('rgb(255, 255, 255)');
  expect(layout.horizontalOverflow).toBe(false);

  await page.screenshot({ path: test.info().outputPath('chatgpt-desktop.png'), fullPage: false });
});

test('theme ChatGPT không vỡ bố cục trên màn hình hẹp', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/chatgpt.html');

  await expect(page.locator('.gpt-sidebar')).toBeHidden();
  await expect(page.locator('.gpt-composer')).toBeVisible();
  await expect(page.locator('#chatgpt-story-stream .gpt-para').first()).toBeVisible();

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(horizontalOverflow).toBe(false);

  await page.screenshot({ path: test.info().outputPath('chatgpt-mobile.png'), fullPage: false });
});

test('theme ChatGPT hỗ trợ chuyển đổi giao diện Tối / Sáng và phím tắt Alt+D', async ({ page }) => {
  await page.goto('/chatgpt.html');

  // Initial state is Light Mode
  await expect(page.locator('body')).not.toHaveClass(/dark/);
  let bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe('rgb(255, 255, 255)');

  // Toggle to Dark Mode via topbar button
  await page.click('#gpt-theme-toggle');
  await expect(page.locator('body')).toHaveClass(/dark/);

  // Check dark mode styling
  const darkStyles = await page.evaluate(() => {
    const bodyStyle = getComputedStyle(document.body);
    const sidebar = document.querySelector('.gpt-sidebar');
    const composer = document.querySelector('.gpt-composer');
    const bubble = document.querySelector('.gpt-user-bubble');
    return {
      bodyBg: bodyStyle.backgroundColor,
      bodyColor: bodyStyle.color,
      sidebarBg: sidebar ? getComputedStyle(sidebar).backgroundColor : '',
      composerBg: composer ? getComputedStyle(composer).backgroundColor : '',
      bubbleBg: bubble ? getComputedStyle(bubble).backgroundColor : '',
      savedMode: localStorage.getItem('chatgpt_theme_mode')
    };
  });

  expect(darkStyles.bodyBg).toBe('rgb(33, 33, 33)');
  expect(darkStyles.sidebarBg).toBe('rgb(23, 23, 23)');
  expect(darkStyles.composerBg).toBe('rgb(47, 47, 47)');
  expect(darkStyles.bubbleBg).toBe('rgb(47, 47, 47)');
  expect(darkStyles.savedMode).toBe('dark');

  await page.screenshot({ path: test.info().outputPath('chatgpt-dark-desktop.png'), fullPage: false });

  // Toggle back to Light Mode via Alt+D
  await page.keyboard.press('Alt+KeyD');
  await expect(page.locator('body')).not.toHaveClass(/dark/);

  bg = await page.evaluate(() => {
    return {
      bodyBg: getComputedStyle(document.body).backgroundColor,
      savedMode: localStorage.getItem('chatgpt_theme_mode')
    };
  });
  expect(bg.bodyBg).toBe('rgb(255, 255, 255)');
  expect(bg.savedMode).toBe('light');
});

test('theme ChatGPT lưu và khôi phục giao diện tối khi tải lại trang và qua user menu', async ({ page }) => {
  // Pre-set localStorage to dark mode
  await page.addInitScript(() => {
    localStorage.setItem('chatgpt_theme_mode', 'dark');
  });

  await page.goto('/chatgpt.html');

  // Should immediately be in dark mode
  await expect(page.locator('body')).toHaveClass(/dark/);
  const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(darkBg).toBe('rgb(33, 33, 33)');

  // Open user menu
  await page.click('#gpt-user-btn');
  await expect(page.locator('#gpt-user-menu')).toBeVisible();

  // Click dark mode toggle in user menu to switch back to light
  await page.click('#gpt-menu-theme-toggle');
  await expect(page.locator('body')).not.toHaveClass(/dark/);
  const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(lightBg).toBe('rgb(255, 255, 255)');
});

