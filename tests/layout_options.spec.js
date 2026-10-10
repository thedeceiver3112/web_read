const { test, expect } = require('@playwright/test');

function makeRawLineTextFile() {
  const lines = [
    'Dòng 1: Ngọn gió heo may thổi qua con phố nhỏ.',
    'Dòng 2: Ánh nắng ban mai len lỏi qua từng kẽ lá bàng.',
    'Dòng 3: Nam cất bước chân chậm rãi trên con đường quen thuộc về phía tòa nhà văn phòng.',
    'Dòng 4: Một ngày làm việc mới lại bắt đầu cùng những dòng báo cáo và số liệu.',
    'Dòng 5: Anh mở máy tính và chuẩn bị kiểm tra tài liệu đối soát.'
  ];
  return {
    name: 'truyen-ngan.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(lines.join('\n'), 'utf8')
  };
}

test.describe('Layout & Line Customizer Options', () => {
  test('allows switching layout modes and toggling exact line layout from universal navbar', async ({ page }, testInfo) => {
    await page.goto('/googlesheets.html');
    await expect(page.locator('#universal-reader-navbar')).toBeVisible();

    // 1. Upload sample text file
    await page.locator('#file-pdf-input').setInputFiles(makeRawLineTextFile());
    await expect(page.locator('#loading-spinner')).toBeHidden({ timeout: 15000 });

    // 2. Open layout dropdown on universal navbar
    const btnLayout = page.locator('#univ-btn-layout-options');
    await expect(btnLayout).toBeVisible();
    await btnLayout.click();

    const menu = page.locator('#univ-layout-dropdown-menu');
    await expect(menu).toBeVisible();

    // Take screenshot of open layout menu
    await page.screenshot({ path: testInfo.outputPath('layout_dropdown_open.png') });

    // 3. Switch to exact layout mode (Giữ nguyên dòng gốc)
    const exactOpt = menu.locator('[data-layout-mode="exact"]');
    await expect(exactOpt).toBeVisible();
    await exactOpt.click();

    // Check state and CSS applied to story cells
    const layoutMode = await page.evaluate(() => state.layoutMode);
    expect(layoutMode).toBe('exact');

    const firstCell = page.locator('.story-cell').first();
    await expect(firstCell).toBeVisible();
    const whiteSpace = await firstCell.evaluate(el => window.getComputedStyle(el).whiteSpace);
    expect(['nowrap', 'pre']).toContain(whiteSpace);

    // 4. Switch to wrap mode
    await btnLayout.click();
    await expect(menu).toBeVisible();
    const wrapOpt = menu.locator('[data-layout-mode="wrap"]');
    await wrapOpt.click();

    const layoutModeWrap = await page.evaluate(() => state.layoutMode);
    expect(layoutModeWrap).toBe('wrap');

    const whiteSpaceWrap = await firstCell.evaluate(el => window.getComputedStyle(el).whiteSpace);
    expect(whiteSpaceWrap).toBe('normal');

    // 5. Open Reader Tools modal and test Bố cục tab
    await page.locator('#univ-btn-tools').click();
    const toolsModal = page.locator('#reader-tools-modal');
    await expect(toolsModal).toHaveClass(/open/);

    const layoutTab = toolsModal.locator('[data-reader-tab="layout"]');
    await expect(layoutTab).toBeVisible();
    await layoutTab.click();

    await expect(toolsModal.locator('.reader-tools-preview-box')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('reader_tools_layout_tab.png') });

    // 6. Verify section-break-row is never rendered in Google Sheets
    await expect(page.locator('.section-break-row')).toHaveCount(0);

    // 7. Switch to Excel theme and verify section-break-row is also absent
    await page.goto('/excel.html');
    await expect(page.locator('.section-break-row')).toHaveCount(0);
  });
});
