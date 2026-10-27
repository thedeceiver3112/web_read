const { test, expect } = require('@playwright/test');

test.describe('Thu Vien Phap Luat Authentic Portal Tests', () => {
  test('verify TVPL authentic homepage layout, reading stream, dark mode, and scroll stability', async ({ page }) => {
    // Set viewport to comfortable desktop resolution
    await page.setViewportSize({ width: 1400, height: 900 });

    await page.goto('http://127.0.0.1:8080/thuvienphapluat.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const tvplScroll = page.locator('#tvpl-document-scroll-container');
    await expect(tvplScroll).toBeVisible();

    // 1. Initial Load: Check that scrollTop starts at top
    const initialScrollTop = await tvplScroll.evaluate(el => el.scrollTop);
    expect(initialScrollTop).toBeLessThanOrEqual(5);

    // Verify 960px authentic portal shell and header elements
    const tblContainer = page.locator('#tblcontainer');
    await expect(tblContainer).toBeVisible();

    const portalHeader = page.locator('#header');
    await expect(portalHeader).toBeVisible();
    await expect(page.locator('.tvpl-header-brand-title')).toBeVisible();

    // Verify Search Area and tabs
    const searchArea = page.locator('#dvSearchHome');
    await expect(searchArea).toBeVisible();
    await expect(page.locator('#idTabs-Home-tab')).toBeVisible();

    // Verify Left Column 25 Legal Utilities
    const leftControl = page.locator('.homeLeftControl');
    await expect(leftControl).toBeVisible();
    await expect(page.locator('.divTienIch')).toBeVisible();
    const utilityItems = page.locator('.tvpl-utility-item');
    expect(await utilityItems.count()).toBe(25);

    // Verify Middle Column Stream: "VĂN BẢN PHÁP LUẬT MỚI"
    const streamHeader = page.locator('.title-center-badge');
    await expect(streamHeader).toHaveText('VĂN BẢN PHÁP LUẬT MỚI');

    // Wait for reading clauses to load
    const clauses = page.locator('.tvpl-clause-item');
    await expect(clauses.first()).toBeVisible({ timeout: 5000 });
    const count = await clauses.count();
    expect(count).toBeGreaterThan(0);

    // Check authentic clause structure (.left-col, .right-col, hot badge, legal metadata)
    const firstClause = clauses.first();
    await expect(firstClause.locator('.left-col')).toBeVisible();
    await expect(firstClause.locator('.right-col')).toBeVisible();
    await expect(firstClause.locator('.tvpl-law-title-text')).toBeVisible();

    // 2. Idle Stability: Wait 1.5 seconds with no interaction and verify it does NOT auto-scroll by itself
    await page.waitForTimeout(1500);
    const idleScrollTop = await tvplScroll.evaluate(el => el.scrollTop);
    expect(idleScrollTop).toBe(initialScrollTop);

    // 3. Wheel scrolling inside reading container
    await page.mouse.move(700, 400);
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(300);

    const scrolledDownTop = await tvplScroll.evaluate(el => el.scrollTop);
    expect(scrolledDownTop).toBeGreaterThan(50);

    // Verify scroll settles cleanly without runaway drift
    await page.waitForTimeout(800);
    const settledTop = await tvplScroll.evaluate(el => el.scrollTop);
    expect(Math.abs(settledTop - scrolledDownTop)).toBeLessThanOrEqual(5);

    // 4. Direction Reversal: Scrolling UP immediately decreases scrollTop
    await page.mouse.wheel(0, -150);
    await page.waitForTimeout(300);
    const scrolledUpTop = await tvplScroll.evaluate(el => el.scrollTop);
    expect(scrolledUpTop).toBeLessThan(settledTop);

    // 5. Clicking a clause highlights it with active-clause without jarring page jump
    const targetClause = clauses.nth(2);
    await expect(targetClause).toBeVisible();
    const beforeClickScrollTop = await tvplScroll.evaluate(el => el.scrollTop);
    await targetClause.click();
    await page.waitForTimeout(300);
    const afterClickScrollTop = await tvplScroll.evaluate(el => el.scrollTop);
    expect(Math.abs(afterClickScrollTop - beforeClickScrollTop)).toBeLessThan(30);
    await expect(targetClause).toHaveClass(/active-clause/);

    // Take screenshot of authentic Light Mode
    await page.screenshot({ path: 'static/tvpl_portal_light_verified.png' });

    // 6. Test Dark Mode Toggle
    const dmBtn = page.locator('#btn-tvpl-darkmode');
    await expect(dmBtn).toBeVisible();
    await dmBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator('body')).toHaveClass(/dark-mode/);

    // Take screenshot of authentic Dark Mode
    await page.screenshot({ path: 'static/tvpl_portal_dark_verified.png' });

    // Toggle back to Light Mode
    await dmBtn.click();
    await page.waitForTimeout(200);
    await expect(page.locator('body')).not.toHaveClass(/dark-mode/);
  });
});
