const { test, expect } = require('@playwright/test');

test.describe('Theme Adobe InDesign CC 2026', () => {
  test('InDesign theme loads authentic UI, dual-paper spread (image + story), image replacement, and boss mode', async ({ page }) => {
    await page.goto('/indesign.html');
    await page.waitForLoadState('domcontentloaded');

    // 1. Verify Application Bar & Native Menu items
    await expect(page.locator('.id-app-icon')).toBeVisible();
    await expect(page.locator('.id-menu-bar')).toContainText('File');
    await expect(page.locator('.id-menu-bar')).toContainText('Layout');
    await expect(page.locator('.id-menu-bar')).toContainText('Type');
    await expect(page.locator('.id-btn-publish')).toContainText('Publish Online');
    await expect(page.locator('.id-workspace-dropdown')).toContainText('Essentials');

    // 2. Verify Control Bar & Tools & Rulers
    await expect(page.locator('.id-control-bar')).toBeVisible();
    await expect(page.locator('.id-proxy-grid')).toBeVisible();
    await expect(page.locator('.id-ruler-horizontal')).toBeVisible();
    await expect(page.locator('.id-ruler-vertical')).toBeVisible();
    await expect(page.locator('.id-tools-panel')).toBeVisible();
    await expect(page.locator('.id-right-sidebar')).toBeVisible();

    // 3. Verify Status Bar & Preflight
    const preflight = page.locator('#btn-boss-key-indesign');
    await expect(preflight).toBeVisible();
    await expect(preflight).toContainText('No errors');

    // 4. Verify Favicon
    const faviconHref = await page.getAttribute('#app-favicon', 'href');
    expect(faviconHref).toContain('data:image/svg+xml');
    expect(faviconHref).toContain('%2333001A'); // InDesign dark maroon background
    expect(faviconHref).toContain('%23FF3366'); // InDesign hot magenta

    // 5. Verify Two-Paper Facing Spread
    const spreadView = page.locator('#id-spread-view');
    await expect(spreadView).toBeVisible();

    // Left Column: 2 A4 Landscape Papers Stacked (Paper 1 & Paper 2)
    const leftCol = page.locator('#id-column-left');
    await expect(leftCol).toBeVisible();

    // Paper 1 (Top Image Paper)
    const leftPaper = page.locator('#id-paper-left');
    await expect(leftPaper).toBeVisible();
    const placedImg = page.locator('#id-placed-image');
    await expect(placedImg).toBeVisible();
    await expect(leftPaper.locator('#id-content-grabber')).toBeVisible();
    await expect(leftPaper.locator('.id-link-badge')).toContainText('300 ppi');

    // Test Image Replacement on Paper 1
    const presetBtn = leftPaper.locator('.id-preset-btn[data-src*="photoshop_campaign_visual.png"]');
    await expect(presetBtn).toBeVisible();
    await presetBtn.click();
    await expect(placedImg).toHaveAttribute('src', /photoshop_campaign_visual\.png/);
    await expect(page.locator('#id-image-filename')).toHaveText('photoshop_campaign_visual.png');

    // Paper 2 (Bottom A4 Landscape Paper - Khoanh đỏ)
    const leftPaper2 = page.locator('#id-paper-left-2');
    await expect(leftPaper2).toBeVisible();
    const placedImg2 = page.locator('#id-placed-image-2');
    await expect(placedImg2).toBeVisible();
    await expect(leftPaper2.locator('#id-content-grabber-2')).toBeVisible();
    await expect(leftPaper2.locator('.id-link-badge')).toContainText('300 ppi');

    // Verify both images are styled to display full (100% width, 100% height, object-fit: cover)
    const img1ObjectFit = await placedImg.evaluate(el => window.getComputedStyle(el).objectFit);
    const img2ObjectFit = await placedImg2.evaluate(el => window.getComputedStyle(el).objectFit);
    expect(img1ObjectFit).toBe('cover');
    expect(img2ObjectFit).toBe('cover');

    // Test Image Replacement on Paper 2
    const presetBtn2 = leftPaper2.locator('.id-preset-btn-2[data-src*="header-anime-modern-clean.jpg"]');
    await expect(presetBtn2).toBeVisible();
    await presetBtn2.click();
    await expect(placedImg2).toHaveAttribute('src', /header-anime-modern-clean\.jpg/);
    await expect(page.locator('#id-image-filename-2')).toHaveText('header-anime-modern-clean.jpg');

    // Right Paper: Story Reading Paper ("1 paper hiện nội dung truyện")
    const rightPaper = page.locator('#id-paper-right');
    await expect(rightPaper).toBeVisible();
    const storyStream = page.locator('#id-story-stream');
    await expect(storyStream).toBeVisible();

    // Verify single-column layout (1 cột theo yêu cầu người dùng)
    const columnCount = await storyStream.evaluate(el => window.getComputedStyle(el).columnCount);
    expect(columnCount).toBe('1');

    // 6. Stream Novel Text Chunks
    const paragraphs = [];
    for (let i = 1; i <= 60; i++) {
      paragraphs.push(`Đoạn văn biên tập thứ ${i}: Đây là nội dung truyện kiểm thử trình bày trên trang đôi tạp chí InDesign CC 2026.`);
    }
    const sampleTxt = paragraphs.join('\n');

    await page.evaluate((txt) => {
      const file = new File([txt], 'sample_indesign_novel.txt', { type: 'text/plain' });
      const input = document.getElementById('file-pdf-input');
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, sampleTxt);

    // Verify novel paragraphs stream into #id-story-stream
    const storyParas = page.locator('#id-story-stream .id-story-paragraph');
    await expect(storyParas.first()).toBeVisible({ timeout: 5000 });
    const count = await storyParas.count();
    expect(count).toBeGreaterThanOrEqual(10);

    // Click paragraph to set active
    await storyParas.nth(2).click();
    await expect(storyParas.nth(2)).toHaveClass(/active-paragraph/);

    // 6b. Verify Font Size Controls and Vietnamese Typography
    const firstPara = storyParas.first();
    const initialFs = await firstPara.evaluate(el => parseFloat(window.getComputedStyle(el).fontSize));

    // Test increase font size (+)
    await page.locator('#id-btn-font-inc').click();
    const incFs = await firstPara.evaluate(el => parseFloat(window.getComputedStyle(el).fontSize));
    expect(incFs).toBeGreaterThan(initialFs);

    // Test decrease font size (-)
    await page.locator('#id-btn-font-dec').click();
    await page.locator('#id-btn-font-dec').click();
    const decFs = await firstPara.evaluate(el => parseFloat(window.getComputedStyle(el).fontSize));
    expect(decFs).toBeLessThan(incFs);

    // Test select dropdown font size (16pt)
    await page.locator('#id-select-font-size').selectOption('16');
    const selectFs = await firstPara.evaluate(el => parseFloat(window.getComputedStyle(el).fontSize));
    expect(selectFs).toBeGreaterThan(decFs);

    // 7. Verify Enlarged Sidebar & Navbar Dimensions
    const titleBarBox = await page.locator('.id-title-bar').boundingBox();
    const controlBarBox = await page.locator('.id-control-bar').boundingBox();
    const toolsBox = await page.locator('.id-tools-panel').boundingBox();
    const dockBox = await page.locator('.id-right-sidebar').boundingBox();
    const leftPaperBox = await page.locator('#id-paper-left').boundingBox();

    expect(titleBarBox.height).toBeGreaterThanOrEqual(36);
    expect(controlBarBox.height).toBeGreaterThanOrEqual(40);
    expect(toolsBox.width).toBeGreaterThanOrEqual(65);
    expect(dockBox.width).toBeGreaterThanOrEqual(50);
    // Aspect ratio of A4 Landscape is ~1.375 - 1.42 (e.g. 660 / 480 = 1.375)
    expect(leftPaperBox.width / leftPaperBox.height).toBeGreaterThan(1.3);

    // 8. Verify Sticky Pinning of Left Column (Paper 1 & Paper 2) during Scroll
    const scrollContainer = page.locator('#id-canvas-scroll-container');
    const initialTops = await page.evaluate(() => {
      const c = document.getElementById('id-canvas-scroll-container');
      const leftCol = document.getElementById('id-column-left');
      const right = document.getElementById('id-paper-right');
      const cRect = c.getBoundingClientRect();
      const lRect = leftCol.getBoundingClientRect();
      const rRect = right.getBoundingClientRect();
      return {
        leftTop: lRect.top - cRect.top,
        rightTop: rRect.top - cRect.top
      };
    });

    // Assert that Paper 1 and Right Paper tops are perfectly level horizontally (căn bằng nhau)
    expect(initialTops.leftTop).toBe(initialTops.rightTop);

    // Take screenshot at top of spread
    await page.screenshot({ path: 'static/indesign_spread_reading.png' });

    // Scroll down 600px inside the canvas scroll container
    await page.evaluate(() => {
      const c = document.getElementById('id-canvas-scroll-container');
      c.scrollTop = 600;
    });
    await page.waitForTimeout(300);

    const scrolledTops = await page.evaluate(() => {
      const c = document.getElementById('id-canvas-scroll-container');
      const leftCol = document.getElementById('id-column-left');
      const right = document.getElementById('id-paper-right');
      const cRect = c.getBoundingClientRect();
      const lRect = leftCol.getBoundingClientRect();
      const rRect = right.getBoundingClientRect();
      return {
        leftTop: lRect.top - cRect.top,
        rightTop: rRect.top - cRect.top
      };
    });

    // Left column remains sticky pinned at top (~24px), within 5px tolerance
    expect(Math.abs(scrolledTops.leftTop - initialTops.leftTop)).toBeLessThan(5);
    // While right paper has scrolled up significantly
    expect(scrolledTops.rightTop).toBeLessThan(initialTops.rightTop - 500);

    // Take screenshot while scrolled down to verify image is still pinned
    await page.screenshot({ path: 'static/indesign_scroll_sticky.png' });

    // 9. Verify Boss Mode (Esc / F2)
    const bossView = page.locator('#id-boss-view');
    await expect(bossView).toBeHidden();

    // Trigger Boss Key
    await preflight.click();
    await expect(bossView).toBeVisible();
    await expect(spreadView).toBeHidden();
    await expect(bossView).toContainText('CORPORATE SUSTAINABILITY');

    // Toggle back to reading
    await preflight.click();
    await expect(bossView).toBeHidden();
    await expect(spreadView).toBeVisible();
  });

  test('Portal home lists InDesign theme card and navigates to indesign.html', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const indesignCard = page.locator('#portal-theme-list .duo-mission-item[data-theme="theme-indesign"]');
    await expect(indesignCard).toBeVisible();
    await expect(indesignCard.locator('.duo-mission-title')).toHaveText('InDesign');

    // Click card to select
    await indesignCard.click();
    await expect(indesignCard).toHaveClass(/selected/);
  });
});
