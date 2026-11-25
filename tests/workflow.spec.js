const { test, expect } = require('@playwright/test');

test.describe('Workflow ERP Theme Tests', () => {
  test('verify authentic Workflow ERP (MOC.M02) manufacturing layout, reading stream, active row, and boss key', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });

    // 1. Visit workflow.html directly
    await page.goto('http://127.0.0.1:8080/workflow.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Verify Titlebar and Title
    await expect(page.locator('#workflow-doc-title')).toBeVisible();
    await expect(page.locator('#workflow-doc-title')).toContainText('MOC.M02');

    // Verify Menubar
    await expect(page.locator('.workflow-menubar')).toBeVisible();
    await expect(page.locator('.workflow-menubar')).toContainText('Xử lý (D)');

    // Verify Toolbar
    await expect(page.locator('.workflow-toolbar')).toBeVisible();

    // Verify Tabs and Form Master
    await expect(page.locator('.workflow-top-tabs .active')).toHaveText('Chi tiết');
    await expect(page.locator('.workflow-confirm-stamp')).toHaveText('CONFIRM');

    // Verify Form Fields
    await expect(page.locator('input[value="5112"]')).toBeVisible();
    await expect(page.locator('input[value="20261113024"]')).toBeVisible();
    await expect(page.locator('input[value="LA-5H5F-MAA-609"]')).toBeVisible();

    // Verify Middle Tabs
    await expect(page.locator('.workflow-mid-tabs .active')).toHaveText('Xem sơ qua DL');

    // Verify Master Grid
    await expect(page.locator('.workflow-master-table')).toBeVisible();

    // Verify Scroll Container and Reading Stream
    const scrollContainer = page.locator('#workflow-grid-scroll-container');
    await expect(scrollContainer).toBeVisible();

    // Wait for story stream rows
    const rows = page.locator('#workflow-story-stream .workflow-item-row');
    await expect(rows.first()).toBeVisible({ timeout: 5000 });
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);

    // Verify Active Row
    const activeRow = page.locator('#workflow-story-stream .active-workflow-row');
    await expect(activeRow).toBeVisible();

    // Verify Status bar (4 authentic panels)
    const statusBrowse = page.locator('.workflow-status-browse');
    await expect(statusBrowse).toBeVisible();
    await expect(statusBrowse).toHaveText('Browse');

    const statusCount = page.locator('#workflow-status-count');
    await expect(statusCount).toBeVisible();
    await expect(statusCount).toContainText('Số dòng dữ liệu nội dung:');

    const statusDetail = page.locator('#workflow-status-row-info');
    await expect(statusDetail).toBeVisible();

    const statusIp = page.locator('.workflow-status-ip');
    await expect(statusIp).toBeVisible();
    await expect(statusIp).toHaveText('127.0.0.1 : 211');

    // Capture visual screenshot
    await page.screenshot({ path: 'scratch/workflow_erp_verified.png', fullPage: false });

    // Test Boss Mode
    const bossBtn = page.locator('#btn-boss-key-workflow');
    await expect(bossBtn).toBeVisible();
    await bossBtn.click();
    await page.waitForTimeout(400);

    // Verify Boss View is now visible and Story View hidden
    const bossView = page.locator('#workflow-boss-view');
    await expect(bossView).toBeVisible();
    await expect(page.locator('#workflow-story-view')).not.toBeVisible();

    // Verify static authentic lines inside Boss view
    await expect(bossView.locator('text=CUR 英文文版新型警语棒(白底红字)')).toBeVisible();
    await expect(bossView.locator('text=SH-DA500AWS-AR5-003')).toBeVisible();

    // Capture screenshot in Boss Mode
    await page.screenshot({ path: 'scratch/workflow_erp_boss_mode.png', fullPage: false });

    // Exit Boss Mode
    await bossBtn.click();
    await page.waitForTimeout(400);
    await expect(bossView).not.toBeVisible();
    await expect(page.locator('#workflow-story-view')).toBeVisible();
  });

  test('verify index.html portal includes Workflow ERP theme', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });

    await page.goto('http://127.0.0.1:8080/index.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const themeItem = page.locator('.duo-mission-item[data-theme="theme-workflow"]');
    await expect(themeItem).toBeVisible();
    await expect(themeItem.locator('.duo-mission-title')).toHaveText('Workflow ERP');
  });
});
