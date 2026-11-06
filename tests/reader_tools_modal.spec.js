const { test, expect } = require('@playwright/test');

test.describe('Reader tools workspace', () => {
  test('groups reading tools into a logical desktop side navigation', async ({ page }, testInfo) => {
    await page.goto('/googlesheets.html');
    await page.locator('#univ-btn-tools').click();

    const modal = page.locator('#reader-tools-modal');
    const tabs = modal.locator('[data-reader-tab]');
    await expect(modal).toHaveClass(/open/);
    await expect(modal.locator('.reader-tools-tab-group-label')).toHaveText(['Điều hướng', 'Tài liệu', 'Hiển thị']);
    await expect(tabs).toHaveCount(5);
    expect(await tabs.evaluateAll(items => items.map(item => item.dataset.readerTab))).toEqual([
      'toc', 'search', 'bookmarks', 'library', 'layout'
    ]);

    const searchTab = modal.locator('[data-reader-tab="search"]');
    await expect(searchTab).toHaveAttribute('aria-selected', 'true');
    await expect(modal.locator('#reader-tools-panel-title')).toHaveText('Tìm trong tài liệu');

    const workspaceColumns = await modal.locator('.reader-tools-workspace').evaluate(element => getComputedStyle(element).gridTemplateColumns);
    expect(workspaceColumns.split(' ').length).toBe(2);

    await modal.locator('[data-reader-tab="toc"]').focus();
    await page.keyboard.press('ArrowDown');
    await expect(searchTab).toBeFocused();
    await expect(searchTab).toHaveAttribute('aria-selected', 'true');

    await modal.locator('[data-reader-tab="layout"]').click();
    await expect(modal.locator('#reader-tools-panel-title')).toHaveText('Hiển thị & bố cục');
    await expect(modal.locator('.reader-tools-preview-box')).toBeVisible();
    const layoutColors = await modal.locator('.unav-layout-card-option').evaluateAll(cards => cards.map(card => getComputedStyle(card).backgroundColor));
    expect(layoutColors).not.toContain('rgb(15, 23, 42)');
    await expect(modal.locator('.unav-layout-card-option.active')).toHaveCSS('background-color', 'rgb(221, 244, 255)');
    await expect(modal.locator('.unav-layout-select').first()).toHaveCSS('background-color', 'rgb(255, 255, 255)');

    await modal.locator('.reader-tools-dialog').screenshot({ path: testInfo.outputPath('reader-tools-desktop.png') });
  });

  test('uses a scrollable horizontal tool switcher on mobile', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/googlesheets.html');
    await page.locator('#univ-btn-tools').click();

    const modal = page.locator('#reader-tools-modal');
    await expect(modal.locator('.reader-tools-tab-group-label').first()).toBeHidden();
    await expect(modal.locator('.reader-tools-tabs')).toHaveCSS('display', 'flex');
    await expect(modal.locator('.reader-tools-dialog')).toHaveCSS('border-radius', '0px');
    const dialogBox = await modal.locator('.reader-tools-dialog').boundingBox();
    expect(dialogBox.x).toBe(0);
    expect(dialogBox.width).toBe(390);

    await modal.locator('[data-reader-tab="bookmarks"]').click();
    await expect(modal.locator('#reader-tools-panel-title')).toHaveText('Dấu trang');

    const overflow = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth
    }));
    expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.viewportWidth);
    await modal.locator('.reader-tools-dialog').screenshot({ path: testInfo.outputPath('reader-tools-mobile.png') });
  });
});
