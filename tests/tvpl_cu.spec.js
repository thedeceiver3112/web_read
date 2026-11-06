const { test, expect } = require('@playwright/test');

test.describe('Thu Vien Phap Luat (Cu) Classic Decree Document Tests', () => {
  test('verify classic decree layout, clause rendering with Dieu 1, active clause highlighting, and boss key', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });

    // 1. Visit thuvienphapluat-cu.html directly
    await page.goto('http://127.0.0.1:8080/thuvienphapluat-cu.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Verify document scroll container
    const tvplScroll = page.locator('#tvpl-document-scroll-container');
    await expect(tvplScroll).toBeVisible();

    // Verify classic 3-column layout structure
    await expect(page.locator('.tvpl-col-left-sidebar')).toBeVisible();
    await expect(page.locator('.tvpl-col-right-sidebar')).toBeVisible();
    await expect(page.locator('.tvpl-col-center-viewport')).toBeVisible();

    // Verify brand header
    await expect(page.locator('.tvpl-brand-headline')).toHaveText('THƯ VIỆN PHÁP LUẬT');
    await expect(page.locator('.tvpl-slogan-italic')).toContainText('loại rủi ro pháp lý');

    // Verify National Emblem and Decree Header
    await expect(page.locator('#tvpl-story-view .tvpl-doc-state-head')).toBeVisible();
    await expect(page.locator('#tvpl-story-view .country-title')).toContainText('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM');
    await expect(page.locator('#tvpl-doc-title')).toBeVisible();

    // Verify clauses stream
    const clauses = page.locator('.tvpl-clause-item');
    await expect(clauses.first()).toBeVisible({ timeout: 5000 });
    const count = await clauses.count();
    expect(count).toBeGreaterThan(0);

    // Verify classic "Điều 1." format
    const firstNum = clauses.first().locator('.tvpl-clause-num');
    await expect(firstNum).toContainText('Điều 1.');

    // Check active clause highlighting
    const activeClause = page.locator('.tvpl-clause-item.active-clause');
    await expect(activeClause).toBeVisible();

    // Take screenshot of classic layout
    await page.screenshot({ path: 'scratch/tvpl_cu_view.png', fullPage: false });

    // Test Boss key button
    const bossBtn = page.locator('#btn-boss-key-thuvienphapluat-cu');
    await expect(bossBtn).toBeVisible();
    await bossBtn.click();
    await page.waitForTimeout(400);

    const bossView = page.locator('#tvpl-boss-view');
    await expect(bossView).toBeVisible();

    // Exit boss view
    await bossBtn.click();
    await page.waitForTimeout(400);
    await expect(bossView).not.toBeVisible();
  });

  test('verify index.html portal theme picker includes Thu Vien Phap Luat (cu)', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });

    await page.goto('http://127.0.0.1:8080/index.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const themeItem = page.locator('.duo-mission-item[data-theme="theme-thuvienphapluat-cu"]');
    await expect(themeItem).toBeVisible();
    await expect(themeItem.locator('.duo-mission-title')).toHaveText('Thư Viện Pháp Luật (cũ)');
  });
});
