const { test, expect } = require('@playwright/test');

test.describe('Public legal pages', () => {
  test('privacy policy is public, responsive, and describes actual data flows', async ({ page }, testInfo) => {
    await page.goto('/privacy.html');

    await expect(page).toHaveTitle('Chính sách bảo mật | Stealth Reader');
    await expect(page.locator('h1')).toHaveText('Chính sách bảo mật');
    await expect(page.locator('body')).toContainText('openid');
    await expect(page.locator('body')).toContainText('File gốc và toàn bộ nội dung tài liệu không thuộc payload đồng bộ hiện tại');
    await expect(page.locator('a[href="terms.html"]').first()).toBeVisible();
    await expect(page.locator('a[href^="mailto:"]')).toBeVisible();

    await page.screenshot({ path: testInfo.outputPath('privacy-desktop.png'), fullPage: true });
  });

  test('terms page exposes copyright and third-party content rules', async ({ page }) => {
    await page.goto('/terms.html');

    await expect(page).toHaveTitle('Điều khoản sử dụng | Stealth Reader');
    await expect(page.locator('h1')).toHaveText('Điều khoản sử dụng');
    await expect(page.locator('#noi-dung-online')).toContainText('bên thứ ba');
    await expect(page.locator('#lien-he')).toContainText('yêu cầu bản quyền');
    await expect(page.locator('a[href="privacy.html"]').first()).toBeVisible();
  });

  test('portal footer links to both legal pages', async ({ page }) => {
    await page.goto('/index.html?portal=1');
    await page.locator('[data-donate-popup-close]').click({ timeout: 5000 }).catch(() => {});

    const footer = page.locator('#portal-footer');
    await expect(footer.locator('a[href="privacy.html"]')).toHaveText('Chính sách bảo mật');
    await expect(footer.locator('a[href="terms.html"]')).toHaveText('Điều khoản sử dụng');
    await expect(footer).toContainText('Nội dung file gốc được xử lý Local-First');
  });

  test('privacy policy remains usable on a phone-sized viewport', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/privacy.html');

    const mobileLayout = await page.locator('.legal-layout').evaluate((element) => ({
      columns: getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth
    }));
    expect(mobileLayout.columns).toBe(1);
    expect(mobileLayout.documentWidth).toBeLessThanOrEqual(mobileLayout.viewportWidth);
    await expect(page.locator('.legal-toc')).toHaveCSS('position', 'static');
    await expect(page.locator('h1')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('privacy-mobile.png'), fullPage: true });
  });
});
