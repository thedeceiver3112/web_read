const { test, expect } = require('@playwright/test');

test.describe('popup donate trang chủ', () => {
  test('ẩn trong hôm nay qua reload/tab mới và cho phép hiện lại ngày hôm sau', async ({ page, context }) => {
    await page.goto('/index.html?portal=1');
    const popup = page.locator('#donate-welcome-popup');
    await expect(popup).toHaveClass(/show/);
    await page.getByLabel('Không hiển thị lại trong hôm nay').check();
    await popup.locator('.donate-welcome-close').click();
    // Even after the usual five-minute cooldown, the daily preference wins.
    await page.evaluate(() => sessionStorage.removeItem('stealth_donate_popup_last_shown'));
    await page.reload();
    await expect(page.locator('#btn-force-version-reload')).toBeAttached();
    expect(await page.evaluate(() => canShowDonateWelcomePopup())).toBe(false);
    await expect(popup).not.toHaveClass(/show/);
    const second = await context.newPage();
    await second.goto('/index.html?portal=1');
    await expect(second.locator('#btn-force-version-reload')).toBeAttached();
    expect(await second.evaluate(() => canShowDonateWelcomePopup())).toBe(false);
    await second.close();
    await page.evaluate(() => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      localStorage.setItem('stealth_donate_popup_hidden_day', `${yesterday.getFullYear()}-${yesterday.getMonth() + 1}-${yesterday.getDate()}`);
    });
    await page.reload();
    await expect(popup).toHaveClass(/show/);
    await page.getByLabel('Không hiển thị lại trong hôm nay').check();
    await page.getByLabel('Không hiển thị lại trong hôm nay').uncheck();
    expect(await page.evaluate(() => localStorage.getItem('stealth_donate_popup_hidden_day'))).toBeNull();
  });

  test('hiện ảnh QR, đóng được và chỉ hiện lại sau cooldown 5 phút', async ({ page }) => {
    await page.goto('/index.html?portal=1');

    const popup = page.locator('#donate-welcome-popup');
    const artwork = popup.locator('.donate-welcome-artwork');
    await expect(popup).toHaveClass(/show/);
    await expect(popup).toHaveAttribute('aria-hidden', 'false');
    await expect(artwork).toBeVisible();
    await expect(artwork).toHaveAttribute('src', /donate_kaito_popup\.webp/);
    await expect(popup).toHaveCSS('pointer-events', 'none');

    await popup.locator('.donate-welcome-close').click();
    await expect(popup).not.toHaveClass(/show/);
    await expect(popup).toHaveAttribute('aria-hidden', 'true');

    await page.reload();
    await expect(popup).not.toHaveClass(/show/);

    await page.evaluate(() => {
      sessionStorage.setItem('stealth_donate_popup_last_shown', String(Date.now() - (5 * 60 * 1000) - 1));
    });
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
