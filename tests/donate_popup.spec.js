const { test, expect } = require('@playwright/test');

test.describe('popup donate trang chủ', () => {
  test('hiện ảnh QR trong suốt và cho phép đóng bằng nút hoặc Escape', async ({ page }) => {
    await page.goto('/index.html?portal=1');

    const popup = page.locator('#donate-welcome-popup');
    const artwork = popup.locator('.donate-welcome-artwork');
    await expect(popup).toHaveClass(/show/);
    await expect(popup).toHaveAttribute('aria-hidden', 'false');
    await expect(artwork).toBeVisible();
    await expect(artwork).toHaveAttribute('src', /donate_kaito_popup\.png/);
    await expect(popup).toHaveCSS('pointer-events', 'none');

    await popup.locator('.donate-welcome-close').click();
    await expect(popup).not.toHaveClass(/show/);
    await expect(popup).toHaveAttribute('aria-hidden', 'true');

    await page.reload();
    await expect(popup).toHaveClass(/show/);
    await page.keyboard.press('Escape');
    await expect(popup).not.toHaveClass(/show/);
  });

  test('popup nằm gọn trong màn hình điện thoại', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/index.html?portal=1');

    const dialog = page.locator('.donate-welcome-dialog');
    await expect(page.locator('#donate-welcome-popup')).toHaveClass(/show/);
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    expect(box.y + box.height).toBeLessThanOrEqual(844);
  });
});
