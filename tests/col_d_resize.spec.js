const { test, expect } = require('@playwright/test');

test.describe('Spreadsheet Column D Resizing (Google Sheets & Excel)', () => {

  test.beforeEach(async ({ page }) => {
    // Clear custom width before each test
    await page.addInitScript(() => {
      localStorage.removeItem('stealth_col_d_width');
    });
  });

  test('Column D initializes with comfortable default width and Column H exists with title', async ({ page }) => {
    await page.goto('/googlesheets.html');
    await page.waitForLoadState('domcontentloaded');

    const thD = page.locator('#th-col-d');
    await expect(thD).toBeVisible();

    const handle = thD.locator('.col-resize-handle');
    await expect(handle).toBeVisible();

    const thH = page.locator('#th-col-filler');
    await expect(thH).toBeVisible();

    const thTitleH = page.locator('#th-title-filler');
    await expect(thTitleH).toBeVisible();
    await expect(thTitleH).toHaveText('Action / Remarks');

    const width = await thD.evaluate(el => el.getBoundingClientRect().width);
    // Default is 680px
    expect(width).toBeGreaterThanOrEqual(600);
    expect(width).toBeLessThanOrEqual(750);
  });

  test('Dragging col-resize-handle resizes Column D and persists to localStorage', async ({ page }) => {
    await page.goto('/googlesheets.html');
    await page.waitForLoadState('domcontentloaded');

    const handle = page.locator('#th-col-d .col-resize-handle');
    const handleBox = await handle.boundingBox();
    expect(handleBox).not.toBeNull();

    const initialWidth = await page.locator('#th-col-d').evaluate(el => el.getBoundingClientRect().width);

    // Drag handle by +120px to the right
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + handleBox.width / 2 + 120, handleBox.y + handleBox.height / 2, { steps: 5 });
    await page.mouse.up();

    const newWidth = await page.locator('#th-col-d').evaluate(el => el.getBoundingClientRect().width);
    expect(newWidth).toBeGreaterThan(initialWidth + 80);

    const savedWidth = await page.evaluate(() => localStorage.getItem('stealth_col_d_width'));
    expect(savedWidth).toContain('px');
  });

  test('Double-clicking col-resize-handle toggles between auto and fixed width', async ({ page }) => {
    await page.goto('/googlesheets.html');
    await page.waitForLoadState('domcontentloaded');

    const handle = page.locator('#th-col-d .col-resize-handle');

    // Double click to toggle to auto
    await handle.dblclick();

    let saved = await page.evaluate(() => localStorage.getItem('stealth_col_d_width'));
    expect(saved).toBe('auto');

    // Double click again to toggle back to 680px
    await handle.dblclick();
    saved = await page.evaluate(() => localStorage.getItem('stealth_col_d_width'));
    expect(saved).toBe('680px');
  });

  test('Right-clicking Column D opens resize dialog and preset changes width', async ({ page }) => {
    await page.goto('/googlesheets.html');
    await page.waitForLoadState('domcontentloaded');

    // Right click on th-col-d
    await page.locator('#th-col-d').click({ button: 'right' });

    const dialog = page.locator('#col-d-dialog-overlay');
    await expect(dialog).toBeVisible();

    // Select 500px preset
    const preset500 = dialog.locator('button[data-width="500"]');
    await expect(preset500).toBeVisible();
    await preset500.click();

    // Click Save
    await dialog.locator('#col-d-dialog-save').click();
    await expect(dialog).toBeHidden();

    const width = await page.locator('#th-col-d').evaluate(el => el.getBoundingClientRect().width);
    expect(Math.round(width)).toBe(500);

    const saved = await page.evaluate(() => localStorage.getItem('stealth_col_d_width'));
    expect(saved).toBe('500px');
  });

  test('Settings modal allows adjusting Column D width via slider and buttons', async ({ page }) => {
    await page.goto('/googlesheets.html');
    await page.waitForLoadState('domcontentloaded');

    // Open settings modal
    await page.evaluate(() => openModal());

    const modal = page.locator('#stealth-modal');
    await expect(modal).toBeVisible();

    const slider = modal.locator('#modal-slider-col-d-width');
    await expect(slider).toBeVisible();

    // Click decrease button
    const decBtn = modal.locator('#modal-btn-col-d-dec');
    await decBtn.click();

    const width = await page.locator('#th-col-d').evaluate(el => el.getBoundingClientRect().width);
    expect(width).toBeLessThan(680);

    // Click Auto button
    const autoBtn = modal.locator('#modal-btn-col-d-auto');
    await autoBtn.click();

    const saved = await page.evaluate(() => localStorage.getItem('stealth_col_d_width'));
    expect(saved).toBe('auto');
  });

  test('Works smoothly in Excel theme as well', async ({ page }) => {
    await page.goto('/excel.html');
    await page.waitForLoadState('domcontentloaded');

    const thD = page.locator('#th-col-d');
    await expect(thD).toBeVisible();
    await expect(thD.locator('.col-resize-handle')).toBeVisible();

    const thH = page.locator('#th-col-filler');
    await expect(thH).toBeVisible();

    const thTitleH = page.locator('#th-title-filler');
    await expect(thTitleH).toBeVisible();
    await expect(thTitleH).toHaveText('Action / Remarks');

    const width = await thD.evaluate(el => el.getBoundingClientRect().width);
    expect(width).toBeGreaterThanOrEqual(600);
  });

  test('Column H data cells are populated with realistic remark text and not empty', async ({ page }) => {
    await page.goto('/googlesheets.html');
    await page.waitForLoadState('domcontentloaded');

    // Load sample text
    await page.locator('#file-pdf-input').setInputFiles({
      name: 'test-story.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Đoạn văn 1 mẫu.\n\nĐoạn văn 2 mẫu.\n\nĐoạn văn 3 mẫu.', 'utf8')
    });
    await expect(page.locator('#loading-spinner')).toBeHidden({ timeout: 10000 });

    const fillerCells = page.locator('.col-filler-cell');
    await expect(fillerCells.first()).toBeVisible();

    const firstCellText = await fillerCells.first().textContent();
    expect(firstCellText.trim().length).toBeGreaterThan(0);

    const count = await fillerCells.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });
});
